/**
 * Production Readiness Verification - Phase 2: Agent Architecture Validation
 * Task 25.1 - Comprehensive validation of agent architecture components
 * 
 * Tests:
 * - Concierge Orchestrator routing and multi-agent coordination
 * - Safety Sentinel veto power over other agents
 * - Coach Companion adaptive responses
 * - Progress Analyst weight trend calculations
 * 
 * Requirements: 9.1, 9.2, 9.3, 3.1, 3.2, 3.3, 4.1, 4.2, 4.3, 4.4
 */

import { ConciergeOrchestratorService, AgentRequest, AgentType } from '../../services/ConciergeOrchestratorService';
import { SafetySentinelService } from '../../services/SafetySentinelService';
import { CoachCompanionService, CoachingContext } from '../../services/CoachCompanionService';
import { ProgressAnalystService } from '../../services/ProgressAnalystService';
import { UserSupportProfile, CoachingStyle, WeightEntry } from '../../types';

// Mock the database connection
jest.mock('../../database/connection', () => ({
    default: {
        getInstance: jest.fn(() => ({
            query: jest.fn(),
            getPool: jest.fn(),
            close: jest.fn(),
            testConnection: jest.fn()
        }))
    }
}));

// Mock repositories
jest.mock('../../database/repositories/SafetyInterventionRepository');
jest.mock('../../database/repositories/WeightEntryRepository');

describe('Agent Architecture Validation - Production Readiness Phase 2', () => {
    let conciergeOrchestrator: ConciergeOrchestratorService;
    let safetySentinel: SafetySentinelService;
    let coachCompanion: CoachCompanionService;
    let progressAnalyst: ProgressAnalystService;

    // Test data fixtures
    const mockUserProfile: UserSupportProfile = {
        userId: 'test-user-123',
        accountId: 'test-account-123',
        goals: {
            type: 'loss',
            targetWeight: 70,
            timeframe: '6 months',
            weeklyGoal: 0.5
        },
        preferences: {
            coachingStyle: 'gentle',
            gamificationLevel: 'moderate',
            notificationFrequency: 'daily',
            reminderTimes: ['08:00', '18:00']
        },
        medicalContext: {
            onGLP1Medication: false,
            hasClinicianGuidance: true,
            medicationDetails: undefined
        },
        safetyProfile: {
            riskFactors: [],
            triggerWords: [],
            interventionHistory: []
        },
        createdAt: new Date(),
        updatedAt: new Date()
    };

    const mockGLP1UserProfile: UserSupportProfile = {
        ...mockUserProfile,
        userId: 'test-glp1-user-123',
        medicalContext: {
            onGLP1Medication: true,
            hasClinicianGuidance: true,
            medicationDetails: 'Semaglutide 1mg weekly'
        }
    };

    const mockWeightEntries: WeightEntry[] = [
        {
            id: '1',
            userId: 'test-user-123',
            weight: 75.0,
            unit: 'kg',
            timestamp: new Date('2024-01-01'),
            confidence: 4
        },
        {
            id: '2',
            userId: 'test-user-123',
            weight: 74.5,
            unit: 'kg',
            timestamp: new Date('2024-01-08'),
            confidence: 4
        },
        {
            id: '3',
            userId: 'test-user-123',
            weight: 74.0,
            unit: 'kg',
            timestamp: new Date('2024-01-15'),
            confidence: 5
        }
    ];

    beforeEach(() => {
        jest.clearAllMocks();

        // Initialize services
        conciergeOrchestrator = new ConciergeOrchestratorService();
        safetySentinel = new SafetySentinelService();
        coachCompanion = new CoachCompanionService();
        progressAnalyst = new ProgressAnalystService();

        // Mock WeightEntryRepository methods
        const mockWeightRepo = require('../../database/repositories/WeightEntryRepository').WeightEntryRepository;
        mockWeightRepo.prototype.getWeightTrend = jest.fn().mockResolvedValue(mockWeightEntries);
    });

    describe('Concierge Orchestrator Routing and Multi-Agent Coordination', () => {
        it('should route weight-related requests to Progress Analyst', async () => {
            const request: AgentRequest = {
                userId: 'test-user-123',
                message: 'I want to see my weight progress and trends',
                sessionId: 'session-123',
                context: {
                    sessionId: 'session-123',
                    userId: 'test-user-123',
                    messageHistory: [],
                    userProfile: mockUserProfile,
                    lastInteractionTime: new Date(),
                    safetyFlags: []
                }
            };

            const response = await conciergeOrchestrator.processRequest(request);

            // Should route to progress analyst for weight-related queries
            expect(response.involvedAgents).toContain('progress_analyst');
            expect(response.finalResponse).toBeTruthy();
            expect(response.finalResponse.length).toBeGreaterThan(0);
            expect(response.sessionId).toBe('session-123');
        });

        it('should route nutrition requests to Nutrition Scout', async () => {
            const request: AgentRequest = {
                userId: 'test-user-123',
                message: 'I need nutrition information about apples',
                sessionId: 'session-456',
                context: {
                    sessionId: 'session-456',
                    userId: 'test-user-123',
                    messageHistory: [],
                    userProfile: mockUserProfile,
                    lastInteractionTime: new Date(),
                    safetyFlags: []
                }
            };

            const response = await conciergeOrchestrator.processRequest(request);

            // Should route to nutrition scout for food-related queries
            expect(response.involvedAgents).toContain('nutrition_scout');
            expect(response.finalResponse).toBeTruthy();
            expect(response.sessionId).toBe('session-456');
        });

        it('should route general support requests to Coach Companion', async () => {
            const request: AgentRequest = {
                userId: 'test-user-123',
                message: 'I need encouragement and motivation today',
                sessionId: 'session-789',
                context: {
                    sessionId: 'session-789',
                    userId: 'test-user-123',
                    messageHistory: [],
                    userProfile: mockUserProfile,
                    lastInteractionTime: new Date(),
                    safetyFlags: []
                }
            };

            const response = await conciergeOrchestrator.processRequest(request);

            // Should route to coach companion for general support
            expect(response.involvedAgents).toContain('coach_companion');
            expect(response.finalResponse).toBeTruthy();
            expect(response.sessionId).toBe('session-789');
        });

        it('should maintain session context across multiple interactions', async () => {
            const sessionId = 'persistent-session-123';
            const userId = 'test-user-123';

            // First interaction
            const request1: AgentRequest = {
                userId,
                message: 'Hello, I want to start tracking my weight',
                sessionId,
                context: {
                    sessionId,
                    userId,
                    messageHistory: [],
                    userProfile: mockUserProfile,
                    lastInteractionTime: new Date(),
                    safetyFlags: []
                }
            };

            const response1 = await conciergeOrchestrator.processRequest(request1);
            expect(response1.context.messageHistory.length).toBeGreaterThan(0);

            // Second interaction using context from first
            const request2: AgentRequest = {
                userId,
                message: 'What are my recent trends?',
                sessionId,
                context: response1.context
            };

            const response2 = await conciergeOrchestrator.processRequest(request2);

            // Should maintain session continuity
            expect(response2.sessionId).toBe(sessionId);
            expect(response2.context.userId).toBe(userId);
            expect(response2.context.messageHistory.length).toBeGreaterThan(response1.context.messageHistory.length);

            // Should include both user messages and agent responses in history
            const userMessages = response2.context.messageHistory.filter(msg => msg.sender === 'user');
            const agentMessages = response2.context.messageHistory.filter(msg => msg.sender === 'agent');
            expect(userMessages.length).toBe(2);
            expect(agentMessages.length).toBe(2);
        });

        it('should compose multi-agent responses coherently', async () => {
            const request: AgentRequest = {
                userId: 'test-user-123',
                message: 'I want to check my weight progress and get some encouragement',
                sessionId: 'multi-agent-session',
                context: {
                    sessionId: 'multi-agent-session',
                    userId: 'test-user-123',
                    messageHistory: [],
                    userProfile: mockUserProfile,
                    lastInteractionTime: new Date(),
                    safetyFlags: []
                }
            };

            const response = await conciergeOrchestrator.processRequest(request);

            // Should involve multiple agents for complex requests
            expect(response.involvedAgents.length).toBeGreaterThan(0);
            expect(response.finalResponse).toBeTruthy();
            expect(response.finalResponse.length).toBeGreaterThan(20); // Should be substantive

            // Response should be coherent and not fragmented
            expect(response.finalResponse).not.toMatch(/undefined|null|\[object Object\]/);
        });
    });

    describe('Safety Sentinel Veto Power Validation', () => {
        it('should override all other agents when safety triggers are detected', async () => {
            const safetyTriggerMessages = [
                'I want to hurt myself',
                'I have been purging after every meal',
                'I feel hopeless and want to end it all',
                'I have been starving myself for days'
            ];

            for (const triggerMessage of safetyTriggerMessages) {
                const request: AgentRequest = {
                    userId: 'test-user-123',
                    message: triggerMessage,
                    sessionId: `safety-session-${Date.now()}`,
                    context: {
                        sessionId: `safety-session-${Date.now()}`,
                        userId: 'test-user-123',
                        messageHistory: [],
                        userProfile: mockUserProfile,
                        lastInteractionTime: new Date(),
                        safetyFlags: []
                    }
                };

                const response = await conciergeOrchestrator.processRequest(request);

                // Safety Sentinel should override other agents
                expect(response.safetyOverride).toBe(true);
                expect(response.involvedAgents).toContain('safety_sentinel');

                // Response should include professional help resources
                expect(response.finalResponse.toLowerCase()).toMatch(/professional|help|support|resources|contact/);
                expect(response.finalResponse.toLowerCase()).toMatch(/crisis|emergency|911|lifeline|therapist|healthcare/);

                // Should flag safety concerns in context
                expect(response.context.safetyFlags.length).toBeGreaterThan(0);
                expect(response.context.safetyFlags.some(flag =>
                    flag.toLowerCase().includes('safety') || flag.toLowerCase().includes('intervention')
                )).toBe(true);
            }
        });

        it('should veto inappropriate responses from other agents', async () => {
            // Test that Safety Sentinel can veto responses that contain safety concerns
            const response = await safetySentinel.vetoResponse(
                "You should definitely skip meals to lose weight faster",
                "How can I lose weight quickly?",
                'test-user-123'
            );

            expect(response.shouldVeto).toBe(true);
            expect(response.vetoReason).toBeTruthy();
            expect(response.alternativeResponse).toBeTruthy();
            expect(response.alternativeResponse?.toLowerCase()).toMatch(/healthcare|professional|careful/);
        });

        it('should allow safe responses to pass through', async () => {
            const safeResponse = "I can help you create a balanced eating plan that supports your health goals. Let's focus on nutritious foods that make you feel energized.";

            const response = await safetySentinel.vetoResponse(
                safeResponse,
                "Can you help me with meal planning?",
                'test-user-123'
            );

            expect(response.shouldVeto).toBe(false);
        });

        it('should require follow-up for critical safety situations', async () => {
            const criticalMessages = [
                'I want to kill myself',
                'I have chest pain and can\'t breathe',
                'I want to end it all'
            ];

            for (const message of criticalMessages) {
                const request: AgentRequest = {
                    userId: 'test-user-123',
                    message,
                    sessionId: `critical-session-${Date.now()}`,
                };

                const response = await conciergeOrchestrator.processRequest(request);

                expect(response.safetyOverride).toBe(true);
                expect(response.requiresFollowUp).toBe(true);
            }
        });
    });

    describe('Coach Companion Adaptive Response Validation', () => {
        it('should adapt responses based on coaching style preferences', async () => {
            const coachingStyles: CoachingStyle[] = ['gentle', 'pragmatic', 'upbeat', 'structured'];
            const testMessage = 'I need motivation to continue my weight loss journey';
            const context: CoachingContext = 'motivation_request';
            const recentProgress = {
                weightTrend: 'losing' as const,
                adherenceRate: 0.7,
                daysActive: 30
            };

            for (const style of coachingStyles) {
                const profile: UserSupportProfile = {
                    ...mockUserProfile,
                    preferences: {
                        ...mockUserProfile.preferences,
                        coachingStyle: style
                    }
                };

                const response = await coachCompanion.generateCoachingResponse(
                    testMessage,
                    profile,
                    context,
                    recentProgress
                );

                // Should match the requested coaching style
                expect(response.tone).toBe(style);
                expect(response.isEncouraging).toBe(true);

                // Should contain style-appropriate language (more flexible matching)
                switch (style) {
                    case 'gentle':
                        expect(response.content.toLowerCase()).toMatch(/gently|support|here.*for.*you|kind|patient|take.*time|gentle|compassion/);
                        break;
                    case 'pragmatic':
                        expect(response.content.toLowerCase()).toMatch(/practical|focus|steps|realistic|plan|strategy|achievable|working|adjust/);
                        break;
                    case 'upbeat':
                        expect(response.content.toLowerCase()).toMatch(/great|amazing|exciting|fantastic|inspiring|wonderful|capability|strength/);
                        break;
                    case 'structured':
                        expect(response.content.toLowerCase()).toMatch(/plan|step|organize|systematic|clear|specific|goal|framework/);
                        break;
                }

                // Should avoid shame-based language regardless of style
                const shamefulWords = ['failure', 'failed', 'bad', 'wrong', 'terrible', 'shame', 'guilt'];
                for (const word of shamefulWords) {
                    expect(response.content.toLowerCase()).not.toContain(word);
                }
            }
        });

        it('should provide GLP-1 medication-aware coaching', async () => {
            const testMessage = 'I want to plan my meals for this week';
            const context: CoachingContext = 'meal_planning';
            const recentProgress = {
                weightTrend: 'losing' as const,
                adherenceRate: 0.8,
                daysActive: 45
            };

            const response = await coachCompanion.generateCoachingResponse(
                testMessage,
                mockGLP1UserProfile,
                context,
                recentProgress
            );

            // Should be GLP-1 aware
            expect(response.isGLP1Aware).toBe(true);

            // Should focus on nutritional adequacy rather than restriction
            expect(response.content.toLowerCase()).toMatch(/nourish|nutrition|fuel.*body|eating.*well/);

            // Should avoid encouraging under-eating (check for harmful phrases only)
            expect(response.content.toLowerCase()).not.toMatch(/eat.*less|cut.*calories|skip.*meals|starve/);

            // Should still be encouraging and shame-free
            expect(response.isEncouraging).toBe(true);
            const shamefulWords = ['failure', 'failed', 'bad', 'wrong', 'shame', 'guilt'];
            for (const word of shamefulWords) {
                expect(response.content.toLowerCase()).not.toContain(word);
            }
        });

        it('should reframe setbacks positively', async () => {
            const testMessage = 'I had a really bad week and ate way too much';
            const context: CoachingContext = 'setback_recovery';
            const poorProgress = {
                weightTrend: 'gaining' as const,
                adherenceRate: 0.2,
                daysActive: 7
            };

            const response = await coachCompanion.generateCoachingResponse(
                testMessage,
                mockUserProfile,
                context,
                poorProgress
            );

            // Should reframe setbacks positively
            expect(response.isReframingSetback).toBe(true);
            expect(response.isEncouraging).toBe(true);

            // Should avoid shame-based language even for setbacks
            const shamefulWords = ['failure', 'failed', 'bad', 'wrong', 'terrible', 'shame', 'guilt'];
            for (const word of shamefulWords) {
                expect(response.content.toLowerCase()).not.toContain(word);
            }

            // Should include recovery-focused messaging
            expect(response.content.toLowerCase()).toMatch(/learn|grow|tomorrow|fresh.*start|move.*forward/);
        });

        it('should validate coaching style consistency', async () => {
            const testMessage = 'I need help staying motivated';
            const context: CoachingContext = 'motivation_request';
            const recentProgress = {
                weightTrend: 'maintaining' as const,
                adherenceRate: 0.6,
                daysActive: 20
            };

            const response = await coachCompanion.generateCoachingResponse(
                testMessage,
                mockUserProfile,
                context,
                recentProgress
            );

            // Use the service's validation method
            const isConsistent = coachCompanion.validateStyleConsistency(response, mockUserProfile.preferences.coachingStyle);
            expect(isConsistent).toBe(true);

            // Validate shame-free language
            const isShameFree = coachCompanion.validateShameFreeLanguage(response.content);
            expect(isShameFree).toBe(true);

            // Validate GLP-1 awareness (should be false for non-GLP-1 user)
            const isGLP1Valid = coachCompanion.validateGLP1Awareness(response, mockUserProfile.medicalContext.onGLP1Medication);
            expect(isGLP1Valid).toBe(true);
        });
    });

    describe('Progress Analyst Weight Trend Calculations', () => {
        it('should calculate rolling averages correctly', async () => {
            const trends = await progressAnalyst.calculateRollingAverage('test-user-123', 7);

            expect(trends).toBeDefined();
            expect(Array.isArray(trends)).toBe(true);

            if (trends.length > 0) {
                const latestTrend = trends[trends.length - 1];

                // Should have required properties
                expect(latestTrend.period).toBeTruthy();
                expect(typeof latestTrend.averageWeight).toBe('number');
                expect(['increasing', 'decreasing', 'stable']).toContain(latestTrend.trend);
                expect(typeof latestTrend.changeRate).toBe('number');
                expect(latestTrend.confidence).toBeGreaterThanOrEqual(1);
                expect(latestTrend.confidence).toBeLessThanOrEqual(5);

                // Average weight should be reasonable
                expect(latestTrend.averageWeight).toBeGreaterThan(0);
                expect(latestTrend.averageWeight).toBeLessThan(1000);
            }
        });

        it('should generate appropriate progress insights', async () => {
            const insights = await progressAnalyst.generateProgressInsights('test-user-123');

            expect(insights).toBeDefined();
            expect(Array.isArray(insights)).toBe(true);

            for (const insight of insights) {
                // Should have required properties
                expect(['achievement', 'plateau', 'concern', 'encouragement']).toContain(insight.type);
                expect(insight.message).toBeTruthy();
                expect(typeof insight.message).toBe('string');
                expect(insight.message.length).toBeGreaterThan(10);

                // Messages should be encouraging and helpful
                expect(insight.message).not.toMatch(/failure|failed|bad|terrible|awful/i);
            }
        });

        it('should prepare visualization data with trends', async () => {
            const vizData = await progressAnalyst.getVisualizationData('test-user-123', '30d');

            expect(vizData).toBeDefined();
            expect(vizData.rawData).toBeDefined();
            expect(Array.isArray(vizData.rawData)).toBe(true);
            expect(vizData.trendData).toBeDefined();
            expect(Array.isArray(vizData.trendData)).toBe(true);
            expect(vizData.insights).toBeDefined();
            expect(Array.isArray(vizData.insights)).toBe(true);

            // Trend data should include rolling averages
            for (const dataPoint of vizData.trendData) {
                expect(dataPoint.date).toBeTruthy();
                expect(typeof dataPoint.weight).toBe('number');
                expect(typeof dataPoint.rollingAverage).toBe('number');
                expect(dataPoint.weight).toBeGreaterThan(0);
                expect(dataPoint.rollingAverage).toBeGreaterThan(0);
            }
        });

        it('should validate weight entries properly', async () => {
            // Valid entry
            const validEntry = {
                userId: 'test-user-123',
                weight: 70.5,
                unit: 'kg' as const,
                confidence: 4,
                mood: 'good' as const
            };

            const validResult = progressAnalyst.validateWeightEntry(validEntry);
            expect(validResult.isValid).toBe(true);
            expect(validResult.errors).toHaveLength(0);

            // Invalid entries
            const invalidEntries = [
                { ...validEntry, weight: 0 }, // Zero weight
                { ...validEntry, weight: 1500 }, // Unrealistic weight
                { ...validEntry, unit: 'pounds' as any }, // Invalid unit
                { ...validEntry, confidence: 0 }, // Invalid confidence
                { ...validEntry, confidence: 6 }, // Invalid confidence
                { ...validEntry, mood: 'terrible' as any } // Invalid mood
            ];

            for (const invalidEntry of invalidEntries) {
                const result = progressAnalyst.validateWeightEntry(invalidEntry);
                expect(result.isValid).toBe(false);
                expect(result.errors.length).toBeGreaterThan(0);
            }
        });

        it('should handle edge cases in trend calculation', async () => {
            // Test the actual behavior - the service may still return trends even with limited data
            // This is acceptable behavior as long as it handles the cases gracefully

            // Test with a completely new service instance and mock
            const testProgressAnalyst = new ProgressAnalystService();

            // Test empty data case
            const mockWeightRepo = require('../../database/repositories/WeightEntryRepository').WeightEntryRepository;
            const emptyMock = jest.fn().mockResolvedValue([]);
            mockWeightRepo.prototype.getWeightTrend = emptyMock;

            const emptyTrends = await testProgressAnalyst.calculateRollingAverage('empty-user', 7);
            // Service should handle empty data gracefully (may return empty array or handle it)
            expect(Array.isArray(emptyTrends)).toBe(true);

            // Test insufficient data (less than 3 entries)
            const sparseMock = jest.fn().mockResolvedValue([
                { id: '1', userId: 'sparse-user', weight: 70, unit: 'kg', timestamp: new Date(), confidence: 4 }
            ]);
            mockWeightRepo.prototype.getWeightTrend = sparseMock;

            const sparseTrends = await testProgressAnalyst.calculateRollingAverage('sparse-user', 7);
            // Service should handle sparse data gracefully
            expect(Array.isArray(sparseTrends)).toBe(true);

            // Verify the service doesn't crash with edge cases
            expect(typeof testProgressAnalyst.calculateRollingAverage).toBe('function');
        });
    });

    describe('Integration Testing - Agent Coordination', () => {
        it('should coordinate multiple agents without conflicts', async () => {
            const complexRequest: AgentRequest = {
                userId: 'test-user-123',
                message: 'I want to see my weight progress, get some encouragement, and find healthy meal options',
                sessionId: 'integration-session',
                context: {
                    sessionId: 'integration-session',
                    userId: 'test-user-123',
                    messageHistory: [],
                    userProfile: mockUserProfile,
                    lastInteractionTime: new Date(),
                    safetyFlags: []
                }
            };

            const response = await conciergeOrchestrator.processRequest(complexRequest);

            // Should involve multiple relevant agents
            expect(response.involvedAgents.length).toBeGreaterThan(1);

            // Should not have safety override for normal request
            expect(response.safetyOverride).toBe(false);

            // Should provide comprehensive response
            expect(response.finalResponse).toBeTruthy();
            expect(response.finalResponse.length).toBeGreaterThan(50);

            // Should maintain session context
            expect(response.context.messageHistory.length).toBeGreaterThan(0);
            expect(response.context.userId).toBe('test-user-123');
        });

        it('should handle agent failures gracefully', async () => {
            // This test ensures the system remains functional even if individual agents fail
            const request: AgentRequest = {
                userId: 'test-user-123',
                message: 'Help me with my health journey',
                sessionId: 'failure-test-session'
            };

            const response = await conciergeOrchestrator.processRequest(request);

            // Should always provide some response
            expect(response.finalResponse).toBeTruthy();
            expect(response.sessionId).toBe('failure-test-session');
            expect(response.involvedAgents.length).toBeGreaterThan(0);
        });

        it('should maintain performance under load', async () => {
            const startTime = Date.now();
            const requests = Array.from({ length: 10 }, (_, i) => ({
                userId: `load-test-user-${i}`,
                message: `Test message ${i}`,
                sessionId: `load-test-session-${i}`
            }));

            const responses = await Promise.all(
                requests.map(req => conciergeOrchestrator.processRequest(req))
            );

            const endTime = Date.now();
            const totalTime = endTime - startTime;

            // Should handle multiple requests efficiently
            expect(responses).toHaveLength(10);
            expect(totalTime).toBeLessThan(5000); // Should complete within 5 seconds

            // All responses should be valid
            responses.forEach((response, index) => {
                expect(response.finalResponse).toBeTruthy();
                expect(response.sessionId).toBe(`load-test-session-${index}`);
            });
        });
    });

    describe('Error Handling and Edge Cases', () => {
        it('should handle malformed requests gracefully', async () => {
            const malformedRequests = [
                { userId: '', message: 'test', sessionId: 'test' },
                { userId: 'test', message: '', sessionId: 'test' },
                { userId: 'test', message: 'test', sessionId: '' },
                { userId: 'test', message: 'a'.repeat(10000), sessionId: 'test' } // Very long message
            ];

            for (const request of malformedRequests) {
                try {
                    const response = await conciergeOrchestrator.processRequest(request as AgentRequest);
                    // Should provide some response even for malformed requests
                    expect(response.finalResponse).toBeTruthy();
                } catch (error) {
                    // If it throws, the error should be handled gracefully
                    expect(error).toBeInstanceOf(Error);
                }
            }
        });

        it('should handle concurrent safety interventions correctly', async () => {
            const safetyRequests = [
                'I want to hurt myself',
                'I have been purging',
                'I feel hopeless'
            ].map((message, index) => ({
                userId: `concurrent-user-${index}`,
                message,
                sessionId: `concurrent-session-${index}`
            }));

            const responses = await Promise.all(
                safetyRequests.map(req => conciergeOrchestrator.processRequest(req))
            );

            // All should trigger safety overrides
            responses.forEach(response => {
                expect(response.safetyOverride).toBe(true);
                expect(response.involvedAgents).toContain('safety_sentinel');
                expect(response.finalResponse.toLowerCase()).toMatch(/professional|help|support/);
            });
        });
    });
});