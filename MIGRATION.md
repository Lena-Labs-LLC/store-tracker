# Migration Guide: Express.js to Next.js

This document outlines the changes made when converting the App Store Tracker from Express.js to Next.js.

## What Changed

### 1. Project Structure
```
Before (Express.js):
├── server.js              # Main server file
├── public/
│   ├── index.html         # Static HTML
│   └── app.js            # Client-side JavaScript
└── src/
    ├── routes/           # Express routes
    └── ...

After (Next.js):
├── pages/
│   ├── _app.js           # App wrapper
│   ├── index.js          # Main React page
│   └── api/              # API routes
├── lib/
│   └── backgroundService.js  # Background job service
└── src/                  # Unchanged backend logic
```

### 2. Frontend Changes
- **HTML → React**: Converted static HTML to React components
- **Vanilla JS → React Hooks**: Replaced jQuery-style DOM manipulation with React state management
- **Bootstrap**: Still using Bootstrap, but now imported as npm package
- **Font Awesome**: Now imported as npm package

### 3. Backend Changes
- **Express Routes → Next.js API Routes**: All `/api/*` endpoints now use Next.js API routes
- **Background Jobs**: Moved cron jobs to a separate background service
- **Database**: Same SQLite database and schema, no changes needed

### 4. Dependencies
**Added:**
- `next` - Next.js framework
- `react` & `react-dom` - React framework
- `bootstrap` - Bootstrap CSS framework
- `@fortawesome/fontawesome-free` - Font Awesome icons

**Removed:**
- `express` - No longer needed
- `nodemon` - Next.js has built-in hot reload

## Migration Steps

If you're migrating from the old Express.js version:

1. **Backup your data**: Your `app_tracker.db` file contains all your data and will work with the new version

2. **Install new dependencies**:
   ```bash
   npm install
   ```

3. **Update your scripts**: The npm scripts have changed:
   - `npm run dev` - Development mode (with hot reload)
   - `npm run build` - Build for production
   - `npm start` - Start production server

4. **Environment variables**: Your `.env` file should work as-is

5. **Database**: No migration needed - the same SQLite database works

## Benefits of Next.js Version

1. **Better Performance**: 
   - Server-side rendering
   - Automatic code splitting
   - Optimized builds

2. **Modern Development**:
   - React components
   - Hot reload in development
   - TypeScript support (ready to add)

3. **Better Deployment**:
   - Vercel deployment ready
   - Docker-friendly
   - Static export option

4. **Maintainability**:
   - Component-based architecture
   - Better separation of concerns
   - Modern JavaScript features

## API Compatibility

All existing API endpoints work the same way:
- Same request/response formats
- Same authentication (if any)
- Same error handling

The only change is the file structure - functionality remains identical.

## Troubleshooting

### Background Service Not Starting
If the monitoring service doesn't start automatically:
```bash
curl -X POST http://localhost:3000/api/service/start
```

### Database Issues
The SQLite database should work without changes. If you encounter issues:
1. Check file permissions on `app_tracker.db`
2. Ensure the database file is in the project root
3. Check the console for initialization errors

### Missing Dependencies
If you see import errors:
```bash
rm -rf node_modules package-lock.json
npm install
```

## Development vs Production

**Development** (`npm run dev`):
- Hot reload enabled
- Detailed error messages
- Source maps included

**Production** (`npm run build && npm start`):
- Optimized build
- Minified code
- Better performance