const { supabase } = require('../config/supabase');
const Poll = require('../models/Poll');

/**
 * Poll Service - Handles all poll-related database operations
 */
class PollService {
  /**
   * Create a new poll in the database
   * @param {Object} pollData - Poll data
   * @param {string} pollData.question - The poll question
   * @param {Array<string>} pollData.options - Array of poll options
   * @returns {Promise<Object>} Created poll data
   * @throws {Error} If poll creation fails
   */
  // PUBLIC_INTERFACE
  static async createPoll(pollData) {
    /**
     * Creates a new poll with question and options
     * @param {Object} pollData - Poll creation data
     * @returns {Promise<Object>} Created poll with ID and slug
     */
    try {
      // Create and validate poll instance
      const poll = new Poll(pollData);
      const validation = poll.validate();
      
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      const pollForDb = poll.toDatabaseFormat();

      // Insert poll into database
      const { data, error } = await supabase
        .from('polls')
        .insert([{
          id: pollForDb.id,
          slug: pollForDb.slug,
          question: pollForDb.question,
          options: pollForDb.options,
          created_at: pollForDb.created_at,
          updated_at: pollForDb.updated_at
        }])
        .select()
        .single();

      if (error) {
        console.error('Database error creating poll:', error);
        throw new Error('Failed to create poll in database');
      }

      return data;
    } catch (error) {
      console.error('Error in createPoll:', error);
      throw error;
    }
  }

  /**
   * Get a poll by its slug
   * @param {string} slug - Poll slug
   * @returns {Promise<Object|null>} Poll data or null if not found
   * @throws {Error} If database query fails
   */
  // PUBLIC_INTERFACE
  static async getPollBySlug(slug) {
    /**
     * Retrieves a poll by its unique slug identifier
     * @param {string} slug - The poll slug
     * @returns {Promise<Object|null>} Poll data with current vote counts
     */
    try {
      if (!slug || typeof slug !== 'string') {
        throw new Error('Valid slug is required');
      }

      const { data, error } = await supabase
        .from('polls')
        .select(`
          *,
          votes (
            option_id,
            created_at
          )
        `)
        .eq('slug', slug)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows found
          return null;
        }
        console.error('Database error getting poll:', error);
        throw new Error('Failed to retrieve poll from database');
      }

      // Calculate vote counts for each option
      const voteCounts = {};
      if (data.votes && Array.isArray(data.votes)) {
        data.votes.forEach(vote => {
          voteCounts[vote.option_id] = (voteCounts[vote.option_id] || 0) + 1;
        });
      }

      // Update options with vote counts
      if (data.options && Array.isArray(data.options)) {
        data.options = data.options.map(option => ({
          ...option,
          votes: voteCounts[option.id] || 0
        }));
      }

      // Calculate total votes
      data.totalVotes = Object.values(voteCounts).reduce((sum, count) => sum + count, 0);

      // Remove votes array from response (we've processed it into vote counts)
      delete data.votes;

      return data;
    } catch (error) {
      console.error('Error in getPollBySlug:', error);
      throw error;
    }
  }

  /**
   * Get poll by ID
   * @param {string} pollId - Poll ID
   * @returns {Promise<Object|null>} Poll data or null if not found
   * @throws {Error} If database query fails
   */
  // PUBLIC_INTERFACE
  static async getPollById(pollId) {
    /**
     * Retrieves a poll by its ID
     * @param {string} pollId - The poll ID
     * @returns {Promise<Object|null>} Poll data
     */
    try {
      if (!pollId || typeof pollId !== 'string') {
        throw new Error('Valid poll ID is required');
      }

      const { data, error } = await supabase
        .from('polls')
        .select('*')
        .eq('id', pollId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        console.error('Database error getting poll by ID:', error);
        throw new Error('Failed to retrieve poll from database');
      }

      return data;
    } catch (error) {
      console.error('Error in getPollById:', error);
      throw error;
    }
  }

  /**
   * Get poll results with vote counts
   * @param {string} slug - Poll slug
   * @returns {Promise<Object|null>} Poll results or null if not found
   * @throws {Error} If database query fails
   */
  // PUBLIC_INTERFACE
  static async getPollResults(slug) {
    /**
     * Retrieves poll results with detailed vote statistics
     * @param {string} slug - The poll slug
     * @returns {Promise<Object|null>} Poll results with vote counts and percentages
     */
    try {
      // Use the same logic as getPollBySlug since it already calculates vote counts
      return await this.getPollBySlug(slug);
    } catch (error) {
      console.error('Error in getPollResults:', error);
      throw error;
    }
  }

  /**
   * Update poll (limited fields)
   * @param {string} slug - Poll slug
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated poll data
   * @throws {Error} If update fails
   */
  // PUBLIC_INTERFACE
  static async updatePoll(slug, updateData) {
    /**
     * Updates specific fields of a poll
     * @param {string} slug - The poll slug
     * @param {Object} updateData - Fields to update
     * @returns {Promise<Object>} Updated poll data
     */
    try {
      if (!slug || typeof slug !== 'string') {
        throw new Error('Valid slug is required');
      }

      // Only allow updating certain fields
      const allowedFields = ['question', 'updated_at'];
      const filteredUpdate = {};
      
      Object.keys(updateData).forEach(key => {
        if (allowedFields.includes(key)) {
          filteredUpdate[key] = updateData[key];
        }
      });

      filteredUpdate.updated_at = new Date();

      const { data, error } = await supabase
        .from('polls')
        .update(filteredUpdate)
        .eq('slug', slug)
        .select()
        .single();

      if (error) {
        console.error('Database error updating poll:', error);
        throw new Error('Failed to update poll in database');
      }

      return data;
    } catch (error) {
      console.error('Error in updatePoll:', error);
      throw error;
    }
  }

  /**
   * Delete poll (admin function)
   * @param {string} slug - Poll slug
   * @returns {Promise<boolean>} Success status
   * @throws {Error} If deletion fails
   */
  // PUBLIC_INTERFACE
  static async deletePoll(slug) {
    /**
     * Deletes a poll and all associated votes
     * @param {string} slug - The poll slug
     * @returns {Promise<boolean>} Deletion success status
     */
    try {
      if (!slug || typeof slug !== 'string') {
        throw new Error('Valid slug is required');
      }

      // First get the poll ID
      const poll = await this.getPollBySlug(slug);
      if (!poll) {
        throw new Error('Poll not found');
      }

      // Delete associated votes first
      const { error: votesError } = await supabase
        .from('votes')
        .delete()
        .eq('poll_id', poll.id);

      if (votesError) {
        console.error('Error deleting votes:', votesError);
        throw new Error('Failed to delete associated votes');
      }

      // Delete the poll
      const { error: pollError } = await supabase
        .from('polls')
        .delete()
        .eq('slug', slug);

      if (pollError) {
        console.error('Error deleting poll:', pollError);
        throw new Error('Failed to delete poll');
      }

      return true;
    } catch (error) {
      console.error('Error in deletePoll:', error);
      throw error;
    }
  }

  /**
   * List recent polls (for admin or analytics)
   * @param {number} limit - Number of polls to return
   * @param {number} offset - Offset for pagination
   * @returns {Promise<Array>} Array of polls
   * @throws {Error} If query fails
   */
  // PUBLIC_INTERFACE
  static async listPolls(limit = 10, offset = 0) {
    /**
     * Retrieves a list of recent polls
     * @param {number} limit - Maximum number of polls to return
     * @param {number} offset - Number of polls to skip for pagination
     * @returns {Promise<Array>} Array of poll objects
     */
    try {
      const { data, error } = await supabase
        .from('polls')
        .select('*')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('Database error listing polls:', error);
        throw new Error('Failed to retrieve polls from database');
      }

      return data || [];
    } catch (error) {
      console.error('Error in listPolls:', error);
      throw error;
    }
  }
}

module.exports = PollService;
