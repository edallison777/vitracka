import { UserSupportProfile } from '@/types/user';
import { apiClient } from './apiClient';
import { offlineService } from './offlineService';

class UserService {
    private readonly CACHE_KEYS = {
        USER_PROFILE: (userId: string) => `user_profile_${userId}`,
        USER_PREFERENCES: (userId: string) => `user_preferences_${userId}`
    };

    async getProfile(userId: string): Promise<UserSupportProfile> {
        const cacheKey = this.CACHE_KEYS.USER_PROFILE(userId);

        const response = await apiClient.get(`/users/${userId}/profile`, {
            cacheKey,
            cacheTTL: 60 // Cache for 1 hour
        });

        return response.data;
    }

    async createProfile(profileData: Omit<UserSupportProfile, 'createdAt' | 'updatedAt'>): Promise<UserSupportProfile> {
        const response = await apiClient.post('/users/profile', profileData);

        // Cache the created profile
        const cacheKey = this.CACHE_KEYS.USER_PROFILE(profileData.userId);
        await offlineService.cacheData(cacheKey, response.data, 60);

        return response.data;
    }

    async updateProfile(profile: Partial<UserSupportProfile>): Promise<UserSupportProfile> {
        if (!profile.userId) {
            throw new Error('User ID is required for profile update');
        }

        const cacheKey = this.CACHE_KEYS.USER_PROFILE(profile.userId);

        // Get current cached profile for offline sync
        const currentProfile = await offlineService.getCachedData(cacheKey);

        const response = await offlineService.syncData(
            cacheKey,
            { ...currentProfile, ...profile },
            async () => {
                const serverResponse = await apiClient.get(`/users/${profile.userId}/profile`);
                return serverResponse.data;
            },
            async (data) => {
                const updateResponse = await apiClient.put(`/users/${profile.userId}/profile`, data);
                return updateResponse.data;
            }
        );

        return response;
    }

    async deleteProfile(userId: string): Promise<void> {
        await apiClient.delete(`/users/${userId}/profile`);

        // Clear cached profile data
        const cacheKey = this.CACHE_KEYS.USER_PROFILE(userId);
        await offlineService.cacheData(cacheKey, null, 1); // Expire immediately
    }

    // Offline-specific methods
    async getCachedProfile(userId: string): Promise<UserSupportProfile | null> {
        const cacheKey = this.CACHE_KEYS.USER_PROFILE(userId);
        return await offlineService.getCachedData(cacheKey);
    }

    async updateProfileOffline(userId: string, updates: Partial<UserSupportProfile>): Promise<void> {
        const cacheKey = this.CACHE_KEYS.USER_PROFILE(userId);
        const currentProfile = await offlineService.getCachedData(cacheKey);

        if (currentProfile) {
            const updatedProfile = { ...currentProfile, ...updates, updatedAt: new Date().toISOString() };
            await offlineService.cacheData(cacheKey, updatedProfile, 60);

            // Queue the update for when we're back online
            await offlineService.queueOfflineAction(
                'UPDATE',
                `/users/${userId}/profile`,
                updates
            );
        }
    }

    async syncProfile(userId: string): Promise<UserSupportProfile | null> {
        const isOnline = await offlineService.isNetworkAvailable();
        if (!isOnline) {
            return this.getCachedProfile(userId);
        }

        try {
            const cacheKey = this.CACHE_KEYS.USER_PROFILE(userId);
            const response = await apiClient.get(`/users/${userId}/profile`, {
                cacheKey,
                cacheTTL: 60
            });

            return response.data;
        } catch (error) {
            console.warn('Failed to sync profile:', error);
            return this.getCachedProfile(userId);
        }
    }

    // Preferences management with offline support
    async updatePreferences(userId: string, preferences: any): Promise<void> {
        const cacheKey = this.CACHE_KEYS.USER_PREFERENCES(userId);

        // Update local cache immediately
        await offlineService.cacheData(cacheKey, preferences, 60);

        // Try to update server or queue for later
        const isOnline = await offlineService.isNetworkAvailable();
        if (isOnline) {
            try {
                await apiClient.put(`/users/${userId}/preferences`, preferences);
            } catch (error) {
                console.warn('Failed to update preferences on server, queuing for later:', error);
                await offlineService.queueOfflineAction('UPDATE', `/users/${userId}/preferences`, preferences);
            }
        } else {
            await offlineService.queueOfflineAction('UPDATE', `/users/${userId}/preferences`, preferences);
        }
    }

    async getPreferences(userId: string): Promise<any> {
        const cacheKey = this.CACHE_KEYS.USER_PREFERENCES(userId);

        const response = await apiClient.get(`/users/${userId}/preferences`, {
            cacheKey,
            cacheTTL: 120 // Cache preferences for 2 hours
        });

        return response.data;
    }
}

export const userService = new UserService();