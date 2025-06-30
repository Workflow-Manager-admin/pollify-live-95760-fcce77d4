# Pollify Express Backend

Express.js REST API backend for the Pollify real-time polling application.

## Features

- RESTful API endpoints for poll management
- Real-time capabilities with Supabase integration
- Comprehensive API documentation with Swagger/OpenAPI
- Input validation and sanitization
- Rate limiting and security middleware
- Error handling and logging
- CORS support for frontend integration

## API Endpoints

### Health Check
- `GET /api/health` - Server health status

### Polls
- `POST /api/polls` - Create a new poll
- `GET /api/polls/:slug` - Get poll details
- `POST /api/polls/:slug/vote` - Submit a vote
- `GET /api/polls/:slug/results` - Get poll results

## Quick Start

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
```bash
cp .env.example .env
# Edit .env with your Supabase credentials
```

3. Start the development server:
```bash
npm run dev
```

4. View API documentation:
   - Swagger UI: http://localhost:3001/docs
   - OpenAPI JSON: http://localhost:3001/openapi.json

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NODE_ENV` | Environment mode | No |
| `PORT` | Server port | No |
| `SUPABASE_URL` | Supabase project URL | Yes |
| `SUPABASE_KEY` | Supabase anon key | Yes |
| `FRONTEND_URL` | Frontend application URL | No |

## Project Structure

```
express_backend/
├── config/             # Configuration files
│   └── supabase.js    # Supabase client setup
├── middleware/         # Custom middleware
│   └── errorHandler.js # Global error handling
├── routes/            # API route definitions
│   ├── health.js      # Health check routes
│   └── polls.js       # Poll management routes
├── server.js          # Main application entry point
├── package.json       # Dependencies and scripts
└── README.md          # This file
```

## Development

- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm test` - Run tests

## API Documentation

The API is fully documented using OpenAPI 3.0 specification. Access the interactive documentation at `/docs` when the server is running.

## Security Features

- Helmet.js for security headers
- CORS configuration
- Rate limiting
- Input validation
- Error sanitization

## Database Integration

This backend integrates with Supabase for:
- Data persistence
- Real-time subscriptions
- User authentication (optional)
- Database management

## Error Handling

The API uses consistent error response format:
```json
{
  "success": false,
  "message": "Error description",
  "errors": [] // Validation errors if applicable
}
```

## Contributing

1. Follow the existing code style
2. Add appropriate documentation
3. Include error handling
4. Update API documentation
5. Add tests for new features
