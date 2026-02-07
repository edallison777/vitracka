import { WeightEntry } from '@/types/user';
import { apiClient } from './apiClient';
import { offlineService } from './offlineService';

class WeightService {
    private readonly CACHE_KEYS = {
        WEIGHT_ENTRIES: (userId: string) => `weight_entries_${userId}`,
        WEIGHT_TRENDS: (userId: string, days: number) => `weight_trends_${userId}_${days}`,
        RECENT_ENTRIES: (userId: string) => `recent_weight_entries_${userId}`
    };

    async getEntries(userId: string): Promise<WeightEntry[]> {
        const cacheKey = this.CACHE_KEYS.WEIGHT_ENTRIES(userId);

        const response = await apiClient.get(`/users/${userId}/weight-entries`, {
            cacheKey,
            cacheTTL: 30 // Cache for 30 minutes
        });

        return response.data as WeightEntry[];
    }

    async addEntry(entry: Omit<WeightEntry, 'id' | 'timestamp'>): Promise<WeightEntry> {
        const entryWithTimestamp = {
            ...entry,
            timestamp: new Date() // Use Date object directly
        };

        // Add to local cache immediately for instant UI feedback
        const cacheKey = this.CACHE_KEYS.WEIGHT_ENTRIES(entry.userId);
        const cachedEntries = await offlineService.getCachedData(cacheKey) || [];
        const tempId = `temp_${Date.now()}`;
        const tempEntry = {
            ...entryWithTimestamp,
            id: tempId
        };

        // Add to cache with temporary ID - ensure cachedEntries is an array
        const entriesArray = Array.isArray(cachedEntries) ? cachedEntries : [];
        const updatedEntries = [...entriesArray, tempEntry];
        await offlineService.cacheData(cacheKey, updatedEntries, 30);

        try {
            const response = await apiClient.post('/weight-entries', entryWithTimestamp);

            // Check if the response is a queued action (offline scenario)
            if (response.status === 202 && (response.data as any).queued) {
                // This is an offline queued action, return the temporary entry
                return tempEntry;
            }

            // Replace temporary entry with real entry from server
            const serverEntry = response.data as WeightEntry;
            const finalEntries = updatedEntries.map(e =>
                e.id === tempId ? serverEntry : e
            );
            await offlineService.cacheData(cacheKey, finalEntries, 30);

            // Update recent entries cache
            await this.updateRecentEntriesCache(entry.userId, serverEntry);

            return serverEntry;
        } catch (error) {
            // If offline or request fails, keep the temporary entry
            const isOnline = await offlineService.isNetworkAvailable();
            if (!isOnline) {
                // Queue for sync when online
                await offlineService.queueOfflineAction('CREATE', '/weight-entries', entryWithTimestamp);
                return tempEntry;
            }

            // Remove temporary entry if online request failed
            const revertedEntries = entriesArray; // Use entriesArray instead of cachedEntries
            await offlineService.cacheData(cacheKey, revertedEntries, 30);
            throw error;
        }
    }

    async updateEntry(entry: WeightEntry): Promise<WeightEntry> {
        const cacheKey = this.CACHE_KEYS.WEIGHT_ENTRIES(entry.userId);

        // Update local cache immediately
        const cachedEntries = await offlineService.getCachedData(cacheKey) || [];
        const entriesArray = Array.isArray(cachedEntries) ? cachedEntries : [];
        const updatedEntries = entriesArray.map((e: WeightEntry) =>
            e.id === entry.id ? { ...entry, updatedAt: new Date().toISOString() } : e
        );
        await offlineService.cacheData(cacheKey, updatedEntries, 30);

        try {
            const response = await apiClient.put(`/weight-entries/${entry.id}`, entry);

            // Update cache with server response
            const serverEntry = response.data as WeightEntry;
            const finalEntries = updatedEntries.map((e: WeightEntry) =>
                e.id === entry.id ? serverEntry : e
            );
            await offlineService.cacheData(cacheKey, finalEntries, 30);

            return serverEntry;
        } catch (error) {
            const isOnline = await offlineService.isNetworkAvailable();
            if (!isOnline) {
                // Queue for sync when online
                await offlineService.queueOfflineAction('UPDATE', `/weight-entries/${entry.id}`, entry);
                return entry;
            }
            throw error;
        }
    }

    async deleteEntry(entryId: string, userId: string): Promise<void> {
        const cacheKey = this.CACHE_KEYS.WEIGHT_ENTRIES(userId);

        // Remove from local cache immediately
        const cachedEntries = await offlineService.getCachedData(cacheKey) || [];
        const entriesArray = Array.isArray(cachedEntries) ? cachedEntries : [];
        const updatedEntries = entriesArray.filter((e: WeightEntry) => e.id !== entryId);
        await offlineService.cacheData(cacheKey, updatedEntries, 30);

        try {
            await apiClient.delete(`/weight-entries/${entryId}`);
        } catch (error) {
            const isOnline = await offlineService.isNetworkAvailable();
            if (!isOnline) {
                // Queue for sync when online
                await offlineService.queueOfflineAction('DELETE', `/weight-entries/${entryId}`);
                return;
            }

            // Restore entry if online request failed
            await offlineService.cacheData(cacheKey, cachedEntries, 30);
            throw error;
        }
    }

    async getWeightTrends(userId: string, days: number = 30): Promise<any> {
        const cacheKey = this.CACHE_KEYS.WEIGHT_TRENDS(userId, days);

        const response = await apiClient.get(`/users/${userId}/weight-trends?days=${days}`, {
            cacheKey,
            cacheTTL: 60 // Cache trends for 1 hour
        });

        return response.data;
    }

    // Offline-specific methods
    async getCachedEntries(userId: string): Promise<WeightEntry[]> {
        const cacheKey = this.CACHE_KEYS.WEIGHT_ENTRIES(userId);
        const cached = await offlineService.getCachedData(cacheKey);
        return (cached as WeightEntry[]) || [];
    }

    async getRecentEntries(userId: string, limit: number = 7): Promise<WeightEntry[]> {
        const cacheKey = this.CACHE_KEYS.RECENT_ENTRIES(userId);

        try {
            const response = await apiClient.get(`/users/${userId}/weight-entries/recent?limit=${limit}`, {
                cacheKey,
                cacheTTL: 15 // Cache recent entries for 15 minutes
            });
            return response.data as WeightEntry[];
        } catch (error) {
            // Fallback to cached entries
            const allEntries = await this.getCachedEntries(userId);
            return allEntries
                .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                .slice(0, limit);
        }
    }

    private async updateRecentEntriesCache(userId: string, newEntry: WeightEntry): Promise<void> {
        const cacheKey = this.CACHE_KEYS.RECENT_ENTRIES(userId);
        const recentEntries = await offlineService.getCachedData(cacheKey) || [];

        const updatedRecent = [newEntry, ...recentEntries]
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, 10); // Keep last 10 entries

        await offlineService.cacheData(cacheKey, updatedRecent, 15);
    }

    async syncWeightData(userId: string): Promise<void> {
        const isOnline = await offlineService.isNetworkAvailable();
        if (!isOnline) return;

        try {
            // Sync weight entries
            const cacheKey = this.CACHE_KEYS.WEIGHT_ENTRIES(userId);
            const response = await apiClient.get(`/users/${userId}/weight-entries`, {
                cacheKey,
                cacheTTL: 30
            });

            const weightEntries = response.data as WeightEntry[];

            // Update recent entries cache
            const recentEntries = weightEntries
                .sort((a: WeightEntry, b: WeightEntry) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                .slice(0, 10);

            const recentCacheKey = this.CACHE_KEYS.RECENT_ENTRIES(userId);
            await offlineService.cacheData(recentCacheKey, recentEntries, 15);

        } catch (error) {
            console.warn('Failed to sync weight data:', error);
        }
    }

    // Analytics methods with offline support
    async calculateLocalTrends(userId: string, days: number = 30): Promise<any> {
        const entries = await this.getCachedEntries(userId);
        const cutoffDate = Date.now() - (days * 24 * 60 * 60 * 1000);

        const recentEntries = entries
            .filter(entry => new Date(entry.timestamp).getTime() >= cutoffDate)
            .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

        if (recentEntries.length < 2) {
            return {
                trend: 'insufficient_data',
                change: 0,
                entries: recentEntries.length
            };
        }

        const firstWeight = recentEntries[0].weight;
        const lastWeight = recentEntries[recentEntries.length - 1].weight;
        const change = lastWeight - firstWeight;

        return {
            trend: change < -0.5 ? 'losing' : change > 0.5 ? 'gaining' : 'stable',
            change: Math.round(change * 10) / 10,
            entries: recentEntries.length,
            averageWeight: Math.round((recentEntries.reduce((sum, e) => sum + e.weight, 0) / recentEntries.length) * 10) / 10
        };
    }
}

export const weightService = new WeightService();