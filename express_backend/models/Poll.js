const { v4: uuidv4 } = require('uuid');

/**
 * Poll model representing the structure and validation for poll data
 */
class Poll {
  /**
   * Create a new Poll instance
   * @param {Object} data - Poll data
   * @param {string} data.question - The poll question
   * @param {Array<string>} data.options - Array of poll options
   * @param {string} [data.id] - Poll ID (auto-generated if not provided)
   * @param {string} [data.slug] - Poll slug (auto-generated if not provided)
   * @param {Date} [data.created_at] - Creation timestamp
   * @param {Date} [data.updated_at] - Update timestamp
   */
  constructor(data) {
    this.id = data.id || uuidv4();
    this.slug = data.slug || this.generateSlug();
    this.question = data.question;
    this.options = data.options || [];
    this.created_at = data.created_at || new Date();
    this.updated_at = data.updated_at || new Date();
  }

  /**
   * Generate a random slug for the poll
   * @returns {string} Random 8-character slug
   */
  generateSlug() {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Validate poll data
   * @returns {Object} Validation result with isValid boolean and errors array
   */
  validate() {
    const errors = [];

    // Validate question
    if (!this.question || typeof this.question !== 'string') {
      errors.push('Question is required and must be a string');
    } else if (this.question.length < 5 || this.question.length > 500) {
      errors.push('Question must be between 5 and 500 characters');
    }

    // Validate options
    if (!Array.isArray(this.options)) {
      errors.push('Options must be an array');
    } else if (this.options.length < 2 || this.options.length > 6) {
      errors.push('Must provide between 2 and 6 options');
    } else {
      this.options.forEach((option, index) => {
        if (!option || typeof option !== 'string') {
          errors.push(`Option ${index + 1} must be a non-empty string`);
        } else if (option.length < 1 || option.length > 200) {
          errors.push(`Option ${index + 1} must be between 1 and 200 characters`);
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Convert poll to database format
   * @returns {Object} Poll data formatted for database storage
   */
  toDatabaseFormat() {
    return {
      id: this.id,
      slug: this.slug,
      question: this.question,
      options: this.options.map((option, index) => ({
        id: `option_${index}`,
        text: option,
        votes: 0
      })),
      created_at: this.created_at,
      updated_at: this.updated_at
    };
  }

  /**
   * Create Poll instance from database data
   * @param {Object} dbData - Data from database
   * @returns {Poll} Poll instance
   */
  static fromDatabase(dbData) {
    return new Poll({
      id: dbData.id,
      slug: dbData.slug,
      question: dbData.question,
      options: dbData.options ? dbData.options.map(opt => opt.text) : [],
      created_at: new Date(dbData.created_at),
      updated_at: new Date(dbData.updated_at)
    });
  }

  /**
   * Convert to JSON representation
   * @returns {Object} JSON representation of the poll
   */
  toJSON() {
    return {
      id: this.id,
      slug: this.slug,
      question: this.question,
      options: this.options.map((option, index) => ({
        id: `option_${index}`,
        text: option,
        votes: 0
      })),
      created_at: this.created_at,
      updated_at: this.updated_at
    };
  }
}

module.exports = Poll;
