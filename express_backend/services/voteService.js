const { supabase } = require('../config/supabase');
const Vote = require('../models/Vote');

/**
 * Vote Service - Handles all vote-related database operations
 */
class VoteService {
  /**
   * Submit a vote for a poll option
   * @param {string} pollId - Poll ID
   * @param {string} optionId - Selected option ID
   * @param {string} voterIp - IP address of voter
   * @param {string} [userId] - User ID if authenticated
   * @returns {Promise<Object>} Vote confirmation data
   * @throws {Error} If vote submission fails
   */
  // PUBLIC_INTERFACE
  static async submitVote(pollId, optionId, voterIp, userId = null) {
    /**
     * Submits a vote for a specific poll option
     * @param {string} pollId - The poll ID
     * @param {string} optionId - The selected option ID
     * @param {string} voterIp - Voter's IP address for duplicate prevention
     * @param {string} [userId] - Optional user ID for authenticated users
     * @returns {Promise<Object>} Vote submission result
     */
    try {
      // Create and validate vote instance
      const vote = new Vote({
        poll_id: pollId,
        option_id: optionId,
        voter_ip: voterIp,
        user_id: userId
      });

      const validation = vote.validate();
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      // Check if this IP/user has already voted on this poll
      const existingVote = await this.checkExistingVote(pollId, voterIp, userId);
      if (existingVote) {
        throw new Error('You have already voted on this poll');
      }

      // Verify the poll exists and the option is valid
      const poll = await this.verifyPollAndOption(pollId, optionId);
      if (!poll) {
        throw new Error('Poll not found or option is invalid');
      }

      const voteForDb = vote.toDatabaseFormat();

      // Insert vote into database
      const { data, error } = await supabase
        .from('votes')
        .insert([voteForDb])
        .select()
        .single();

      if (error) {
        console.error('Database error submitting vote:', error);
        throw new Error('Failed to submit vote to database');
      }

      return {
        success: true,
        vote: data,
        message: 'Vote submitted successfully'
      };
    } catch (error) {
      console.error('Error in submitVote:', error);
      throw error;
    }
  }

  /**
   * Check if a voter has already voted on a poll
   * @param {string} pollId - Poll ID
   * @param {string} voterIp - Voter IP address
   * @param {string} [userId] - User ID if authenticated
   * @returns {Promise<Object|null>} Existing vote or null
   * @throws {Error} If database query fails
   */
  // PUBLIC_INTERFACE
  static async checkExistingVote(pollId, voterIp, userId = null) {
    /**
     * Checks if a voter has already submitted a vote for the specified poll
     * @param {string} pollId - The poll ID
     * @param {string} voterIp - Voter's IP address
     * @param {string} [userId] - Optional user ID
     * @returns {Promise<Object|null>} Existing vote data or null
     */
    try {
      let query = supabase
        .from('votes')
        .select('*')
        .eq('poll_id', pollId);

      // Check by user ID if authenticated, otherwise by IP
      if (userId) {
        query = query.eq('user_id', userId);
      } else {
        query = query.eq('voter_ip', voterIp);
      }

      const { data, error } = await query.maybeSingle();

      if (error) {
        console.error('Database error checking existing vote:', error);
        throw new Error('Failed to check existing vote');
      }

      return data;
    } catch (error) {
      console.error('Error in checkExistingVote:', error);
      throw error;
    }
  }

  /**
   * Verify poll exists and option is valid
   * @param {string} pollId - Poll ID
   * @param {string} optionId - Option ID to verify
   * @returns {Promise<Object|null>} Poll data if valid
   * @throws {Error} If verification fails
   */
  // PUBLIC_INTERFACE
  static async verifyPollAndOption(pollId, optionId) {
    /**
     * Verifies that a poll exists and contains the specified option
     * @param {string} pollId - The poll ID
     * @param {string} optionId - The option ID to verify
     * @returns {Promise<Object|null>} Poll data if valid
     */
    try {
      const { data, error } = await supabase
        .from('polls')
        .select('*')
        .eq('id', pollId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Poll not found
        }
        console.error('Database error verifying poll:', error);
        throw new Error('Failed to verify poll');
      }

      // Check if the option exists in the poll
      if (data.options && Array.isArray(data.options)) {
        const optionExists = data.options.some(option => option.id === optionId);
        if (!optionExists) {
          return null; // Option not found in poll
        }
      } else {
        return null; // No options in poll
      }

      return data;
    } catch (error) {
      console.error('Error in verifyPollAndOption:', error);
      throw error;
    }
  }

  /**
   * Get vote counts for a poll
   * @param {string} pollId - Poll ID
   * @returns {Promise<Object>} Vote counts by option
   * @throws {Error} If query fails
   */
  // PUBLIC_INTERFACE
  static async getVoteCounts(pollId) {
    /**
     * Retrieves vote counts for all options in a poll
     * @param {string} pollId - The poll ID
     * @returns {Promise<Object>} Object with option IDs as keys and vote counts as values
     */
    try {
      const { data, error } = await supabase
        .from('votes')
        .select('option_id')
        .eq('poll_id', pollId);

      if (error) {
        console.error('Database error getting vote counts:', error);
        throw new Error('Failed to retrieve vote counts');
      }

      // Count votes by option
      const voteCounts = {};
      if (data && Array.isArray(data)) {
        data.forEach(vote => {
          voteCounts[vote.option_id] = (voteCounts[vote.option_id] || 0) + 1;
        });
      }

      return voteCounts;
    } catch (error) {
      console.error('Error in getVoteCounts:', error);
      throw error;
    }
  }

  /**
   * Get votes for a poll with details
   * @param {string} pollId - Poll ID
   * @param {Object} options - Query options
   * @param {number} [options.limit] - Limit number of results
   * @param {number} [options.offset] - Offset for pagination
   * @returns {Promise<Array>} Array of vote records
   * @throws {Error} If query fails
   */
  // PUBLIC_INTERFACE
  static async getVotesForPoll(pollId, options = {}) {
    /**
     * Retrieves detailed vote records for a poll
     * @param {string} pollId - The poll ID
     * @param {Object} options - Query options for pagination
     * @returns {Promise<Array>} Array of vote records (IP addresses excluded for privacy)
     */
    try {
      const { limit = 100, offset = 0 } = options;

      let query = supabase
        .from('votes')
        .select('id, option_id, user_id, created_at')
        .eq('poll_id', pollId)
        .order('created_at', { ascending: false });

      if (limit) {
        query = query.range(offset, offset + limit - 1);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Database error getting votes for poll:', error);
        throw new Error('Failed to retrieve votes for poll');
      }

      return data || [];
    } catch (error) {
      console.error('Error in getVotesForPoll:', error);
      throw error;
    }
  }

  /**
   * Delete a vote (admin function)
   * @param {string} voteId - Vote ID
   * @returns {Promise<boolean>} Success status
   * @throws {Error} If deletion fails
   */
  // PUBLIC_INTERFACE
  static async deleteVote(voteId) {
    /**
     * Deletes a specific vote (admin function)
     * @param {string} voteId - The vote ID to delete
     * @returns {Promise<boolean>} Deletion success status
     */
    try {
      if (!voteId || typeof voteId !== 'string') {
        throw new Error('Valid vote ID is required');
      }

      const { error } = await supabase
        .from('votes')
        .delete()
        .eq('id', voteId);

      if (error) {
        console.error('Database error deleting vote:', error);
        throw new Error('Failed to delete vote');
      }

      return true;
    } catch (error) {
      console.error('Error in deleteVote:', error);
      throw error;
    }
  }

  /**
   * Get total vote count for a poll
   * @param {string} pollId - Poll ID
   * @returns {Promise<number>} Total number of votes
   * @throws {Error} If query fails
   */
  // PUBLIC_INTERFACE
  static async getTotalVoteCount(pollId) {
    /**
     * Gets the total number of votes for a poll
     * @param {string} pollId - The poll ID
     * @returns {Promise<number>} Total vote count
     */
    try {
      const { count, error } = await supabase
        .from('votes')
        .select('*', { count: 'exact' })
        .eq('poll_id', pollId);

      if (error) {
        console.error('Database error getting total vote count:', error);
        throw new Error('Failed to get total vote count');
      }

      return count || 0;
    } catch (error) {
      console.error('Error in getTotalVoteCount:', error);
      throw error;
    }
  }
}

module.exports = VoteService;
