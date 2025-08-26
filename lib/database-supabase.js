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
    async addStore(name, url, type, checkInterval = 24) {
        const { data, error } = await this.supabase
            .from('stores')
            .insert([{
                name,
                url,
                type,
                check_interval_hours: checkInterval
            }])
            .select()
            .single()
        
        if (error) throw error
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
        const { error } = await this.supabase
            .from('stores')
            .delete()
            .eq('id', id)
        
        if (error) throw error
        return { changes: 1 }
    }

    async updateStoreInterval(id, hours) {
        const { error } = await this.supabase
            .from('stores')
            .update({ check_interval_hours: hours })
            .eq('id', id)
        
        if (error) throw error
        return { changes: 1 }
    }

    // Monitoring
    async getStoresForMonitoring() {
        const now = new Date()
        
        const { data, error } = await this.supabase
            .from('stores')
            .select('*')
            .or(`last_checked.is.null,last_checked.lt.${new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()}`)
        
        if (error) throw error
        return data || []
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
}

export default SupabaseDatabase