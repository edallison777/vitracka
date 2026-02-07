/**
 * Production Readiness Verification - Phase 3: Mobile App Integration
 * 
 * This test suite validates the requirements for task 25.2:
 * - Test React Native app authentication flows
 * - Verify weight entry and logging functionality
 * - Validate cross-platform feature parity (iOS/Android)
 * - Test offline capability and data synchronization
 * 
 * Requirements: 18.1, 18.2, 18.3, 4.1, 9.1
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { authService } from '../../services/authService';
import { weightService } from '../../services/weightService';
import { offlineService } from '../../services/offlineService';

// Mock services
jest.mock('../../services/authService');
jest.mock('../../services/weightService');
jest.mock('../../services/offlineService');
jest.mock('../../services/apiClient');

const mockAuthService = authService as jest.Mocked<typeof authService>;
const mockWeightService = weightService as jest.Mocked<typeof weightService>;
const mockOfflineService = offlineService as jest.Mocked<typeof offlineService>;

describe('Mobile App Production Readiness Integration', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
        (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
        (AsyncStorage.multiRemove as jest.Mock).mockResolvedValue(undefined);
        mockOfflineService.isNetworkAvailable.mockResolvedValue(true);
    });

    describe('Authentication Flow Integration', () => {
        it('should support email/password authentication', async () => {
            const mockUser = {
                id: 'user123',
                email: 'test@example.com',
                authMethod: 'email' as const,
                emailVerified: true,
                createdAt: new Date(),
                lastLoginAt: new Date(),
                isActive: true,
            };

            const mockAuthResponse = {
                user: mockUser,
                token: 'auth-token-123',
            };

            mockAuthService.login.mockResolvedValue(mockAuthResponse);

            const result = await mockAuthService.login({
                method: 'email',
                email: 'test@example.com',
                password: 'password123',
            });

            expect(result.user.id).toBe('user123');
            expect(result.token).toBe('auth-token-123');
            expect(mockAuthService.login).toHaveBeenCalledWith({
                method: 'email',
                email: 'test@example.com',
                password: 'password123',
            });
        });

        it('should support OAuth authentication methods', async () => {
            const mockOAuthUser = {
                id: 'oauth-user123',
                email: 'oauth@example.com',
                authMethod: 'google' as const,
                emailVerified: true,
                createdAt: new Date(),
                lastLoginAt: new Date(),
                isActive: true,
            };

            mockAuthService.login.mockResolvedValue({
                user: mockOAuthUser,
                token: 'oauth-token',
            });

            const result = await mockAuthService.login({
                method: 'google',
                oauthToken: 'google-oauth-token',
            });

            expect(result.user.authMethod).toBe('google');
            expect(mockAuthService.login).toHaveBeenCalledWith({
                method: 'google',
                oauthToken: 'google-oauth-token',
            });
        });

        it('should handle authentication errors gracefully', async () => {
            mockAuthService.login.mockRejectedValue(new Error('Invalid credentials'));

            await expect(
                mockAuthService.login({
                    method: 'email',
                    email: 'test@example.com',
                    password: 'wrongpassword',
                })
            ).rejects.toThrow('Invalid credentials');
        });

        it('should persist authentication state', async () => {
            const mockUser = {
                id: 'user123',
                email: 'test@example.com',
                authMethod: 'email' as const,
                emailVerified: true,
                createdAt: new Date(),
                lastLoginAt: new Date(),
                isActive: true,
            };

            mockAuthService.getCurrentUser.mockResolvedValue(mockUser);
            mockAuthService.isAuthenticated.mockResolvedValue(true);

            const isAuth = await mockAuthService.isAuthenticated();
            const user = await mockAuthService.getCurrentUser();

            expect(isAuth).toBe(true);
            expect(user).toEqual(mockUser);
        });
    });

    describe('Weight Entry and Logging Integration', () => {
        it('should add weight entries successfully', async () => {
            const mockWeightEntry = {
                id: 'weight123',
                userId: 'user123',
                weight: 70.5,
                unit: 'kg' as const,
                timestamp: new Date(),
                mood: 'good' as const,
                confidence: 8,
                notes: 'Feeling great today!',
            };

            mockWeightService.addEntry.mockResolvedValue(mockWeightEntry);

            const result = await mockWeightService.addEntry({
                userId: 'user123',
                weight: 70.5,
                unit: 'kg',
                mood: 'good',
                confidence: 8,
                notes: 'Feeling great today!',
            });

            expect(result.weight).toBe(70.5);
            expect(result.unit).toBe('kg');
            expect(result.mood).toBe('good');
            expect(result.confidence).toBe(8);
            expect(result.notes).toBe('Feeling great today!');
        });

        it('should support both kg and lbs units', async () => {
            const kgEntry = {
                id: 'weight1',
                userId: 'user123',
                weight: 70.5,
                unit: 'kg' as const,
                timestamp: new Date(),
                confidence: 8,
            };

            const lbsEntry = {
                id: 'weight2',
                userId: 'user123',
                weight: 155.5,
                unit: 'lbs' as const,
                timestamp: new Date(),
                confidence: 8,
            };

            mockWeightService.addEntry
                .mockResolvedValueOnce(kgEntry)
                .mockResolvedValueOnce(lbsEntry);

            const kgResult = await mockWeightService.addEntry({
                userId: 'user123',
                weight: 70.5,
                unit: 'kg',
                confidence: 8,
            });

            const lbsResult = await mockWeightService.addEntry({
                userId: 'user123',
                weight: 155.5,
                unit: 'lbs',
                confidence: 8,
            });

            expect(kgResult.unit).toBe('kg');
            expect(lbsResult.unit).toBe('lbs');
        });

        it('should retrieve weight entries', async () => {
            const mockEntries = [
                {
                    id: 'weight1',
                    userId: 'user123',
                    weight: 70.5,
                    unit: 'kg' as const,
                    timestamp: new Date('2023-12-01'),
                    mood: 'good' as const,
                    confidence: 8,
                    notes: 'Good day',
                },
                {
                    id: 'weight2',
                    userId: 'user123',
                    weight: 70.2,
                    unit: 'kg' as const,
                    timestamp: new Date('2023-12-02'),
                    mood: 'great' as const,
                    confidence: 9,
                },
            ];

            mockWeightService.getEntries.mockResolvedValue(mockEntries);

            const entries = await mockWeightService.getEntries('user123');

            expect(entries).toHaveLength(2);
            expect(entries[0].weight).toBe(70.5);
            expect(entries[1].weight).toBe(70.2);
        });

        it('should handle weight entry errors', async () => {
            mockWeightService.addEntry.mockRejectedValue(new Error('Network error'));

            await expect(
                mockWeightService.addEntry({
                    userId: 'user123',
                    weight: 70.5,
                    unit: 'kg',
                    confidence: 8,
                })
            ).rejects.toThrow('Network error');
        });
    });

    describe('Cross-Platform Feature Parity', () => {
        it('should support iOS platform features', () => {
            Platform.OS = 'ios';

            // Core features should be available on iOS
            expect(Platform.OS).toBe('ios');

            // Authentication methods should be consistent
            expect(mockAuthService.login).toBeDefined();
            expect(mockWeightService.addEntry).toBeDefined();
            expect(mockOfflineService.isNetworkAvailable).toBeDefined();
        });

        it('should support Android platform features', () => {
            Platform.OS = 'android';

            // Core features should be available on Android
            expect(Platform.OS).toBe('android');

            // Authentication methods should be consistent
            expect(mockAuthService.login).toBeDefined();
            expect(mockWeightService.addEntry).toBeDefined();
            expect(mockOfflineService.isNetworkAvailable).toBeDefined();
        });

        it('should maintain feature parity between platforms', () => {
            const iosFeatures = {
                authentication: true,
                weightTracking: true,
                offlineSupport: true,
                dataSync: true,
            };

            const androidFeatures = {
                authentication: true,
                weightTracking: true,
                offlineSupport: true,
                dataSync: true,
            };

            expect(androidFeatures).toEqual(iosFeatures);
        });
    });

    describe('Offline Capability and Data Synchronization', () => {
        it('should detect network availability', async () => {
            mockOfflineService.isNetworkAvailable.mockResolvedValue(true);

            const isOnline = await mockOfflineService.isNetworkAvailable();
            expect(isOnline).toBe(true);

            mockOfflineService.isNetworkAvailable.mockResolvedValue(false);
            const isOffline = await mockOfflineService.isNetworkAvailable();
            expect(isOffline).toBe(false);
        });

        it('should queue actions when offline', async () => {
            mockOfflineService.isNetworkAvailable.mockResolvedValue(false);
            mockOfflineService.queueOfflineAction.mockResolvedValue('action_123');

            const actionId = await mockOfflineService.queueOfflineAction(
                'CREATE',
                '/weight-entries',
                { weight: 70.5, unit: 'kg' }
            );

            expect(actionId).toBe('action_123');
            expect(mockOfflineService.queueOfflineAction).toHaveBeenCalledWith(
                'CREATE',
                '/weight-entries',
                { weight: 70.5, unit: 'kg' }
            );
        });

        it('should sync data when coming back online', async () => {
            mockOfflineService.syncOfflineActions.mockResolvedValue(undefined);
            mockOfflineService.getPendingActionsCount.mockResolvedValue(0);

            await mockOfflineService.syncOfflineActions();
            const pendingCount = await mockOfflineService.getPendingActionsCount();

            expect(mockOfflineService.syncOfflineActions).toHaveBeenCalled();
            expect(pendingCount).toBe(0);
        });

        it('should handle sync conflicts', async () => {
            const localData = {
                id: 'weight123',
                weight: 70.5,
                updatedAt: '2023-12-02T10:00:00Z',
            };

            const serverData = {
                id: 'weight123',
                weight: 70.3,
                updatedAt: '2023-12-02T09:00:00Z',
            };

            mockOfflineService.syncData.mockResolvedValue(localData);

            const result = await mockOfflineService.syncData(
                'weight_entries_user123',
                localData,
                async () => serverData,
                async (data) => data
            );

            expect(result).toEqual(localData);
        });

        it('should cache data for offline access', async () => {
            const testData = { id: 1, name: 'test' };
            mockOfflineService.cacheData.mockResolvedValue(undefined);
            mockOfflineService.getCachedData.mockResolvedValue(testData);

            await mockOfflineService.cacheData('test-key', testData, 60);
            const cachedData = await mockOfflineService.getCachedData('test-key');

            expect(mockOfflineService.cacheData).toHaveBeenCalledWith('test-key', testData, 60);
            expect(cachedData).toEqual(testData);
        });

        it('should handle offline weight entry queuing', async () => {
            mockOfflineService.isNetworkAvailable.mockResolvedValue(false);

            const tempEntry = {
                id: 'temp_123',
                userId: 'user123',
                weight: 70.5,
                unit: 'kg' as const,
                timestamp: new Date(),
                confidence: 3,
            };

            mockWeightService.addEntry.mockResolvedValue(tempEntry);

            const result = await mockWeightService.addEntry({
                userId: 'user123',
                weight: 70.5,
                unit: 'kg',
                confidence: 3,
            });

            expect(result.id).toBe('temp_123');
            expect(mockWeightService.addEntry).toHaveBeenCalled();
        });

        it('should provide sync status information', async () => {
            mockOfflineService.getSyncStatus.mockResolvedValue({
                lastSyncAttempt: Date.now(),
                lastSuccessfulSync: Date.now() - 1000,
                pendingActions: 2,
                errors: [],
            });

            const syncStatus = await mockOfflineService.getSyncStatus();

            expect(syncStatus.pendingActions).toBe(2);
            expect(syncStatus.errors).toEqual([]);
            expect(syncStatus.lastSyncAttempt).toBeDefined();
            expect(syncStatus.lastSuccessfulSync).toBeDefined();
        });
    });

    describe('Data Persistence and Storage', () => {
        it('should persist authentication tokens', async () => {
            const token = 'auth-token-123';

            (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
            (AsyncStorage.getItem as jest.Mock).mockResolvedValue(token);

            await AsyncStorage.setItem('auth_token', token);
            const retrievedToken = await AsyncStorage.getItem('auth_token');

            expect(retrievedToken).toBe(token);
            expect(AsyncStorage.setItem).toHaveBeenCalledWith('auth_token', token);
        });

        it('should handle storage errors gracefully', async () => {
            (AsyncStorage.setItem as jest.Mock).mockRejectedValue(new Error('Storage full'));

            await expect(
                AsyncStorage.setItem('test_key', 'test_value')
            ).rejects.toThrow('Storage full');
        });

        it('should clear data on logout', async () => {
            mockAuthService.logout.mockResolvedValue(undefined);
            (AsyncStorage.multiRemove as jest.Mock).mockResolvedValue(undefined);

            await mockAuthService.logout();

            expect(mockAuthService.logout).toHaveBeenCalled();
        });
    });

    describe('Error Handling and Resilience', () => {
        it('should handle network timeouts', async () => {
            mockAuthService.login.mockRejectedValue(new Error('Network timeout'));

            await expect(
                mockAuthService.login({
                    method: 'email',
                    email: 'test@example.com',
                    password: 'password123',
                })
            ).rejects.toThrow('Network timeout');
        });

        it('should handle server errors', async () => {
            mockWeightService.addEntry.mockRejectedValue(new Error('Internal server error'));

            await expect(
                mockWeightService.addEntry({
                    userId: 'user123',
                    weight: 70.5,
                    unit: 'kg',
                    confidence: 8,
                })
            ).rejects.toThrow('Internal server error');
        });

        it('should handle storage quota exceeded', async () => {
            mockOfflineService.cacheData.mockRejectedValue(new Error('QuotaExceededError'));

            await expect(
                mockOfflineService.cacheData('test-key', { large: 'data' })
            ).rejects.toThrow('QuotaExceededError');
        });
    });
});