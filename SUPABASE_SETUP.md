# Supabase Setup Guide

This guide will help you set up Supabase as the database for your App Store Tracker.

## Prerequisites

- Supabase account and project created
- Project ID: `enciynpyahdmixbjzwka`

## Setup Steps

### 1. Environment Variables

The environment variables are already configured in `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://enciynpyahdmixbjzwka.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVuY2l5bnB5YWhkbWl4Ymp6d2thIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyMzg5NDksImV4cCI6MjA3MTgxNDk0OX0.N0OUxm2rTmn6Q2Fyuiwb9naiGnSjUyoZBvikbu_-Eto
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVuY2l5bnB5YWhkbWl4Ymp6d2thIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjIzODk0OSwiZXhwIjoyMDcxODE0OTQ5fQ.Mc1NLvGOce5fh_lbkuqIIoysXAcA4Ay95Hn3t2WZSc8
```

### 2. Database Schema Setup

You have two options to set up the database schema:

#### Option A: Using Supabase SQL Editor (Recommended)

1. Go to your Supabase dashboard: https://supabase.com/dashboard/project/enciynpyahdmixbjzwka
2. Navigate to the SQL Editor
3. Copy and paste the contents of `scripts/setup-supabase.sql`
4. Run the SQL script

#### Option B: Using the Setup Script

```bash
npm install dotenv
npm run setup-db
```

### 3. Database Tables Created

The setup will create these tables:

- **stores**: Store information (name, URL, type, check intervals)
- **apps**: Discovered applications
- **monitoring_sessions**: Monitoring history and statistics

### 4. Sample Data

The setup includes sample data:
- Sample Play Store Developer
- Sample App Store Developer

### 5. Row Level Security (RLS)

RLS is enabled with policies that allow all operations. For production, you may want to implement more restrictive policies.

## Testing the Setup

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Visit http://localhost:3000
3. You should see the sample stores in the dashboard
4. Try adding a new store to test the functionality

## Vercel Deployment

For Vercel deployment, add these environment variables in your Vercel dashboard:

1. Go to your Vercel project settings
2. Add the environment variables from `.env.local`
3. Redeploy your application

## Database Features

### Automatic Failover

The app automatically detects the database type:
1. **Supabase** (if `NEXT_PUBLIC_SUPABASE_URL` is set)
2. **In-memory** (if deployed on Vercel without Supabase)
3. **SQLite** (for local development)

### Performance Optimizations

- Indexes on frequently queried columns
- Foreign key constraints for data integrity
- Optimized queries for dashboard statistics

## Troubleshooting

### Connection Issues
- Verify your Supabase project is active
- Check that environment variables are correctly set
- Ensure your IP is allowed (if using IP restrictions)

### Permission Issues
- Verify RLS policies are correctly set
- Check that the anon key has the necessary permissions

### Migration Issues
- If tables already exist, the script will skip creation
- Use `DROP TABLE` commands if you need to recreate tables

## Next Steps

1. **Enable Authentication** (optional): Add user authentication for multi-user support
2. **Set up Webhooks**: Configure Slack or other webhook integrations
3. **Add Monitoring**: Set up real-time monitoring with Supabase realtime features
4. **Optimize Queries**: Add more indexes as your data grows

## Support

If you encounter issues:
1. Check the Supabase logs in your dashboard
2. Verify environment variables are set correctly
3. Test the connection using the Supabase client directly