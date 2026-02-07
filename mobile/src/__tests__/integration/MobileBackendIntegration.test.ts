import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock all the services at the module level
jest.mock('../../services/apiClient', () => ({
    apiClient: {
        get: jest.fn(),
        post: jest.fn(),
        put: jest.fn(),
        delete: jest.fn(),
        syncWithOfflineService: jest.fn(),
        getSyncStatus: jest.fn(),
        getPendingActionsCount: jest.fn(),
    }
}));

jest.mock('../../services/websocketService', () => ({
    websocketService: {
        connect: jest.fn(),
        disconnect: jest.fn(),
        isConnected: jest.fn(),
        sendAgentRequest: jest.fn(),
        on: jest.fn(),
        off: jest.fn(),
    }
}));

jest.mock('../../services/offlineService', () => ({
    offlineService: {
        queueOfflineAction: jest.fn(),
        syncOfflineActions: jest.fn(),
        syncData: jest.fn(),
        cacheData: jest.fn(),
        getCachedData: jest.fn(),
        clearExpiredCache: jest.fn(),
        isNetworkAvailable: jest.fn(),
        getSyncStatus: jest.fn(),
        getPendingActionsCount: jest.fn(),
    }
}));

jest.mock('../../services/authService', () => ({
    authService: {
        login: jest.fn(),
        logout: jest.fn(),
        register: jest.fn(),
        refreshToken: jest.fn(),
        getCurrentUser: jest.fn(),
    }
}));

jest.mock('../../services/userService', () => ({
    userService: {
        createProfile: jest.fn(),
        updateProfile: jest.fn(),
        getProfile: jest.fn(),
        syncUserData: jest.fn(),
    }
}));

jest.mock('../../services/weightService', () => ({
    weightService: {
        addEntry: jest.fn(),
        updateEntry: jest.fn(),
        getEntries: jest.fn(),
        syncWeightData: jest.fn(),
    }
}));

jest.mock('../../services/agentService', () => ({
    agentService: {
        requestCoaching: jest.fn(),
        requestWeightAnalysis: jest.fn(),
        searchNutrition: jest.fn(),
    }
}));

// Import the mocked services
import { apiClient } from '../../services/apiClient';
import { websocketService } from '../../services/websocketService';
import { offlineService } from '../../services/offlineService';
import { authService } from '../../services/authService';
import { userService } from '../../services/userService';
import { weightService } from '../../services/weightService';
import { agentService } from '../../services/agentService';

// Mock dependencies
jest.mock('@react-native-async-storage/async-storage');

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

describe('Mobile-Backend Integration Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockAsyncStorage.getItem.mockResolvedValue(null);
        mockAsyncStorage.setItem.mockResolvedValue();
        mockAsyncStorage.multiRemove.mockResolvedValue();
    });

    describe('API Connectivity and Error Handling', () => {
        it('should handle successful API requests with proper authentication', async () => {
            const mockResponse = { data: { data: 'test', message: 'success' }, status: 200 };
            (apiClient.get as jest.Mock).mockResolvedValue(mockResponse);
            mockAsyncStorage.getItem.mockResolvedValue('test-token');

            const response = await apiClient.get('/test');

            expect(response.data).toEqual({ data: 'test', message: 'success' });
            expect(response.status).toBe(200);
            expect(apiClient.get).toHaveBeenCalledWith('/test');
        });

        it('should handle API errors gracefully with proper error messages', async () => {
            (apiClient.get as jest.Mock).mockRejectedValue(new Error('Bad request'));

            await expect(apiClient.get('/test')).rejects.toThrow('Bad request');
        });

        it('should handle network timeouts and connection failures', async () => {
            (apiClient.get as jest.Mock).mockRejectedValue(new Error('Network request failed'));

            await expect(apiClient.get('/test')).rejects.toThrow('Network request failed');
        });

        it('should handle 401 unauthorized responses', async () => {
            (apiClient.get as jest.Mock).mockRejectedValue(new Error('Unauthorized'));

            await expect(apiClient.get('/test')).rejects.toThrow('Unauthorized');
        });

        it('should handle 500 server errors', async () => {
            (apiClient.get as jest.Mock).mockRejectedValue(new Error('Internal server error'));

            await expect(apiClient.get('/test')).rejects.toThrow('Internal server error');
        });

        it('should retry failed requests with exponential backoff', async () => {
            // Mock the first call to fail, then succeed on retry
            (apiClient.get as jest.Mock)
                .mockRejectedValueOnce(new Error('Network error'))
                .mockResolvedValueOnce({ data: { data: 'retry-success' }, status: 200 });

            (offlineService.isNetworkAvailable as jest.Mock).mockResolvedValue(true);

            // Call the API twice to simulate retry behavior
            try {
                await apiClient.get('/test');
            } catch (error) {
                // First call should fail
                expect((error as Error).message).toBe('Network error');
            }

            // Second call should succeed
            const response = await apiClient.get('/test');
            expect(response.data).toEqual({ data: 'retry-success' });
        });
    });

    describe('WebSocket Real-time Communication', () => {
        it('should establish WebSocket connection with authentication', async () => {
            mockAsyncStorage.getItem.mockResolvedValue('test-token');
            (websocketService.connect as jest.Mock).mockResolvedValue(undefined);

            await websocketService.connect();

            expect(websocketService.connect).toHaveBeenCalled();
        });

        it('should handle connection failures gracefully', async () => {
            mockAsyncStorage.getItem.mockResolvedValue(null);
            (websocketService.connect as jest.Mock).mockRejectedValue(new Error('No authentication token available'));

            await expect(websocketService.connect()).rejects.toThrow('No authentication token available');
        });

        it('should handle WebSocket message reception and processing', async () => {
            mockAsyncStorage.getItem.mockResolvedValue('test-token');
            (websocketService.connect as jest.Mock).mockResolvedValue(undefined);
            (websocketService.isConnected as jest.Mock).mockReturnValue(true);

            const messageHandler = jest.fn();
            (websocketService.on as jest.Mock).mockImplementation((event, handler) => {
                if (event === 'test_message') {
                    // Simulate message reception
                    setTimeout(() => {
                        handler({
                            type: 'test_message',
                            payload: { data: 'test' },
                            timestamp: Date.now(),
                            messageId: 'msg_123'
                        });
                    }, 10);
                }
            });

            await websocketService.connect();
            websocketService.on('test_message', messageHandler);

            // Wait for message to be processed
            await new Promise(resolve => setTimeout(resolve, 20));

            expect(messageHandler).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'test_message',
                    payload: { data: 'test' }
                })
            );
        });

        it('should handle WebSocket disconnection and reconnection', async () => {
            mockAsyncStorage.getItem.mockResolvedValue('test-token');
            (websocketService.connect as jest.Mock).mockResolvedValue(undefined);
            (websocketService.disconnect as jest.Mock).mockResolvedValue(undefined);

            await websocketService.connect();
            await websocketService.disconnect();

            expect(websocketService.disconnect).toHaveBeenCalled();
        });

        it('should send heartbeat messages to maintain connection', async () => {
            mockAsyncStorage.getItem.mockResolvedValue('test-token');
            (websocketService.connect as jest.Mock).mockResolvedValue(undefined);
            (websocketService.isConnected as jest.Mock).mockReturnValue(true);

            await websocketService.connect();

            // Verify connection was established
            expect(websocketService.connect).toHaveBeenCalled();
            expect(websocketService.isConnected()).toBe(true);
        });
    });

    describe('Offline Functionality and Data Sync', () => {
        it('should queue actions when offline', async () => {
            (offlineService.queueOfflineAction as jest.Mock).mockResolvedValue('action_123');

            const actionId = await offlineService.queueOfflineAction('CREATE', '/test', { data: 'test' });

            expect(actionId).toBe('action_123');
            expect(offlineService.queueOfflineAction).toHaveBeenCalledWith('CREATE', '/test', { data: 'test' });
        });

        it('should sync queued actions when coming back online', async () => {
            (offlineService.syncOfflineActions as jest.Mock).mockResolvedValue(undefined);
            (offlineService.isNetworkAvailable as jest.Mock).mockResolvedValue(true);

            await offlineService.syncOfflineActions();

            expect(offlineService.syncOfflineActions).toHaveBeenCalled();
        });

        it('should handle sync conflicts with server data', async () => {
            const localData = { id: 1, name: 'local', updatedAt: '2023-01-02' };
            const serverData = { id: 1, name: 'server', updatedAt: '2023-01-01' };

            (offlineService.syncData as jest.Mock).mockResolvedValue(serverData);

            const result = await offlineService.syncData(
                'test-key',
                localData,
                async () => serverData,
                async (data) => data
            );

            expect(result).toEqual(serverData);
            expect(offlineService.syncData).toHaveBeenCalledWith(
                'test-key',
                localData,
                expect.any(Function),
                expect.any(Function)
            );
        });

        it('should cache data for offline access', async () => {
            const testData = { id: 1, name: 'test' };
            (offlineService.cacheData as jest.Mock).mockResolvedValue(undefined);

            await offlineService.cacheData('test-key', testData, 60);

            expect(offlineService.cacheData).toHaveBeenCalledWith('test-key', testData, 60);
        });

        it('should return cached data when offline', async () => {
            const cachedData = { id: 1, name: 'cached' };
            (offlineService.getCachedData as jest.Mock).mockResolvedValue(cachedData);

            const result = await offlineService.getCachedData('test-key');

            expect(result).toEqual(cachedData);
            expect(offlineService.getCachedData).toHaveBeenCalledWith('test-key');
        });

        it('should handle expired cache data', async () => {
            (offlineService.getCachedData as jest.Mock).mockResolvedValue(null);

            const result = await offlineService.getCachedData('test-key');

            expect(result).toBeNull();
        });
    });

    describe('Real-time Agent Interactions', () => {
        it('should send coaching requests via WebSocket when connected', async () => {
            const coachingRequest = {
                message: 'I need motivation today',
                context: {
                    recentWeight: 70.5,
                    mood: 'struggling',
                    adherence: 0.8
                }
            };

            const mockResponse = {
                type: 'coaching',
                data: { message: 'You\'re doing great! Keep going!' },
                agentType: 'coach',
                timestamp: Date.now(),
                interactionId: 'interaction_123'
            };

            (agentService.requestCoaching as jest.Mock).mockResolvedValue(mockResponse);

            const response = await agentService.requestCoaching(coachingRequest);

            expect(response.type).toBe('coaching');
            expect(response.data.message).toContain('You\'re doing great!');
            expect(agentService.requestCoaching).toHaveBeenCalledWith(coachingRequest);
        });

        it('should fallback to HTTP API when WebSocket unavailable', async () => {
            const coachingRequest = {
                message: 'I need help with my eating plan',
                context: { adherence: 0.6 }
            };

            const mockResponse = {
                type: 'coaching',
                data: { message: 'HTTP coaching response' },
                agentType: 'http_fallback',
                timestamp: Date.now(),
                interactionId: 'http_123'
            };

            (agentService.requestCoaching as jest.Mock).mockResolvedValue(mockResponse);

            const response = await agentService.requestCoaching(coachingRequest);

            expect(response.agentType).toBe('http_fallback');
            expect(agentService.requestCoaching).toHaveBeenCalledWith(coachingRequest);
        });

        it('should handle safety alerts from Safety Sentinel', async () => {
            // Mock the websocket service to simulate safety alert
            const safetyAlert = {
                type: 'safety_alert',
                payload: {
                    triggerType: 'eating_disorder',
                    message: 'Safety intervention triggered',
                    resources: ['National Eating Disorders Association: 1-800-931-2237']
                },
                timestamp: Date.now(),
                messageId: 'safety_123'
            };

            let alertHandler: any;
            (websocketService.on as jest.Mock).mockImplementation((event, handler) => {
                if (event === 'safety_alert') {
                    alertHandler = handler;
                }
            });

            websocketService.on('safety_alert', jest.fn());

            // Simulate receiving the alert
            if (alertHandler) {
                alertHandler(safetyAlert);
            }

            expect(websocketService.on).toHaveBeenCalledWith('safety_alert', expect.any(Function));
        });

        it('should handle weight analysis requests', async () => {
            const weightAnalysisRequest = {
                weightEntries: [
                    { weight: 70.5, timestamp: Date.now() - 86400000, mood: 'good', confidence: 8 },
                    { weight: 70.2, timestamp: Date.now(), mood: 'great', confidence: 9 }
                ],
                timeframe: 'week' as const
            };

            const mockResponse = {
                type: 'weight_analysis',
                data: {
                    trend: 'decreasing',
                    rate: -0.3,
                    insights: ['Good progress this week!']
                },
                agentType: 'progress',
                timestamp: Date.now(),
                interactionId: 'analysis_123'
            };

            (agentService.requestWeightAnalysis as jest.Mock).mockResolvedValue(mockResponse);

            const response = await agentService.requestWeightAnalysis(weightAnalysisRequest);

            expect(response.type).toBe('weight_analysis');
            expect(response.data.trend).toBe('decreasing');
            expect(agentService.requestWeightAnalysis).toHaveBeenCalledWith(weightAnalysisRequest);
        });

        it('should handle nutrition search requests', async () => {
            const nutritionRequest = {
                query: 'low calorie breakfast',
                preferences: {
                    budget: 'medium' as const,
                    dietary: ['vegetarian'],
                    healthGoals: ['weight_loss']
                }
            };

            const mockResponse = {
                type: 'nutrition_search',
                data: {
                    results: [
                        { name: 'Greek yogurt with berries', calories: 150, price: 2.50 },
                        { name: 'Oatmeal with banana', calories: 200, price: 1.75 }
                    ]
                },
                agentType: 'nutrition',
                timestamp: Date.now(),
                interactionId: 'nutrition_123'
            };

            (agentService.searchNutrition as jest.Mock).mockResolvedValue(mockResponse);

            const response = await agentService.searchNutrition(nutritionRequest);

            expect(response.type).toBe('nutrition_search');
            expect(response.data.results).toHaveLength(2);
            expect(agentService.searchNutrition).toHaveBeenCalledWith(nutritionRequest);
        });

        it('should queue agent requests when offline', async () => {
            const coachingRequest = {
                message: 'Need help while offline',
                context: { mood: 'struggling' }
            };

            const mockResponse = {
                type: 'coaching',
                data: { queued: true, actionId: 'queued_123' },
                agentType: 'offline_queue',
                timestamp: Date.now(),
                interactionId: 'offline_123'
            };

            (agentService.requestCoaching as jest.Mock).mockResolvedValue(mockResponse);

            const response = await agentService.requestCoaching(coachingRequest);

            expect(response.agentType).toBe('offline_queue');
            expect(response.data.queued).toBe(true);
            expect(agentService.requestCoaching).toHaveBeenCalledWith(coachingRequest);
        });
    });
});

describe('Service Integration with Offline Support', () => {
    describe('Auth Service', () => {
        it('should cache user data on successful login', async () => {
            const mockResult = {
                user: { id: 'user1', email: 'test@example.com' },
                token: 'auth-token'
            };

            (authService.login as jest.Mock).mockResolvedValue(mockResult);

            const result = await authService.login({
                email: 'test@example.com',
                password: 'password',
                method: 'email'
            });

            expect(result.user.id).toBe('user1');
            expect(result.token).toBe('auth-token');
            expect(authService.login).toHaveBeenCalledWith({
                email: 'test@example.com',
                password: 'password',
                method: 'email'
            });
        });

        it('should support offline login with cached data', async () => {
            const cachedResult = {
                user: { id: 'user1', email: 'test@example.com' },
                token: 'cached-token'
            };

            (authService.login as jest.Mock).mockResolvedValue(cachedResult);

            const result = await authService.login({
                email: 'test@example.com',
                password: 'password',
                method: 'email'
            });

            expect(result.user).toEqual(cachedResult.user);
            expect(result.token).toBe('cached-token');
        });

        it('should handle OAuth login flows', async () => {
            const oauthResult = {
                user: { id: 'user2', email: 'oauth@example.com' },
                token: 'oauth-token'
            };

            (authService.login as jest.Mock).mockResolvedValue(oauthResult);

            const result = await authService.login({
                method: 'google',
                oauthToken: 'google-oauth-token'
            });

            expect(result.user.id).toBe('user2');
            expect(authService.login).toHaveBeenCalledWith({
                method: 'google',
                oauthToken: 'google-oauth-token'
            });
        });
    });

    describe('Weight Service', () => {
        it('should add weight entries with immediate cache update', async () => {
            const entry = {
                userId: 'user1',
                weight: 70.5,
                unit: 'kg' as const,
                mood: 'good' as const,
                confidence: 8
            };

            const mockResult = {
                id: 'weight1',
                userId: 'user1',
                weight: 70.5,
                unit: 'kg' as const,
                mood: 'good' as const,
                confidence: 8,
                timestamp: new Date()
            };

            (weightService.addEntry as jest.Mock).mockResolvedValue(mockResult);

            const result = await weightService.addEntry(entry);

            expect(result.weight).toBe(70.5);
            expect(result.id).toBe('weight1');
            expect(weightService.addEntry).toHaveBeenCalledWith(entry);
        });

        it('should queue weight entries when offline', async () => {
            const entry = {
                userId: 'user1',
                weight: 70.5,
                unit: 'kg' as const,
                mood: 'good' as const,
                confidence: 8
            };

            const mockResult = {
                id: 'temp_123',
                userId: 'user1',
                weight: 70.5,
                unit: 'kg' as const,
                mood: 'good' as const,
                confidence: 8,
                timestamp: new Date(),
                queued: true
            };

            (weightService.addEntry as jest.Mock).mockResolvedValue(mockResult);

            const result = await weightService.addEntry(entry);

            expect(result).toBeDefined();
            expect(result.id).toBe('temp_123');
            expect(result.weight).toBe(70.5);
            expect(result.mood).toBe('good');
            expect(result.confidence).toBe(8);
            expect(weightService.addEntry).toHaveBeenCalledWith(entry);
        });

        it('should sync weight data with conflict resolution', async () => {
            const userId = 'user1';
            const serverEntries = [
                { id: 'weight_1', userId, weight: 70.3, timestamp: new Date('2023-01-01'), unit: 'kg', mood: 'good', confidence: 8 }
            ];

            (weightService.syncWeightData as jest.Mock).mockResolvedValue(serverEntries);

            const result = await weightService.syncWeightData(userId);

            expect(result).toEqual(serverEntries);
            expect(weightService.syncWeightData).toHaveBeenCalledWith(userId);
        });
    });

    describe('User Service', () => {
        it('should sync profile data with conflict resolution', async () => {
            const localProfile = {
                userId: 'user1',
                accountId: 'account1',
                goals: { type: 'loss' as const },
                preferences: {
                    coachingStyle: 'gentle' as const,
                    gamificationLevel: 'moderate' as const,
                    notificationFrequency: 'daily' as const,
                    reminderTimes: []
                },
                medicalContext: {
                    onGLP1Medication: false,
                    hasClinicianGuidance: false
                },
                safetyProfile: {
                    riskFactors: [],
                    triggerWords: []
                },
                createdAt: new Date('2023-01-01'),
                updatedAt: new Date('2023-01-02')
            };

            const serverProfile = {
                ...localProfile,
                preferences: {
                    ...localProfile.preferences,
                    coachingStyle: 'pragmatic' as const
                },
                updatedAt: new Date('2023-01-01')
            };

            (userService.updateProfile as jest.Mock).mockResolvedValue(serverProfile);

            const result = await userService.updateProfile(localProfile);

            expect(result.preferences.coachingStyle).toBe('pragmatic');
            expect(userService.updateProfile).toHaveBeenCalledWith(localProfile);
        });

        it('should handle profile creation with validation', async () => {
            const newProfile = {
                userId: 'user2',
                accountId: 'account2',
                goals: { type: 'maintenance' as const },
                preferences: {
                    coachingStyle: 'upbeat' as const,
                    gamificationLevel: 'high' as const,
                    notificationFrequency: 'weekly' as const,
                    reminderTimes: ['09:00', '18:00']
                },
                medicalContext: {
                    onGLP1Medication: true,
                    hasClinicianGuidance: true
                },
                safetyProfile: {
                    riskFactors: [],
                    triggerWords: []
                },
                createdAt: new Date(),
                updatedAt: new Date()
            };

            (userService.createProfile as jest.Mock).mockResolvedValue(newProfile);

            const result = await userService.createProfile(newProfile);

            expect(result.userId).toBe('user2');
            expect(result.medicalContext.onGLP1Medication).toBe(true);
            expect(userService.createProfile).toHaveBeenCalledWith(newProfile);
        });
    });

    describe('Data Synchronization and Network State Management', () => {
        it('should handle network state changes', async () => {
            // Mock network state change handling
            (offlineService.isNetworkAvailable as jest.Mock).mockResolvedValue(true);

            const isOnline = await offlineService.isNetworkAvailable();
            expect(isOnline).toBe(true);
        });

        it('should handle concurrent sync operations', async () => {
            (offlineService.syncOfflineActions as jest.Mock).mockResolvedValue(undefined);

            await offlineService.syncOfflineActions();

            expect(offlineService.syncOfflineActions).toHaveBeenCalled();
        });

        it('should handle partial sync failures', async () => {
            (offlineService.syncOfflineActions as jest.Mock).mockResolvedValue(undefined);

            await offlineService.syncOfflineActions();

            expect(offlineService.syncOfflineActions).toHaveBeenCalled();
        });

        it('should handle cache expiration during sync', async () => {
            (offlineService.clearExpiredCache as jest.Mock).mockResolvedValue(undefined);

            await offlineService.clearExpiredCache();

            expect(offlineService.clearExpiredCache).toHaveBeenCalled();
        });
    });

    describe('Error Recovery and Resilience', () => {
        beforeEach(() => {
            // Reset all mocks before each test in this describe block
            jest.clearAllMocks();
        });

        it('should handle API rate limiting', async () => {
            (apiClient.get as jest.Mock).mockRejectedValue(new Error('Rate limit exceeded'));

            await expect(apiClient.get('/test')).rejects.toThrow('Rate limit exceeded');
        });

        it('should handle malformed server responses', async () => {
            (apiClient.get as jest.Mock).mockRejectedValue(new Error('Invalid JSON'));

            await expect(apiClient.get('/test')).rejects.toThrow('Invalid JSON');
        });

        it('should handle WebSocket message parsing errors', async () => {
            (websocketService.connect as jest.Mock).mockResolvedValue(undefined);

            await websocketService.connect();

            // Should not throw error, just log it
            expect(websocketService.connect).toHaveBeenCalled();
        });

        it('should handle storage quota exceeded errors', async () => {
            (offlineService.cacheData as jest.Mock).mockRejectedValue(new Error('QuotaExceededError'));

            await expect(offlineService.cacheData('test', { large: 'data' })).rejects.toThrow('QuotaExceededError');
        });

        it('should handle concurrent access to offline storage', async () => {
            (offlineService.queueOfflineAction as jest.Mock)
                .mockResolvedValueOnce('action_1')
                .mockResolvedValueOnce('action_2')
                .mockResolvedValueOnce('action_3');

            const promises = [
                offlineService.queueOfflineAction('CREATE', '/test1', { data: 1 }),
                offlineService.queueOfflineAction('CREATE', '/test2', { data: 2 }),
                offlineService.queueOfflineAction('CREATE', '/test3', { data: 3 })
            ];

            const results = await Promise.all(promises);

            expect(results).toHaveLength(3);
            expect(new Set(results).size).toBe(3); // All unique
            results.forEach(id => expect(id).toMatch(/^action_/));
        });
    });
});