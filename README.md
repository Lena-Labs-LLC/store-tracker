# App Store Tracker

A Node.js web application that monitors app stores (Google Play Store and Apple App Store) to detect newly added apps.

## Features

- **Dashboard Interface**: Clean web interface to manage store monitoring
- **Store Management**: Add/remove Play Store and App Store links
- **Flexible Scheduling**: Configure check intervals (hours, with options for minutes/days)
- **Manual Triggers**: Run checks manually on demand
- **New App Detection**: Tracks previously seen apps to identify new additions
- **Google Sheets Integration**: Export app data to Google Sheets
- **Real-time Stats**: Monitor total stores, apps, and recent activity

## Installation

1. Clone the repository and install dependencies:
```bash
npm install
```

2. Copy the environment file and configure:
```bash
cp .env.example .env
```

3. For Google Sheets integration (optional):
   - Create a Google Cloud Project
   - Enable Google Sheets API
   - Create a service account and download the key file
   - Update `.env` with the path to your service account key

4. Start the application:
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

## Usage

1. Open http://localhost:3000 in your browser
2. Add store URLs using the form:
   - **Play Store**: Developer pages or category pages
   - **App Store**: Developer pages or category pages
3. Configure check intervals (default: 24 hours)
4. Monitor the dashboard for new app discoveries

## Store URL Examples

### Google Play Store
- Developer page: `https://play.google.com/store/apps/developer?id=Developer+Name`
- Category page: `https://play.google.com/store/apps/category/GAME`

### Apple App Store  
- Developer page: `https://apps.apple.com/developer/developer-name/id123456789`
- Category browsing: Various App Store URLs

## Database

The application uses SQLite for data storage with three main tables:
- `stores`: Store configurations and monitoring settings
- `apps`: Discovered apps with metadata
- `monitoring_sessions`: Check history and statistics

## API Endpoints

### Stores
- `GET /api/stores` - List all stores
- `POST /api/stores` - Add new store
- `DELETE /api/stores/:id` - Delete store
- `PATCH /api/stores/:id/interval` - Update check interval
- `GET /api/stores/:id/apps` - Get apps for store

### Monitoring
- `POST /api/monitoring/check/:storeId` - Manual store check
- `GET /api/monitoring/sessions` - Recent monitoring sessions
- `GET /api/monitoring/stats` - Dashboard statistics

## Configuration

### Check Intervals
- Minimum: 1 hour
- Default: 24 hours
- Can be configured per store

### Automatic Monitoring
The application runs a cron job every minute to check if any stores need monitoring based on their configured intervals.

## Limitations

- Web scraping depends on store page structures (may need updates)
- Rate limiting may apply for frequent checks
- Some store pages may require additional handling for dynamic content

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License