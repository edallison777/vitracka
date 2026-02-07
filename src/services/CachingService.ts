/**
 * Caching Service for Performance Optimization
 * Implements Redis-based caching strategies for database queries and API responses
 * Implements Requirements 16.4, 16.5
 */

export interface CacheConfig {
    host: string;
    port: number;
    password?: string;
    db: number;
    keyPrefix: string;
    defaultTTL: number; // Time to live in seconds
}

export interface CacheStats {
    hits: number;
    misses: number;
    hitRate: number;
    totalKeys: number;
    memoryUsage: number;
}

export interface CacheEntry<T = any> {
    data: T;
    timestamp: number;
    ttl: number;
    key: string;
}

export class CachingService {
    private config: CacheConfig;
    private cache: Map<string, CacheEntry>; // In-memory cache for development/testing
    private stats: CacheStats;

    constructor(config?: Partial<CacheConfig>) {
        this.config = {
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6379'),
            password: process.env.REDIS_PASSWORD,
            db: parseInt(process.env.REDIS_DB || '0'),
            keyPrefix: 'vitracka:',
            defaultTTL: 3600, // 1 hour
            ...config
        };

        // Use in-memory cache for development/testing
        this.cache = new Map();
        this.stats = {
            hits: 0,
            misses: 0,
            hitRate: 0,
            totalKeys: 0,
            memoryUsage: 0
        };

        // Start cleanup interval
        this.startCleanupInterval();
    }

    /**
     * Get value from cache
     */
    async get<T>(key: string): Promise<T | null> {
        const fullKey = this.config.keyPrefix + key;
        const entry = this.cache.get(fullKey);

        if (!entry) {
            this.stats.misses++;
            this.updateHitRate();
            return null;
        }

        // Check if entry has expired
        if (Date.now() > entry.timestamp + (entry.ttl * 1000)) {
            this.cache.delete(fullKey);
            this.stats.misses++;
            this.updateHitRate();
            return null;
        }

        this.stats.hits++;
        this.updateHitRate();
        return entry.data as T;
    }

    /**
     * Set value in cache
     */
    async set<T>(key: string, value: T, ttl?: number): Promise<void> {
        const fullKey = this.config.keyPrefix + key;
        const entry: CacheEntry<T> = {
            data: value,
            timestamp: Date.now(),
            ttl: ttl || this.config.defaultTTL,
            key: fullKey
        };

        this.cache.set(fullKey, entry);
        this.stats.totalKeys = this.cache.size;
        this.updateMemoryUsage();
    }

    /**
     * Delete value from cache
     */
    async delete(key: string): Promise<boolean> {
        const fullKey = this.config.keyPrefix + key;
        const deleted = this.cache.delete(fullKey);
        this.stats.totalKeys = this.cache.size;
        this.updateMemoryUsage();
        return deleted;
    }

    /**
     * Check if key exists in cache
     */
    async exists(key: string): Promise<boolean> {
        const fullKey = this.config.keyPrefix + key;
        const entry = this.cache.get(fullKey);

        if (!entry) {
            return false;
        }

        // Check if entry has expired
        if (Date.now() > entry.timestamp + (entry.ttl * 1000)) {
            this.cache.delete(fullKey);
            return false;
        }

        return true;
    }

    /**
     * Get or set pattern - get from cache, or execute function and cache result
     */
    async getOrSet<T>(
        key: string,
        fetchFunction: () => Promise<T>,
        ttl?: number
    ): Promise<T> {
        const cached = await this.get<T>(key);

        if (cached !== null) {
            return cached;
        }

        const value = await fetchFunction();
        await this.set(key, value, ttl);
        return value;
    }

    /**
     * Cache database query results
     */
    async cacheQuery<T>(
        queryKey: string,
        query: string,
        params: any[],
        executeQuery: (query: string, params: any[]) => Promise<T>,
        ttl: number = 300 // 5 minutes default for queries
    ): Promise<T> {
        const cacheKey = `query:${queryKey}:${this.hashQuery(query, params)}`;

        return this.getOrSet(cacheKey, () => executeQuery(query, params), ttl);
    }

    /**
     * Cache user profile data
     */
    async cacheUserProfile(userId: string, profile: any, ttl: number = 1800): Promise<void> {
        await this.set(`user:profile:${userId}`, profile, ttl);
    }

    /**
     * Get cached user profile
     */
    async getCachedUserProfile(userId: string): Promise<any | null> {
        return this.get(`user:profile:${userId}`);
    }

    /**
     * Cache weight entries for quick access
     */
    async cacheWeightEntries(userId: string, entries: any[], ttl: number = 600): Promise<void> {
        await this.set(`user:weights:${userId}`, entries, ttl);
    }

    /**
     * Get cached weight entries
     */
    async getCachedWeightEntries(userId: string): Promise<any[] | null> {
        return this.get(`user:weights:${userId}`);
    }

    /**
     * Cache agent responses to avoid recomputation
     */
    async cacheAgentResponse(
        agentType: string,
        inputHash: string,
        response: any,
        ttl: number = 900 // 15 minutes
    ): Promise<void> {
        const key = `agent:${agentType}:${inputHash}`;
        await this.set(key, response, ttl);
    }

    /**
     * Get cached agent response
     */
    async getCachedAgentResponse(agentType: string, inputHash: string): Promise<any | null> {
        const key = `agent:${agentType}:${inputHash}`;
        return this.get(key);
    }

    /**
     * Cache nutrition data from external APIs
     */
    async cacheNutritionData(foodId: string, nutritionData: any, ttl: number = 86400): Promise<void> {
        await this.set(`nutrition:${foodId}`, nutritionData, ttl);
    }

    /**
     * Get cached nutrition data
     */
    async getCachedNutritionData(foodId: string): Promise<any | null> {
        return this.get(`nutrition:${foodId}`);
    }

    /**
     * Invalidate cache entries by pattern
     */
    async invalidatePattern(pattern: string): Promise<number> {
        const fullPattern = this.config.keyPrefix + pattern;
        let deletedCount = 0;

        for (const [key] of this.cache) {
            if (key.includes(fullPattern)) {
                this.cache.delete(key);
                deletedCount++;
            }
        }

        this.stats.totalKeys = this.cache.size;
        this.updateMemoryUsage();
        return deletedCount;
    }

    /**
     * Clear all cache entries
     */
    async clear(): Promise<void> {
        this.cache.clear();
        this.stats = {
            hits: 0,
            misses: 0,
            hitRate: 0,
            totalKeys: 0,
            memoryUsage: 0
        };
    }

    /**
     * Get cache statistics
     */
    getStats(): CacheStats {
        return { ...this.stats };
    }

    /**
     * Warm up cache with frequently accessed data
     */
    async warmUpCache(): Promise<void> {
        console.log('Starting cache warm-up...');

        // Pre-load frequently accessed data
        const warmUpTasks = [
            this.warmUpUserProfiles(),
            this.warmUpNutritionData(),
            this.warmUpSystemMetrics()
        ];

        await Promise.all(warmUpTasks);
        console.log('Cache warm-up completed');
    }

    /**
     * Optimize cache performance
     */
    async optimizeCache(): Promise<{
        entriesRemoved: number;
        memoryFreed: number;
        optimizationTime: number;
    }> {
        const startTime = Date.now();
        const initialSize = this.cache.size;
        const initialMemory = this.stats.memoryUsage;

        // Remove expired entries
        this.cleanupExpiredEntries();

        // Remove least recently used entries if cache is too large
        if (this.cache.size > 10000) {
            await this.evictLRUEntries(2000); // Remove 2000 oldest entries
        }

        const entriesRemoved = initialSize - this.cache.size;
        const memoryFreed = initialMemory - this.stats.memoryUsage;
        const optimizationTime = Date.now() - startTime;

        return {
            entriesRemoved,
            memoryFreed,
            optimizationTime
        };
    }

    private hashQuery(query: string, params: any[]): string {
        const combined = query + JSON.stringify(params);
        // Simple hash function for demo - in production, use a proper hash function
        let hash = 0;
        for (let i = 0; i < combined.length; i++) {
            const char = combined.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash.toString(36);
    }

    private updateHitRate(): void {
        const total = this.stats.hits + this.stats.misses;
        this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
    }

    private updateMemoryUsage(): void {
        // Rough estimation of memory usage
        let totalSize = 0;
        for (const [key, entry] of this.cache) {
            totalSize += key.length * 2; // Approximate string size
            totalSize += JSON.stringify(entry.data).length * 2;
            totalSize += 64; // Overhead for entry object
        }
        this.stats.memoryUsage = totalSize;
    }

    private startCleanupInterval(): void {
        // Clean up expired entries every 5 minutes
        setInterval(() => {
            this.cleanupExpiredEntries();
        }, 5 * 60 * 1000);
    }

    private cleanupExpiredEntries(): void {
        const now = Date.now();
        const keysToDelete: string[] = [];

        for (const [key, entry] of this.cache) {
            if (now > entry.timestamp + (entry.ttl * 1000)) {
                keysToDelete.push(key);
            }
        }

        for (const key of keysToDelete) {
            this.cache.delete(key);
        }

        this.stats.totalKeys = this.cache.size;
        this.updateMemoryUsage();
    }

    private async evictLRUEntries(count: number): Promise<void> {
        // Sort entries by timestamp (oldest first)
        const entries = Array.from(this.cache.entries())
            .sort(([, a], [, b]) => a.timestamp - b.timestamp);

        // Remove the oldest entries
        for (let i = 0; i < Math.min(count, entries.length); i++) {
            this.cache.delete(entries[i][0]);
        }

        this.stats.totalKeys = this.cache.size;
        this.updateMemoryUsage();
    }

    private async warmUpUserProfiles(): Promise<void> {
        // In real implementation, this would pre-load frequently accessed user profiles
        console.log('Warming up user profiles cache...');
    }

    private async warmUpNutritionData(): Promise<void> {
        // In real implementation, this would pre-load common nutrition data
        console.log('Warming up nutrition data cache...');
    }

    private async warmUpSystemMetrics(): Promise<void> {
        // In real implementation, this would pre-load system metrics
        console.log('Warming up system metrics cache...');
    }
}

export default CachingService;