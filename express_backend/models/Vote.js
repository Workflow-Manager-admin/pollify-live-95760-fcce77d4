const { v4: uuidv4 } = require('uuid');

/**
 * Vote model representing the structure and validation for vote data
 */
class Vote {
  /**
   * Create a new Vote instance
   * @param {Object} data - Vote data
   * @param {string} data.poll_id - ID of the poll being voted on
   * @param {string} data.option_id - ID of the selected option
   * @param {string} [data.id] - Vote ID (auto-generated if not provided)
   * @param {string} [data.voter_ip] - IP address of the voter (for duplicate prevention)
   * @param {string} [data.user_id] - User ID if authenticated
   * @param {Date} [data.created_at] - Creation timestamp
   */
  constructor(data) {
    this.id = data.id || uuidv4();
    this.poll_id = data.poll_id;
    this.option_id = data.option_id;
    this.voter_ip = data.voter_ip;
    this.user_id = data.user_id;
    this.created_at = data.created_at || new Date();
  }

  /**
   * Validate vote data
   * @returns {Object} Validation result with isValid boolean and errors array
   */
  validate() {
    const errors = [];

    // Validate poll_id
    if (!this.poll_id || typeof this.poll_id !== 'string') {
      errors.push('Poll ID is required and must be a string');
    }

    // Validate option_id
    if (!this.option_id || typeof this.option_id !== 'string') {
      errors.push('Option ID is required and must be a string');
    }

    // Validate voter identification (either IP or user_id required)
    if (!this.voter_ip && !this.user_id) {
      errors.push('Either voter IP or user ID is required for vote tracking');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Convert vote to database format
   * @returns {Object} Vote data formatted for database storage
   */
  toDatabaseFormat() {
    return {
      id: this.id,
      poll_id: this.poll_id,
      option_id: this.option_id,
      voter_ip: this.voter_ip,
      user_id: this.user_id,
      created_at: this.created_at
    };
  }

  /**
   * Create Vote instance from database data
   * @param {Object} dbData - Data from database
   * @returns {Vote} Vote instance
   */
  static fromDatabase(dbData) {
    return new Vote({
      id: dbData.id,
      poll_id: dbData.poll_id,
      option_id: dbData.option_id,
      voter_ip: dbData.voter_ip,
      user_id: dbData.user_id,
      created_at: new Date(dbData.created_at)
    });
  }

  /**
   * Convert to JSON representation
   * @returns {Object} JSON representation of the vote
   */
  toJSON() {
    return {
      id: this.id,
      poll_id: this.poll_id,
      option_id: this.option_id,
      user_id: this.user_id,
      created_at: this.created_at
      // Note: voter_ip is excluded from JSON for privacy
    };
  }
}

module.exports = Vote;
