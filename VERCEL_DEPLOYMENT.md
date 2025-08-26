# Vercel Deployment Guide

## Current Status

The app is currently deployed on Vercel but uses an in-memory database implementation that resets on each deployment. This is a temporary solution for demonstration purposes.

## Issues with Current Deployment

1. **In-Memory Database**: Data doesn't persist between deployments
2. **Limited Functionality**: Some features like store monitoring are mocked
3. **No Background Jobs**: Cron jobs don't work in Vercel's serverless environment

## Recommended Solutions for Production

### 1. Use a Cloud Database

Replace the in-memory database with a real cloud database:

**Option A: PlanetScale (MySQL)**
```bash
npm install @planetscale/database
```

**Option B: Supabase (PostgreSQL)**
```bash
npm install @supabase/supabase-js
```

**Option C: MongoDB Atlas**
```bash
npm install mongodb
```

### 2. Background Jobs

For scheduled monitoring, use:

**Option A: Vercel Cron Jobs**
- Add cron jobs to `vercel.json`
- Create API endpoints for scheduled tasks

**Option B: External Service**
- Use services like GitHub Actions, Zapier, or Cron-job.org
- Call your API endpoints on schedule

### 3. Environment Variables

Set these in Vercel dashboard:
- `DATABASE_URL` - Your database connection string
- `SLACK_WEBHOOK_URL` - For notifications
- `GOOGLE_SHEETS_CREDENTIALS` - For Google Sheets integration

## Quick Fix for Demo

The current deployment works for demonstration but has these limitations:
- Data resets on each deployment
- No persistent storage
- Limited monitoring functionality

## Local Development

For local development, the app still uses SQLite and works fully:

```bash
npm run dev
```

## Production Deployment Steps

1. Choose a cloud database provider
2. Update database implementation in `lib/database-vercel.js`
3. Set environment variables in Vercel
4. Deploy with persistent storage

## Current Demo URL

https://store-tracker-orpin.vercel.app

Note: This is a demo deployment with limited functionality.