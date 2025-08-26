const { google } = require('googleapis');

class GoogleSheetsService {
    constructor() {
        this.sheets = null;
        this.auth = null;
    }

    async initialize() {
        try {
            // Initialize with service account credentials
            this.auth = new google.auth.GoogleAuth({
                keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE,
                scopes: ['https://www.googleapis.com/auth/spreadsheets']
            });

            this.sheets = google.sheets({ version: 'v4', auth: this.auth });
            return true;
        } catch (error) {
            console.error('Google Sheets initialization error:', error);
            return false;
        }
    }

    async exportAppsToSheet(spreadsheetId, apps, storeName) {
        if (!this.sheets) {
            const initialized = await this.initialize();
            if (!initialized) return false;
        }

        try {
            const sheetName = `${storeName}_${new Date().toISOString().split('T')[0]}`;
            
            // Create new sheet
            await this.sheets.spreadsheets.batchUpdate({
                spreadsheetId,
                resource: {
                    requests: [{
                        addSheet: {
                            properties: {
                                title: sheetName
                            }
                        }
                    }]
                }
            });

            // Prepare data
            const values = [
                ['App ID', 'App Name', 'URL', 'Discovered At'],
                ...apps.map(app => [app.app_id, app.name, app.url, app.discovered_at])
            ];

            // Write data
            await this.sheets.spreadsheets.values.update({
                spreadsheetId,
                range: `${sheetName}!A1`,
                valueInputOption: 'RAW',
                resource: { values }
            });

            return true;
        } catch (error) {
            console.error('Google Sheets export error:', error);
            return false;
        }
    }

    async getAppsFromSheet(spreadsheetId, sheetName) {
        if (!this.sheets) {
            const initialized = await this.initialize();
            if (!initialized) return [];
        }

        try {
            const response = await this.sheets.spreadsheets.values.get({
                spreadsheetId,
                range: `${sheetName}!A2:D`
            });

            const rows = response.data.values || [];
            return rows.map(row => ({
                app_id: row[0],
                name: row[1],
                url: row[2],
                discovered_at: row[3]
            }));
        } catch (error) {
            console.error('Google Sheets read error:', error);
            return [];
        }
    }
}

module.exports = GoogleSheetsService;