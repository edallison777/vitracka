import AsyncStorage from '@react-native-async-storage/async-storage';
import { offlineService } from './offlineService';

const API_BASE_URL = __DEV__
    ? 'http://localhost:3000/api'
    : 'https://api.vitracka.com/api';

interface ApiResponse<T = any> {
    data: T;
    status: number;
    message?: string;
}

interface RequestOptions extends RequestInit {
    skipOfflineQueue?: boolean;
    cacheKey?: string;
    cacheTTL?: number;
}

class ApiClient {
    private baseURL: string;

    constructor(baseURL: string) {
        this.baseURL = baseURL;
    }

    private async getAuthToken(): Promise<string | null> {
        try {
            const token = await AsyncStorage.getItem('auth_token');
            return token;
        } catch (error) {
            console.error('Error getting auth token:', error);
            return null;
        }
    }

    private async request<T>(
        endpoint: string,
        options: RequestOptions = {}
    ): Promise<ApiResponse<T>> {
        const { skipOfflineQueue = false, cacheKey, cacheTTL, ...requestOptions } = options;
        const url = `${this.baseURL}${endpoint}`;
        const token = await this.getAuthToken();

        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            ...(requestOptions.headers as Record<string, string> || {}),
        };

        if (token) {
            headers.Authorization = `Bearer ${token}`;
        }

        // Check if we're offline and this is a read operation
        const isOnline = await offlineService.isNetworkAvailable();
        const isReadOperation = !requestOptions.method || requestOptions.method === 'GET';

        if (!isOnline && isReadOperation && cacheKey) {
            // Try to return cached data for read operations when offline
            const cachedData = await offlineService.getCachedData(cacheKey);
            if (cachedData) {
                return {
                    data: cachedData,
                    status: 200,
                    message: 'Data from cache (offline)'
                };
            }
        }

        if (!isOnline && !isReadOperation && !skipOfflineQueue) {
            // Queue write operations when offline
            const actionId = await offlineService.queueOfflineAction(
                requestOptions.method === 'POST' ? 'CREATE' :
                    requestOptions.method === 'PUT' ? 'UPDATE' : 'DELETE',
                endpoint,
                requestOptions.body ? JSON.parse(requestOptions.body as string) : undefined
            );

            // Return a placeholder response for queued actions
            return {
                data: { queued: true, actionId } as T,
                status: 202,
                message: 'Action queued for sync when online'
            };
        }

        try {
            const response = await fetch(url, {
                ...requestOptions,
                headers,
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || `HTTP error! status: ${response.status}`);
            }

            // Cache successful read operations
            if (isReadOperation && cacheKey && cacheTTL) {
                await offlineService.cacheData(cacheKey, data, cacheTTL);
            }

            return {
                data,
                status: response.status,
                message: data.message,
            };
        } catch (error) {
            console.error('API request failed:', error);

            // If online request fails and we have cached data, return it
            if (isReadOperation && cacheKey) {
                const cachedData = await offlineService.getCachedData(cacheKey);
                if (cachedData) {
                    return {
                        data: cachedData,
                        status: 200,
                        message: 'Data from cache (request failed)'
                    };
                }
            }

            throw error;
        }
    }

    async get<T>(endpoint: string, options: { cacheKey?: string; cacheTTL?: number } = {}): Promise<ApiResponse<T>> {
        return this.request<T>(endpoint, {
            method: 'GET',
            cacheKey: options.cacheKey,
            cacheTTL: options.cacheTTL || 60 // Default 60 minutes cache
        });
    }

    async post<T>(endpoint: string, data?: any, options: { skipOfflineQueue?: boolean } = {}): Promise<ApiResponse<T>> {
        return this.request<T>(endpoint, {
            method: 'POST',
            body: data ? JSON.stringify(data) : undefined,
            skipOfflineQueue: options.skipOfflineQueue
        });
    }

    async put<T>(endpoint: string, data?: any, options: { skipOfflineQueue?: boolean } = {}): Promise<ApiResponse<T>> {
        return this.request<T>(endpoint, {
            method: 'PUT',
            body: data ? JSON.stringify(data) : undefined,
            skipOfflineQueue: options.skipOfflineQueue
        });
    }

    async delete<T>(endpoint: string, options: { skipOfflineQueue?: boolean } = {}): Promise<ApiResponse<T>> {
        return this.request<T>(endpoint, {
            method: 'DELETE',
            skipOfflineQueue: options.skipOfflineQueue
        });
    }

    // Sync methods for offline integration
    async syncWithOfflineService(): Promise<void> {
        await offlineService.syncOfflineActions();
    }

    async getSyncStatus() {
        return offlineService.getSyncStatus();
    }

    async getPendingActionsCount(): Promise<number> {
        return offlineService.getPendingActionsCount();
    }
}

export const apiClient = new ApiClient(API_BASE_URL);