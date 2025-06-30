const express = require('express');
const { body, param, validationResult } = require('express-validator');
const router = express.Router();

// Import Supabase client
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

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

    // Generate a unique slug for the poll
    const slug = generateSlug();

    // TODO: Implement poll creation in Supabase
    // For now, return a mock response
    const mockPoll = {
      id: Date.now().toString(),
      slug,
      question,
      options: options.map((option, index) => ({
        id: `option_${index}`,
        text: option,
        votes: 0
      })),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    res.status(201).json({
      success: true,
      data: mockPoll
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

    // TODO: Implement poll retrieval from Supabase
    // For now, return a mock response
    const mockPoll = {
      id: '1',
      slug,
      question: 'What is your favorite programming language?',
      options: [
        { id: 'option_0', text: 'JavaScript', votes: 15 },
        { id: 'option_1', text: 'Python', votes: 23 },
        { id: 'option_2', text: 'TypeScript', votes: 8 }
      ],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    res.status(200).json({
      success: true,
      data: mockPoll
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

    // TODO: Implement vote submission to Supabase
    // For now, return a mock response
    res.status(200).json({
      success: true,
      message: 'Vote submitted successfully'
    });
  } catch (error) {
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

    // TODO: Implement results retrieval from Supabase
    // For now, return a mock response
    const mockResults = {
      id: '1',
      slug,
      question: 'What is your favorite programming language?',
      options: [
        { id: 'option_0', text: 'JavaScript', votes: 15 },
        { id: 'option_1', text: 'Python', votes: 23 },
        { id: 'option_2', text: 'TypeScript', votes: 8 }
      ],
      totalVotes: 46,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    res.status(200).json({
      success: true,
      data: mockResults
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Generate a random slug for polls
 * @returns {string} Random slug
 */
function generateSlug() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

module.exports = router;
