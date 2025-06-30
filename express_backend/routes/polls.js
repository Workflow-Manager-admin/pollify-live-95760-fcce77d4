const express = require('express');
const { body, param, validationResult } = require('express-validator');
const router = express.Router();

// Import services
const PollService = require('../services/pollService');
const VoteService = require('../services/voteService');

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
    .isLength({ min: 5, max: 500 })
    .withMessage('Question must be between 5 and 500 characters'),
  body('options')
    .isArray({ min: 2, max: 6 })
    .withMessage('Must provide between 2 and 6 options'),
  body('options.*')
    .isLength({ min: 1, max: 200 })
    .withMessage('Each option must be between 1 and 200 characters')
], async (req, res, next) => {
  /**
   * Create a new poll with question and options
   * @param {string} question - The poll question
   * @param {string[]} options - Array of poll options
   * @returns {Object} Created poll data
   */
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { question, options } = req.body;

    // Create poll using PollService
    const pollData = await PollService.createPoll({ question, options });

    res.status(201).json({
      success: true,
      data: pollData
    });
  } catch (error) {
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
  param('slug').isLength({ min: 1 }).withMessage('Slug is required')
], async (req, res, next) => {
  /**
   * Get a poll by its slug
   * @param {string} slug - The poll slug
   * @returns {Object} Poll data
   */
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { slug } = req.params;

    // Get poll using PollService
    const pollData = await PollService.getPollBySlug(slug);

    if (!pollData) {
      return res.status(404).json({
        success: false,
        message: 'Poll not found'
      });
    }

    res.status(200).json({
      success: true,
      data: pollData
    });
  } catch (error) {
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
  param('slug').isLength({ min: 1 }).withMessage('Slug is required'),
  body('optionId').isLength({ min: 1 }).withMessage('Option ID is required')
], async (req, res, next) => {
  /**
   * Submit a vote for a poll option
   * @param {string} slug - The poll slug
   * @param {string} optionId - The selected option ID
   * @returns {Object} Vote confirmation
   */
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { slug } = req.params;
    const { optionId } = req.body;

    // Get poll by slug first
    const poll = await PollService.getPollBySlug(slug);
    if (!poll) {
      return res.status(404).json({
        success: false,
        message: 'Poll not found'
      });
    }

    // Get voter IP address
    const voterIp = req.ip || req.connection.remoteAddress || req.socket.remoteAddress || 
                   (req.connection.socket ? req.connection.socket.remoteAddress : null);

    // Submit vote using VoteService
    const voteResult = await VoteService.submitVote(poll.id, optionId, voterIp);

    res.status(200).json(voteResult);
  } catch (error) {
    if (error.message.includes('already voted')) {
      return res.status(409).json({
        success: false,
        message: error.message
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
  param('slug').isLength({ min: 1 }).withMessage('Slug is required')
], async (req, res, next) => {
  /**
   * Get poll results
   * @param {string} slug - The poll slug
   * @returns {Object} Poll results data
   */
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { slug } = req.params;

    // Get poll results using PollService
    const resultsData = await PollService.getPollResults(slug);

    if (!resultsData) {
      return res.status(404).json({
        success: false,
        message: 'Poll not found'
      });
    }

    res.status(200).json({
      success: true,
      data: resultsData
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
