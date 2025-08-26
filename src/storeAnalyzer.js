const axios = require('axios');
const cheerio = require('cheerio');

class StoreAnalyzer {
    static detectStoreType(url) {
        const urlLower = url.toLowerCase();
        
        if (urlLower.includes('play.google.com')) {
            return 'playstore';
        } else if (urlLower.includes('apps.apple.com') || urlLower.includes('itunes.apple.com')) {
            return 'appstore';
        }
        
        return null;
    }

    static async extractStoreName(url, storeType) {
        try {
            // First try to scrape the page title - this gives the best names
            const scrapedName = await this.scrapePageTitle(url);
            if (scrapedName) {
                return scrapedName;
            }

            // If scraping fails, try to get a meaningful name from the URL
            const urlName = this.getNameFromUrl(url, storeType);
            if (urlName) {
                return urlName;
            }

            // Fallback to a generic name
            return `${storeType === 'playstore' ? 'Play Store' : 'App Store'} - ${new Date().toLocaleDateString()}`;

        } catch (error) {
            console.error('Error extracting store name:', error);
            return `${storeType === 'playstore' ? 'Play Store' : 'App Store'} - ${new Date().toLocaleDateString()}`;
        }
    }

    static getNameFromUrl(url, storeType) {
        try {
            const urlObj = new URL(url);
            
            if (storeType === 'playstore') {
                // For category pages - use descriptive names
                if (url.includes('/category/')) {
                    const category = url.split('/category/')[1].split('?')[0];
                    const categoryName = category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                    return `Play Store ${categoryName} Category`;
                }
                
                // For collection pages
                if (url.includes('/collection/')) {
                    const collection = url.split('/collection/')[1].split('?')[0];
                    const collectionName = collection.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                    return `Play Store ${collectionName} Collection`;
                }
                
                // For developer pages - use generic name, title scraping will get the real name
                const developerId = urlObj.searchParams.get('id');
                if (developerId) {
                    return `Play Store Developer Page`;
                }
            } else if (storeType === 'appstore') {
                // For genre pages
                if (url.includes('/genre/')) {
                    const genre = url.split('/genre/')[1].split('/')[0];
                    const genreName = genre.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                    return `App Store ${genreName} Genre`;
                }
                
                // For developer pages - use generic name, title scraping will get the real name
                const pathParts = urlObj.pathname.split('/');
                const developerIndex = pathParts.indexOf('developer');
                if (developerIndex !== -1 && pathParts[developerIndex + 1]) {
                    return `App Store Developer Page`;
                }
            }
            
            return null;
        } catch (error) {
            return null;
        }
    }

    static async scrapePageTitle(url) {
        try {
            const response = await axios.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                },
                timeout: 15000,
                maxRedirects: 5
            });

            const $ = cheerio.load(response.data);
            
            // Try multiple selectors for title
            let title = '';
            
            // For App Store, try specific selectors first
            if (url.includes('apps.apple.com')) {
                // Try multiple approaches for App Store
                
                // 1. Try meta tags first (usually cleaner)
                title = $('meta[property="og:title"]').attr('content') ||
                       $('meta[name="twitter:title"]').attr('content') ||
                       $('meta[name="title"]').attr('content');
                
                // 2. If meta tags don't work, try specific App Store selectors
                if (!title || title.includes('ember') || title.includes('{')) {
                    title = $('h1.product-header__title').text().trim() ||
                           $('h1[data-test-id="product-header-title"]').text().trim() ||
                           $('.product-header__title').text().trim() ||
                           $('h1').first().text().trim();
                }
                
                // 3. Last resort: try to parse the messy title tag
                if (!title || title.includes('ember') || title.includes('{')) {
                    const messyTitle = $('title').text().trim();
                    if (messyTitle) {
                        // Try to extract app name from the end of messy title
                        const cleanMatch = messyTitle.match(/}\s*([A-Z][^{}]+?)\s*(?:[A-Z][a-z]+(?:\s*&\s*[A-Z][a-z]+)?)?$/);
                        if (cleanMatch && cleanMatch[1]) {
                            title = cleanMatch[1].trim();
                        }
                    }
                }
                
            } else {
                // For Play Store and others
                title = $('meta[property="og:title"]').attr('content') || 
                       $('meta[name="title"]').attr('content') || 
                       $('title').text().trim();
            }
            
            if (title) {
                console.log('Raw title before cleaning:', title);
                
                // Only clean if title contains CSS mess
                if (title.includes('ember') || title.includes('{') || title.includes('@media')) {
                    title = this.cleanCSSFromTitle(title);
                    console.log('After CSS cleaning:', title);
                }
                
                // Clean up store-specific suffixes and prefixes
                title = this.cleanStoreSpecificText(title);
                console.log('After store cleaning:', title);
                
                // Final cleanup
                title = title.replace(/\s+/g, ' ').trim();
                
                // Limit length but keep it readable
                if (title.length > 60) {
                    title = title.substring(0, 57) + '...';
                }
                
                // Final validation - make sure we have a meaningful title
                if (title.length < 3) {
                    console.log('Title too short, returning null');
                    return null;
                }
                
                console.log('Final cleaned title:', title);
                return title;
            }
            
            return null;
        } catch (error) {
            console.error('Error scraping page title:', error.message);
            return null;
        }
    }

    static cleanCSSFromTitle(title) {
        // Strategy: Find the actual app name at the end of the string
        // The pattern is usually: [CSS MESS] [APP NAME] [CATEGORY]
        
        // First, let's try to find the app name pattern at the end
        // Look for text that comes after all the CSS mess
        const appNamePattern = /}\s*([A-Z][A-Za-z0-9\s:&\-'.,!]+?)\s*(?:[A-Z][a-z]+\s*&\s*[A-Z][a-z]+|[A-Z][a-z]+)?\s*$/;
        const appNameMatch = title.match(appNamePattern);
        
        if (appNameMatch && appNameMatch[1]) {
            return appNameMatch[1].trim();
        }
        
        // Alternative approach: Split by } and take the last meaningful part
        const parts = title.split('}');
        if (parts.length > 1) {
            const lastPart = parts[parts.length - 1].trim();
            
            // Clean up the last part
            let cleanPart = lastPart;
            
            // Remove leading whitespace and CSS remnants
            cleanPart = cleanPart.replace(/^\s*[.#@][^A-Z]*/, '');
            cleanPart = cleanPart.trim();
            
            // If we have a meaningful string, extract the app name
            if (cleanPart.length > 3) {
                // Look for app name before category
                const beforeCategory = cleanPart.match(/^([A-Z][^A-Z]*(?:[A-Z][a-z]*)*[^A-Z]*?)\s+([A-Z][a-z]+(?:\s*&\s*[A-Z][a-z]+)?)$/);
                if (beforeCategory && beforeCategory[1]) {
                    return beforeCategory[1].trim();
                }
                
                // If no category pattern, return the whole clean part
                return cleanPart;
            }
        }
        
        // Fallback: Try to extract any meaningful text
        const fallbackMatch = title.match(/([A-Z][A-Za-z0-9\s:&\-'.,!]{5,}?)(?:\s+[A-Z][a-z]+(?:\s*&\s*[A-Z][a-z]+)?)?$/);
        if (fallbackMatch && fallbackMatch[1]) {
            return fallbackMatch[1].trim();
        }
        
        return title;
    }

    static cleanStoreSpecificText(title) {
        // Clean up common suffixes and prefixes
        title = title.replace(/ - Google Play$/i, '');
        title = title.replace(/ on the App Store$/i, '');
        title = title.replace(/ - Apps on Google Play$/i, '');
        title = title.replace(/ - Android Apps on Google Play$/i, '');
        title = title.replace(/^Android Apps by /i, '');
        title = title.replace(/^Apps by /i, '');
        title = title.replace(/^Games by /i, '');
        title = title.replace(/ - App Store$/i, '');
        
        // Remove category suffixes
        title = title.replace(/\s+(Education|Games|Productivity|Entertainment|Social|Business|Utilities|Finance|Health|Travel|Shopping|News|Sports|Weather|Music|Photo|Reference|Medical|Navigation|Lifestyle|Food|Books)$/i, '');
        
        // For developer pages, clean up further
        if (title.includes('Apps by') || title.includes('Games by')) {
            title = title.replace(/^(Apps|Games) by /i, '');
        }
        
        return title;
    }

    static validateStoreUrl(url) {
        try {
            const urlObj = new URL(url);
            const storeType = this.detectStoreType(url);
            
            if (!storeType) {
                return { valid: false, error: 'URL must be from Google Play Store or Apple App Store' };
            }

            // Additional validation for specific store types
            if (storeType === 'playstore') {
                if (!urlObj.hostname.includes('play.google.com')) {
                    return { valid: false, error: 'Invalid Play Store URL' };
                }
            } else if (storeType === 'appstore') {
                if (!urlObj.hostname.includes('apps.apple.com') && !urlObj.hostname.includes('itunes.apple.com')) {
                    return { valid: false, error: 'Invalid App Store URL' };
                }
            }

            return { valid: true, storeType };
        } catch (error) {
            return { valid: false, error: 'Invalid URL format' };
        }
    }
}

module.exports = StoreAnalyzer;