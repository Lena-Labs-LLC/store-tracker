import { createClient } from '@supabase/supabase-js'

class SupabaseDatabase {
    constructor() {
        // Initialize Supabase client
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        
        if (!supabaseUrl || !supabaseKey) {
            throw new Error('Missing Supabase environment variables')
        }
        
        this.supabase = createClient(supabaseUrl, supabaseKey)
        this.initialized = false
    }

    async initialize() {
        if (this.initialized) return
        
        // Test connection
        try {
            const { data, error } = await this.supabase.from('stores').select('count').limit(1)
            if (error && !error.message.includes('relation "stores" does not exist')) {
                throw error
            }
            this.initialized = true
        } catch (error) {
            console.error('Supabase initialization error:', error)
            throw error
        }
    }

    async run(query, params = []) {
        // This method is for compatibility with SQLite interface
        // In Supabase, we use specific methods instead
        throw new Error('Use specific Supabase methods instead of raw queries')
    }

    async get(query, params = []) {
        // Handle stats query specifically
        if (query.includes('COUNT')) {
            const { data: stores } = await this.supabase.from('stores').select('id')
            const { data: apps } = await this.supabase.from('apps').select('id')
            const { data: sessions } = await this.supabase.from('monitoring_sessions').select('id')
            
            // Get new apps in last 24 hours
            const yesterday = new Date()
            yesterday.setDate(yesterday.getDate() - 1)
            
            const { data: newApps } = await this.supabase
                .from('apps')
                .select('id')
                .gte('discovered_at', yesterday.toISOString())
            
            return {
                total_stores: stores?.length || 0,
                total_apps: apps?.length || 0,
                total_sessions: sessions?.length || 0,
                new_apps_24h: newApps?.length || 0
            }
        }
        
        return null
    }

    async all(query, params = []) {
        // Handle different query types
        if (query.includes('monitoring_sessions')) {
            const { data, error } = await this.supabase
                .from('monitoring_sessions')
                .select(`
                    *,
                    stores (
                        name,
                        type
                    )
                `)
                .order('started_at', { ascending: false })
                .limit(50)
            
            if (error) {
                console.error('Supabase monitoring_sessions error:', error)
                return [] // Return empty array on error
            }
            
            // Transform data to match expected format
            const result = data?.map(session => ({
                ...session,
                store_name: session.stores?.name,
                store_type: session.stores?.type
            })) || []
            
            return result
        }
        
        if (query.includes('stores')) {
            const { data, error } = await this.supabase
                .from('stores')
                .select('*')
                .order('created_at', { ascending: false })
            
            if (error) {
                console.error('Supabase stores error:', error)
                return []
            }
            return data || []
        }
        
        if (query.includes('apps')) {
            const { data, error } = await this.supabase
                .from('apps')
                .select('*')
                .order('discovered_at', { ascending: false })
            
            if (error) {
                console.error('Supabase apps error:', error)
                return []
            }
            return data || []
        }
        
        return []
    }

    // Store management
    async addStore(name, url, type, checkInterval = 24, intervalUnit = 'hours') {
        const intervalHours = this.convertToHours(checkInterval, intervalUnit);
        
        // Try with new columns first, fallback to legacy format if columns don't exist
        let insertData = {
            name,
            url,
            type,
            check_interval_hours: intervalHours
        };
        
        // Try to add new columns, but don't fail if they don't exist yet
        try {
            insertData.check_interval_value = checkInterval;
            insertData.check_interval_unit = intervalUnit;
        } catch (e) {
            console.log('New time unit columns not available yet, using legacy format');
        }
        
        const { data, error } = await this.supabase
            .from('stores')
            .insert([insertData])
            .select()
            .single()
        
        if (error) {
            // If error is about missing columns, try again with just the legacy format
            if (error.message.includes('check_interval_unit') || error.message.includes('check_interval_value')) {
                console.log('Falling back to legacy format due to missing columns');
                const { data: legacyData, error: legacyError } = await this.supabase
                    .from('stores')
                    .insert([{
                        name,
                        url,
                        type,
                        check_interval_hours: intervalHours
                    }])
                    .select()
                    .single()
                
                if (legacyError) throw legacyError
                return { id: legacyData.id }
            }
            throw error
        }
        return { id: data.id }
    }

    async getStores() {
        const { data, error } = await this.supabase
            .from('stores')
            .select('*')
            .order('created_at', { ascending: false })
        
        if (error) throw error
        return data || []
    }

    async deleteStore(id) {
        // First delete related apps and monitoring sessions (cascade should handle this, but let's be explicit)
        await this.supabase.from('apps').delete().eq('store_id', id);
        await this.supabase.from('monitoring_sessions').delete().eq('store_id', id);
        
        // Then delete the store
        const { error } = await this.supabase
            .from('stores')
            .delete()
            .eq('id', id)
        
        if (error) {
            console.error('Delete store error:', error);
            throw error;
        }
        return { changes: 1 }
    }

    async updateStoreInterval(id, value, unit = 'hours') {
        const hours = this.convertToHours(value, unit);
        
        // Try with new columns first, fallback to legacy format if columns don't exist
        let updateData = {
            check_interval_hours: hours
        };
        
        try {
            updateData.check_interval_value = value;
            updateData.check_interval_unit = unit;
        } catch (e) {
            console.log('New time unit columns not available yet, using legacy format');
        }
        
        const { error } = await this.supabase
            .from('stores')
            .update(updateData)
            .eq('id', id)
        
        if (error) {
            // If error is about missing columns, try again with just the legacy format
            if (error.message.includes('check_interval_unit') || error.message.includes('check_interval_value')) {
                console.log('Falling back to legacy format due to missing columns');
                const { error: legacyError } = await this.supabase
                    .from('stores')
                    .update({ check_interval_hours: hours })
                    .eq('id', id)
                
                if (legacyError) throw legacyError
                return { changes: 1 }
            }
            throw error
        }
        return { changes: 1 }
    }

    // Helper method to convert different time units to hours
    convertToHours(value, unit) {
        switch (unit) {
            case 'seconds':
                return Math.max(0.0003, value / 3600); // Minimum 1 second = 0.0003 hours
            case 'minutes':
                return Math.max(0.017, value / 60); // Minimum 1 minute = 0.017 hours
            case 'hours':
                return value;
            case 'days':
                return value * 24;
            default:
                return value;
        }
    }

    // Monitoring
    async getStoresForMonitoring() {
        // Get all stores and filter them in JavaScript to handle different time units properly
        const { data: allStores, error } = await this.supabase
            .from('stores')
            .select('*')
        
        if (error) throw error
        
        console.log('getStoresForMonitoring - All stores from DB:', allStores);
        
        const now = new Date();
        
        const filtered = (allStores || []).filter(store => {
            console.log(`Checking store ${store.name}:`, {
                last_checked: store.last_checked,
                interval_value: store.check_interval_value,
                interval_unit: store.check_interval_unit
            });
            
            if (!store.last_checked || store.last_checked === null || store.last_checked === undefined) {
                console.log(`Store ${store.name} has never been checked - should monitor`);
                return true; // Never checked, should be monitored
            }
            
            const lastChecked = new Date(store.last_checked);
            const intervalValue = store.check_interval_value || store.check_interval_hours || 24;
            const intervalUnit = store.check_interval_unit || 'hours';
            
            // Calculate the next check time based on the interval
            let nextCheckTime;
            switch (intervalUnit) {
                case 'seconds':
                    nextCheckTime = new Date(lastChecked.getTime() + (intervalValue * 1000));
                    break;
                case 'minutes':
                    nextCheckTime = new Date(lastChecked.getTime() + (intervalValue * 60 * 1000));
                    break;
                case 'hours':
                    nextCheckTime = new Date(lastChecked.getTime() + (intervalValue * 60 * 60 * 1000));
                    break;
                case 'days':
                    nextCheckTime = new Date(lastChecked.getTime() + (intervalValue * 24 * 60 * 60 * 1000));
                    break;
                default:
                    // Fallback to hours
                    nextCheckTime = new Date(lastChecked.getTime() + (intervalValue * 60 * 60 * 1000));
            }
            
            const shouldMonitor = now >= nextCheckTime;
            const timeDiff = now.getTime() - nextCheckTime.getTime();
            console.log(`Store ${store.name} - Next check: ${nextCheckTime}, Now: ${now}, Time diff: ${timeDiff}ms, Should monitor: ${shouldMonitor}`);
            
            // Add a small buffer to prevent multiple checks within the same second
            return shouldMonitor && timeDiff >= 0;
        });
        
        console.log('getStoresForMonitoring - Filtered stores:', filtered);
        return filtered;
    }

    async updateLastChecked(storeId) {
        const { error } = await this.supabase
            .from('stores')
            .update({ last_checked: new Date().toISOString() })
            .eq('id', storeId)
        
        if (error) throw error
        return { changes: 1 }
    }

    // Apps
    async addApp(storeId, appId, name, url) {
        const { data, error } = await this.supabase
            .from('apps')
            .upsert([{
                store_id: storeId,
                app_id: appId,
                name,
                url
            }], { 
                onConflict: 'store_id,app_id',
                ignoreDuplicates: true 
            })
            .select()
        
        if (error) throw error
        return { id: data?.[0]?.id || Math.floor(Math.random() * 1000) }
    }

    async getAppsForStore(storeId) {
        const { data, error } = await this.supabase
            .from('apps')
            .select('*')
            .eq('store_id', storeId)
            .order('discovered_at', { ascending: false })
        
        if (error) throw error
        return data || []
    }

    async getNewApps(storeId, since) {
        const { data, error } = await this.supabase
            .from('apps')
            .select('*')
            .eq('store_id', storeId)
            .gte('discovered_at', since)
            .order('discovered_at', { ascending: false })
        
        if (error) throw error
        return data || []
    }

    // Monitoring sessions
    async createMonitoringSession(storeId) {
        const { data, error } = await this.supabase
            .from('monitoring_sessions')
            .insert([{
                store_id: storeId,
                started_at: new Date().toISOString(),
                status: 'running'
            }])
            .select()
            .single()
        
        if (error) throw error
        return data
    }

    async updateMonitoringSession(sessionId, updates) {
        const { error } = await this.supabase
            .from('monitoring_sessions')
            .update({
                ...updates,
                completed_at: new Date().toISOString(),
                status: 'completed'
            })
            .eq('id', sessionId)
        
        if (error) throw error
        return { changes: 1 }
    }
}

export default SupabaseDatabase