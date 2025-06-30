const express = require('express');
const { body, param, validationResult } = require('express-validator');
const router = express.Router();

// Import services
const PollService = require('../services/pollService');
const VoteService = require('../services/voteService');

// Import Supabase for health checks
const { testConnection } = require('../config/supabase');
=======

/**
 * @swagger
 * components:
 *   schemas:
 *     Poll:
 *       type: object
 *       required:
 *         - question
 *         - options
 *       properties:
 *         id:
 *           type: string
 *           description: Auto-generated poll ID
 *         slug:
 *           type: string
 *           description: URL-friendly poll identifier
 *         question:
 *           type: string
 *           description: The poll question
 *         options:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               id:
 *                 type: string
 *               text:
 *                 type: string
 *               votes:
 *                 type: integer
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *     PollCreate:
 *       type: object
 *       required:
 *         - question
 *         - options
 *       properties:
 *         question:
 *           type: string
 *           minLength: 5
 *           maxLength: 500
 *         options:
 *           type: array
 *           minItems: 2
 *           maxItems: 6
 *           items:
 *             type: string
 *             minLength: 1
 *             maxLength: 200
 *     Vote:
 *       type: object
 *       required:
 *         - optionId
 *       properties:
 *         optionId:
 *           type: string
 *           description: ID of the selected option
 */

/**
 * @swagger
 * /api/polls:
 *   post:
 *     summary: Create a new poll
 *     description: Creates a new poll with question and options
 *     tags: [Polls]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PollCreate'
 *     responses:
 *       201:
 *         description: Poll created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Poll'
 *       400:
 *         description: Invalid input data
 *       500:
 *         description: Internal server error
 */

// PUBLIC_INTERFACE
router.post('/', [
  body('question')
    .trim()
    .escape()
    .isLength({ min: 5, max: 500 })
    .withMessage('Question must be between 5 and 500 characters')
    .matches(/^[a-zA-Z0-9\s\.\?\!\,\-\'\";:]+$/)
    .withMessage('Question contains invalid characters'),
  body('options')
    .isArray({ min: 2, max: 6 })
    .withMessage('Must provide between 2 and 6 options')
    .custom((options) => {
      // Check for duplicate options
      const uniqueOptions = [...new Set(options.map(opt => opt.toLowerCase().trim()))];
      if (uniqueOptions.length !== options.length) {
        throw new Error('Duplicate options are not allowed');
      }
      return true;
    }),
  body('options.*')
    .trim()
    .escape()
    .isLength({ min: 1, max: 200 })
    .withMessage('Each option must be between 1 and 200 characters')
    .matches(/^[a-zA-Z0-9\s\.\?\!\,\-\'\";:]+$/)
    .withMessage('Option contains invalid characters')
], async (req, res, next) => {
  /**
   * Create a new poll with question and options
   * @param {string} question - The poll question
   * @param {string[]} options - Array of poll options
   * @returns {Object} Created poll data
   */
  try {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
        timestamp: new Date().toISOString()
      });
    }

    const { question, options } = req.body;

    // Additional server-side validation
    if (!question || !options) {
      return res.status(400).json({
        success: false,
        message: 'Question and options are required',
        timestamp: new Date().toISOString()
      });
    }

    // Test database connection before proceeding
    const dbHealthy = await testConnection();
    if (!dbHealthy) {
      return res.status(503).json({
        success: false,
        message: 'Database service unavailable. Please try again later.',
        timestamp: new Date().toISOString()
      });
    }

    // Create poll using PollService with enhanced error handling
    const pollData = await PollService.createPoll({ question, options });

    // Validate response data
    if (!pollData || !pollData.slug || !pollData.id) {
      throw new Error('Invalid poll data returned from database');
    }

    res.status(201).json({
      success: true,
      data: {
        id: pollData.id,
        slug: pollData.slug,
        question: pollData.question,
        options: pollData.options,
        totalVotes: 0,
        created_at: pollData.created_at,
        updated_at: pollData.updated_at
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    // Enhanced error logging
    console.error('Poll creation error:', {
      error: error.message,
      stack: error.stack,
      body: req.body,
      timestamp: new Date().toISOString()
    });
    next(error);
  }
});

/**
 * @swagger
 * /api/polls/{slug}:
 *   get:
 *     summary: Get poll by slug
 *     description: Retrieve a specific poll by its slug
 *     tags: [Polls]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Poll slug
 *     responses:
 *       200:
 *         description: Poll retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Poll'
 *       404:
 *         description: Poll not found
 *       500:
 *         description: Internal server error
 */

// PUBLIC_INTERFACE
router.get('/:slug', [
  param('slug')
    .trim()
    .isLength({ min: 8, max: 8 })
    .withMessage('Slug must be exactly 8 characters')
    .matches(/^[a-zA-Z0-9]+$/)
    .withMessage('Slug must contain only alphanumeric characters')
], async (req, res, next) => {
  /**
   * Get a poll by its slug
   * @param {string} slug - The poll slug
   * @returns {Object} Poll data
   */
  try {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid poll slug format',
        errors: errors.array(),
        timestamp: new Date().toISOString()
      });
    }

    const { slug } = req.params;

    // Test database connection
    const dbHealthy = await testConnection();
    if (!dbHealthy) {
      return res.status(503).json({
        success: false,
        message: 'Database service unavailable',
        timestamp: new Date().toISOString()
      });
    }

    // Get poll using PollService
    const pollData = await PollService.getPollBySlug(slug);

    if (!pollData) {
      return res.status(404).json({
        success: false,
        message: 'Poll not found. Please check the poll URL and try again.',
        timestamp: new Date().toISOString()
      });
    }

    // Validate poll data structure
    if (!pollData.options || !Array.isArray(pollData.options)) {
      throw new Error('Invalid poll data structure');
    }

    // Calculate additional metrics
    const totalVotes = pollData.totalVotes || 0;
    const optionsWithPercentage = pollData.options.map(option => ({
      ...option,
      percentage: totalVotes > 0 ? Math.round((option.votes / totalVotes) * 100) : 0
    }));

    res.status(200).json({
      success: true,
      data: {
        ...pollData,
        options: optionsWithPercentage,
        totalVotes
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Poll retrieval error:', {
      error: error.message,
      slug: req.params.slug,
      timestamp: new Date().toISOString()
    });
    next(error);
  }
});

/**
 * @swagger
 * /api/polls/{slug}/vote:
 *   post:
 *     summary: Vote on a poll
 *     description: Submit a vote for a specific option in a poll
 *     tags: [Polls]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Poll slug
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Vote'
 *     responses:
 *       200:
 *         description: Vote submitted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid vote data
 *       404:
 *         description: Poll not found
 *       409:
 *         description: Already voted
 *       500:
 *         description: Internal server error
 */

// PUBLIC_INTERFACE
router.post('/:slug/vote', [
  param('slug')
    .trim()
    .isLength({ min: 8, max: 8 })
    .withMessage('Slug must be exactly 8 characters')
    .matches(/^[a-zA-Z0-9]+$/)
    .withMessage('Slug must contain only alphanumeric characters'),
  body('optionId')
    .trim()
    .matches(/^option_[0-5]$/)
    .withMessage('Option ID must be in format option_0 to option_5')
], async (req, res, next) => {
  /**
   * Submit a vote for a poll option
   * @param {string} slug - The poll slug
   * @param {string} optionId - The selected option ID
   * @returns {Object} Vote confirmation
   */
  try {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid vote data',
        errors: errors.array(),
        timestamp: new Date().toISOString()
      });
    }

    const { slug } = req.params;
    const { optionId } = req.body;

    // Test database connection
    const dbHealthy = await testConnection();
    if (!dbHealthy) {
      return res.status(503).json({
        success: false,
        message: 'Database service unavailable',
        timestamp: new Date().toISOString()
      });
    }

    // Get poll by slug first with enhanced validation
    const poll = await PollService.getPollBySlug(slug);
    if (!poll) {
      return res.status(404).json({
        success: false,
        message: 'Poll not found. Please check the poll URL.',
        timestamp: new Date().toISOString()
      });
    }

    // Validate option exists in poll
    const optionExists = poll.options && poll.options.some(opt => opt.id === optionId);
    if (!optionExists) {
      return res.status(400).json({
        success: false,
        message: 'Invalid option selected. Please refresh the page and try again.',
        timestamp: new Date().toISOString()
      });
    }

    // Get voter IP address with multiple fallbacks
    const voterIp = req.ip || 
                   req.connection?.remoteAddress || 
                   req.socket?.remoteAddress || 
                   req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
                   req.headers['x-real-ip'] ||
                   '127.0.0.1';

    // Validate IP address
    if (!voterIp || voterIp === '::1') {
      console.warn('Unable to determine voter IP, using localhost');
    }

    // Submit vote using VoteService with enhanced error handling
    const voteResult = await VoteService.submitVote(poll.id, optionId, voterIp);

    // Validate vote result
    if (!voteResult || !voteResult.success) {
      throw new Error('Vote submission failed');
    }

    res.status(200).json({
      ...voteResult,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Vote submission error:', {
      error: error.message,
      slug: req.params.slug,
      optionId: req.body.optionId,
      timestamp: new Date().toISOString()
    });

    if (error.message.includes('already voted')) {
      return res.status(409).json({
        success: false,
        message: 'You have already voted on this poll. Each user can only vote once.',
        timestamp: new Date().toISOString()
      });
    }
    
    if (error.message.includes('Poll not found') || error.message.includes('option is invalid')) {
      return res.status(400).json({
        success: false,
        message: 'Invalid poll or option. Please refresh the page and try again.',
        timestamp: new Date().toISOString()
      });
    }
    
    next(error);
  }
});

/**
 * @swagger
 * /api/polls/{slug}/results:
 *   get:
 *     summary: Get poll results
 *     description: Retrieve current results for a poll
 *     tags: [Polls]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Poll slug
 *     responses:
 *       200:
 *         description: Poll results retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Poll'
 *       404:
 *         description: Poll not found
 *       500:
 *         description: Internal server error
 */

// PUBLIC_INTERFACE
router.get('/:slug/results', [
  param('slug')
    .trim()
    .isLength({ min: 8, max: 8 })
    .withMessage('Slug must be exactly 8 characters')
    .matches(/^[a-zA-Z0-9]+$/)
    .withMessage('Slug must contain only alphanumeric characters')
], async (req, res, next) => {
  /**
   * Get poll results
   * @param {string} slug - The poll slug
   * @returns {Object} Poll results data
   */
  try {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid poll slug format',
        errors: errors.array(),
        timestamp: new Date().toISOString()
      });
    }

    const { slug } = req.params;

    // Test database connection
    const dbHealthy = await testConnection();
    if (!dbHealthy) {
      return res.status(503).json({
        success: false,
        message: 'Database service unavailable',
        timestamp: new Date().toISOString()
      });
    }

    // Get poll results using PollService
    const resultsData = await PollService.getPollResults(slug);

    if (!resultsData) {
      return res.status(404).json({
        success: false,
        message: 'Poll not found. Please check the poll URL.',
        timestamp: new Date().toISOString()
      });
    }

    // Validate results data structure
    if (!resultsData.options || !Array.isArray(resultsData.options)) {
      throw new Error('Invalid poll results data structure');
    }

    // Calculate comprehensive statistics
    const totalVotes = resultsData.totalVotes || 0;
    const optionsWithStats = resultsData.options.map(option => ({
      ...option,
      percentage: totalVotes > 0 ? Math.round((option.votes / totalVotes) * 100) : 0,
      isLeading: totalVotes > 0 && option.votes === Math.max(...resultsData.options.map(o => o.votes))
    }));

    // Sort options by vote count (descending)
    const sortedOptions = [...optionsWithStats].sort((a, b) => b.votes - a.votes);

    // Set cache headers for better performance
    res.set({
      'Cache-Control': 'public, max-age=30', // Cache for 30 seconds
      'ETag': `"${resultsData.updated_at || resultsData.created_at}"`
    });

    res.status(200).json({
      success: true,
      data: {
        ...resultsData,
        options: sortedOptions,
        totalVotes,
        statistics: {
          totalVotes,
          optionCount: resultsData.options.length,
          leadingOption: sortedOptions[0]?.text || null,
          lastUpdated: resultsData.updated_at || resultsData.created_at
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Poll results error:', {
      error: error.message,
      slug: req.params.slug,
      timestamp: new Date().toISOString()
    });
    next(error);
  }
});

module.exports = router;
