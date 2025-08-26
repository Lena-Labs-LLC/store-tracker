const axios = require('axios');

class WebhookService {
    constructor() {
        this.webhookUrl = process.env.SLACK_WEBHOOK_URL || 'https://hooks.slack.com/triggers/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';
    }

    async sendNewApps(newApps, storeName, storeType) {
        if (!newApps || newApps.length === 0) {
            return;
        }

        try {
            // Send individual webhook for each new app as requested
            for (const app of newApps) {
                const payload = {
                    appName: app.name,
                    appCategory: this.extractCategory(app.url, storeType),
                    appUrl: app.url
                };

                try {
                    const response = await axios.post(this.webhookUrl, payload, {
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        timeout: 10000
                    });
                    console.log(`Webhook sent for app: ${app.name}`);
                } catch (appError) {
                    console.error(`Failed to send webhook for app ${app.name}:`, appError.response?.data || appError.message);
                }
            }

            console.log(`Webhook processing completed for ${newApps.length} new apps from ${storeName}`);
            return true;

        } catch (error) {
            console.error('Webhook sending failed:', error.message);
            return false;
        }
    }

    extractCategory(appUrl, storeType) {
        try {
            if (storeType === 'playstore') {
                // Try to extract category from Play Store URL
                const url = new URL(appUrl);
                const categoryMatch = url.searchParams.get('category');
                if (categoryMatch) {
                    return this.formatCategory(categoryMatch);
                }
                
                // Fallback: try to determine from URL structure
                if (appUrl.includes('game')) return 'Games';
                if (appUrl.includes('social')) return 'Social';
                if (appUrl.includes('productivity')) return 'Productivity';
                if (appUrl.includes('entertainment')) return 'Entertainment';
                if (appUrl.includes('education')) return 'Education';
                if (appUrl.includes('business')) return 'Business';
                
                return 'Unknown';
            } else if (storeType === 'appstore') {
                // For App Store, category is harder to extract from URL
                // We'll need to make additional requests or use heuristics
                if (appUrl.includes('game')) return 'Games';
                if (appUrl.includes('social')) return 'Social Networking';
                if (appUrl.includes('productivity')) return 'Productivity';
                if (appUrl.includes('entertainment')) return 'Entertainment';
                if (appUrl.includes('education')) return 'Education';
                if (appUrl.includes('business')) return 'Business';
                
                return 'Unknown';
            }
            
            return 'Unknown';
        } catch (error) {
            return 'Unknown';
        }
    }

    formatCategory(category) {
        // Convert category codes to readable names
        const categoryMap = {
            'GAME': 'Games',
            'SOCIAL': 'Social',
            'PRODUCTIVITY': 'Productivity',
            'ENTERTAINMENT': 'Entertainment',
            'EDUCATION': 'Education',
            'BUSINESS': 'Business',
            'LIFESTYLE': 'Lifestyle',
            'TOOLS': 'Tools',
            'COMMUNICATION': 'Communication',
            'PHOTOGRAPHY': 'Photography',
            'MUSIC_AND_AUDIO': 'Music & Audio',
            'VIDEO_PLAYERS': 'Video Players & Editors',
            'HEALTH_AND_FITNESS': 'Health & Fitness',
            'TRAVEL_AND_LOCAL': 'Travel & Local',
            'SHOPPING': 'Shopping',
            'NEWS_AND_MAGAZINES': 'News & Magazines',
            'FINANCE': 'Finance',
            'SPORTS': 'Sports',
            'BOOKS_AND_REFERENCE': 'Books & Reference',
            'MEDICAL': 'Medical',
            'AUTO_AND_VEHICLES': 'Auto & Vehicles',
            'WEATHER': 'Weather',
            'HOUSE_AND_HOME': 'House & Home',
            'COMICS': 'Comics',
            'LIBRARIES_AND_DEMO': 'Libraries & Demo',
            'DATING': 'Dating',
            'FOOD_AND_DRINK': 'Food & Drink',
            'MAPS_AND_NAVIGATION': 'Maps & Navigation',
            'BEAUTY': 'Beauty',
            'EVENTS': 'Events',
            'PARENTING': 'Parenting',
            'ART_AND_DESIGN': 'Art & Design'
        };

        return categoryMap[category] || category.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
    }

    async testWebhook() {
        // Simple test payload for Slack trigger webhook
        const testPayload = {
            appName: "Test App",
            appCategory: "Testing", 
            appUrl: "https://example.com"
        };

        try {
            const response = await axios.post(this.webhookUrl, testPayload, {
                headers: { 'Content-Type': 'application/json' },
                timeout: 10000
            });
            console.log('Webhook test response:', response.status);
            return { success: true, status: response.status };
        } catch (error) {
            const errorData = error.response?.data;
            const status = error.response?.status;
            console.error('Webhook test failed:', status, errorData || error.message);
            
            // Return detailed error info
            return { 
                success: false, 
                status: status,
                error: errorData?.error || error.message,
                details: errorData
            };
        }
    }
}

module.exports = WebhookService;