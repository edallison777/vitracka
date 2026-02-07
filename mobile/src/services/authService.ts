import { LoginCredentials, RegisterCredentials, UserAccount } from '@/types/auth';
import { apiClient } from './apiClient';
import { offlineService } from './offlineService';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AuthResponse {
    user: UserAccount;
    token: string;
}

class AuthService {
    private readonly CACHE_KEYS = {
        USER_PROFILE: 'auth_user_profile',
        AUTH_STATUS: 'auth_status'
    };

    async login(credentials: LoginCredentials): Promise<AuthResponse> {
        try {
            const response = await apiClient.post('/auth/login', credentials, { skipOfflineQueue: true });

            // Store auth token and cache user data
            await AsyncStorage.setItem('auth_token', response.data.token);
            await offlineService.cacheData(this.CACHE_KEYS.USER_PROFILE, response.data.user, 1440); // 24 hours
            await offlineService.cacheData(this.CACHE_KEYS.AUTH_STATUS, { isAuthenticated: true }, 1440);

            return response.data;
        } catch (error) {
            // Check if we have cached auth data for offline login
            const isOnline = await offlineService.isNetworkAvailable();
            if (!isOnline) {
                const cachedUser = await offlineService.getCachedData(this.CACHE_KEYS.USER_PROFILE);
                const cachedToken = await AsyncStorage.getItem('auth_token');

                if (cachedUser && cachedToken) {
                    return {
                        user: cachedUser,
                        token: cachedToken
                    };
                }
            }
            throw error;
        }
    }

    async register(credentials: RegisterCredentials): Promise<AuthResponse> {
        if (credentials.password !== credentials.confirmPassword) {
            throw new Error('Passwords do not match');
        }

        const response = await apiClient.post('/auth/register', {
            email: credentials.email,
            password: credentials.password,
        }, { skipOfflineQueue: true }); // Registration cannot be queued

        // Store auth token and cache user data
        await AsyncStorage.setItem('auth_token', response.data.token);
        await offlineService.cacheData(this.CACHE_KEYS.USER_PROFILE, response.data.user, 1440);
        await offlineService.cacheData(this.CACHE_KEYS.AUTH_STATUS, { isAuthenticated: true }, 1440);

        return response.data;
    }

    async logout(): Promise<void> {
        try {
            await apiClient.post('/auth/logout', {}, { skipOfflineQueue: true });
        } catch (error) {
            // Continue with logout even if server request fails
            console.warn('Logout request failed, continuing with local logout:', error);
        }

        // Clear local auth data
        await AsyncStorage.multiRemove(['auth_token']);
        await offlineService.cacheData(this.CACHE_KEYS.AUTH_STATUS, { isAuthenticated: false }, 1);

        // Clear all offline data on logout for security
        await offlineService.clearOfflineData();
    }

    async refreshToken(): Promise<AuthResponse> {
        const response = await apiClient.post('/auth/refresh', {}, { skipOfflineQueue: true });

        // Update stored token and cache
        await AsyncStorage.setItem('auth_token', response.data.token);
        await offlineService.cacheData(this.CACHE_KEYS.USER_PROFILE, response.data.user, 1440);

        return response.data;
    }

    async verifyEmail(token: string): Promise<void> {
        await apiClient.post('/auth/verify-email', { token }, { skipOfflineQueue: true });
    }

    async requestPasswordReset(email: string): Promise<void> {
        await apiClient.post('/auth/forgot-password', { email }, { skipOfflineQueue: true });
    }

    async resetPassword(token: string, newPassword: string): Promise<void> {
        await apiClient.post('/auth/reset-password', { token, password: newPassword }, { skipOfflineQueue: true });
    }

    // Offline-aware methods
    async getCurrentUser(): Promise<UserAccount | null> {
        const cachedUser = await offlineService.getCachedData(this.CACHE_KEYS.USER_PROFILE);
        return cachedUser;
    }

    async isAuthenticated(): Promise<boolean> {
        const token = await AsyncStorage.getItem('auth_token');
        if (!token) return false;

        const authStatus = await offlineService.getCachedData(this.CACHE_KEYS.AUTH_STATUS);
        return authStatus?.isAuthenticated ?? false;
    }

    async syncAuthData(): Promise<void> {
        const isOnline = await offlineService.isNetworkAvailable();
        if (!isOnline) return;

        try {
            const response = await apiClient.get('/auth/me', {
                cacheKey: this.CACHE_KEYS.USER_PROFILE,
                cacheTTL: 1440
            });

            // Update cached user data
            await offlineService.cacheData(this.CACHE_KEYS.USER_PROFILE, response.data, 1440);
        } catch (error) {
            console.warn('Failed to sync auth data:', error);
        }
    }
}

export const authService = new AuthService();