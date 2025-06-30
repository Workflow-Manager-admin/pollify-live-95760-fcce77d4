# Supabase Database Setup for Pollify

This document outlines the database schema and setup required for the Pollify application.

## Database Schema

### Tables Required

#### 1. polls
```sql
CREATE TABLE polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(8) UNIQUE NOT NULL,
  question TEXT NOT NULL CHECK (length(question) >= 5 AND length(question) <= 500),
  options JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on slug for fast lookups
CREATE INDEX idx_polls_slug ON polls(slug);

-- Create index on created_at for sorting
CREATE INDEX idx_polls_created_at ON polls(created_at DESC);
```

#### 2. votes
```sql
CREATE TABLE votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  option_id TEXT NOT NULL,
  voter_ip INET,
  user_id UUID, -- For future authenticated users
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_votes_poll_id ON votes(poll_id);
CREATE INDEX idx_votes_option_id ON votes(option_id);
CREATE INDEX idx_votes_voter_ip ON votes(voter_ip);
CREATE INDEX idx_votes_user_id ON votes(user_id);

-- Unique constraint to prevent duplicate votes from same IP per poll
CREATE UNIQUE INDEX idx_votes_unique_ip_poll ON votes(poll_id, voter_ip) WHERE user_id IS NULL;

-- Unique constraint to prevent duplicate votes from same user per poll (for future auth)
CREATE UNIQUE INDEX idx_votes_unique_user_poll ON votes(poll_id, user_id) WHERE user_id IS NOT NULL;
```

### Data Types and Constraints

#### polls.options JSON Structure
```json
[
  {
    "id": "option_0",
    "text": "Option 1 text",
    "votes": 0
  },
  {
    "id": "option_1", 
    "text": "Option 2 text",
    "votes": 0
  }
]
```

### Row Level Security (RLS)

Enable RLS on both tables and create policies for public access:

```sql
-- Enable RLS
ALTER TABLE polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

-- Allow public read access to polls
CREATE POLICY "Public polls are viewable by everyone" ON polls
  FOR SELECT USING (true);

-- Allow public creation of polls
CREATE POLICY "Anyone can create polls" ON polls
  FOR INSERT WITH CHECK (true);

-- Allow public read access to votes (for counting)
CREATE POLICY "Public votes are viewable by everyone" ON votes
  FOR SELECT USING (true);

-- Allow public creation of votes
CREATE POLICY "Anyone can create votes" ON votes
  FOR INSERT WITH CHECK (true);
```

### Functions and Triggers

#### Update timestamp trigger
```sql
-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for polls table
CREATE TRIGGER update_polls_updated_at BEFORE UPDATE ON polls
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

#### Real-time subscriptions

Enable real-time for live updates:
```sql
-- Enable real-time for polls table
ALTER publication supabase_realtime ADD TABLE polls;

-- Enable real-time for votes table  
ALTER publication supabase_realtime ADD TABLE votes;
```

## Environment Variables Required

The following environment variables must be configured:

- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_KEY`: Your Supabase anon public key
- `SUPABASE_DB_URL`: PostgreSQL connection string (for direct DB access if needed)

## API Integration

The Express backend services expect the following database structure:

1. **PollService** interacts with the `polls` table
2. **VoteService** interacts with the `votes` table
3. Both services use the Supabase JavaScript client for database operations

## Security Considerations

1. **Rate Limiting**: Implemented at the API level to prevent abuse
2. **IP-based Vote Limiting**: Prevents multiple votes from same IP address
3. **Data Validation**: All inputs are validated before database insertion
4. **SQL Injection Prevention**: Using Supabase client prevents SQL injection
5. **Row Level Security**: Database-level security policies control data access

## Monitoring and Analytics

Consider adding these tables for analytics:

```sql
-- Optional: Poll analytics
CREATE TABLE poll_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- 'view', 'share', 'complete'
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Migration Commands

Run these commands in the Supabase SQL editor to set up the database:

1. Create the tables with the SQL commands above
2. Set up RLS policies
3. Create indexes for performance
4. Enable real-time subscriptions
5. Test the connection from your Express backend

## Testing the Setup

Use the backend health check and Supabase connection test:

```bash
# Test server health
curl http://localhost:3001/api/health

# The server will test Supabase connection on startup
npm start
```
