/**
 * Property-Based Tests for Safe Gamification Logic
 * Tests Property 11: Safe Gamification Logic
 * Validates: Requirements 7.2, 7.3, 7.4
 */

import * as fc from 'fast-check';
import { GameMasterService } from '../../services/GameMasterService';
import {
    UserSupportProfile,
    WeightEntry,
    BreachEvent,
    ConsistencyMetrics,
    BreachRecoveryMetrics,
    GamificationResponse
} from '../../types';

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

describe('Safe Gamification Logic Properties', () => {
    let gameMasterService: GameMasterService;

    beforeEach(() => {
        jest.clearAllMocks();
        gameMasterService = new GameMasterService();
    });

    /**
     * Property 11: Safe Gamification Logic
     * For any gamification reward generation, the system should reward consistency and honesty 
     * while avoiding reinforcement of starvation or extreme restriction behaviors, adapting to user preferences
     * **Validates: Requirements 7.2, 7.3, 7.4**
     */
    describe('Property 11: Safe Gamification Logic', () => {
        // Custom arbitraries for generating test data
        const userProfileArbitrary = fc.record({
            userId: fc.uuid(),
            accountId: fc.uuid(),
            goals: fc.record({
                type: fc.constantFrom('loss' as const, 'maintenance' as const, 'transition' as const),
                targetWeight: fc.option(fc.float({ min: 45, max: 120 }), { nil: undefined }),
                timeframe: fc.option(fc.string(), { nil: undefined }),
                weeklyGoal: fc.option(fc.float({ min: 0.25, max: 2.0 }), { nil: undefined })
            }),
            preferences: fc.record({
                coachingStyle: fc.constantFrom('gentle' as const, 'pragmatic' as const, 'upbeat' as const, 'structured' as const),
                gamificationLevel: fc.constantFrom('minimal' as const, 'moderate' as const, 'high' as const),
                notificationFrequency: fc.constantFrom('daily' as const, 'weekly' as const, 'custom' as const),
                reminderTimes: fc.array(fc.string(), { minLength: 0, maxLength: 3 })
            }),
            medicalContext: fc.record({
                onGLP1Medication: fc.boolean(),
                hasClinicianGuidance: fc.boolean(),
                medicationDetails: fc.option(fc.string(), { nil: undefined })
            }),
            safetyProfile: fc.record({
                riskFactors: fc.array(fc.string(), { maxLength: 5 }),
                triggerWords: fc.array(fc.string(), { maxLength: 5 }),
                interventionHistory: fc.array(fc.record({
                    id: fc.uuid(),
                    userId: fc.uuid(),
                    triggerType: fc.constantFrom('eating_disorder' as const, 'self_harm' as const, 'depression' as const, 'medical_emergency' as const),
                    triggerContent: fc.string(),
                    agentResponse: fc.string(),
                    escalationLevel: fc.constantFrom('low' as const, 'medium' as const, 'high' as const, 'critical' as const),
                    adminNotified: fc.boolean(),
                    followUpRequired: fc.boolean(),
                    timestamp: fc.date()
                }), { maxLength: 3 })
            }),
            createdAt: fc.date(),
            updatedAt: fc.date()
        });

        const weightEntryArbitrary = fc.record({
            id: fc.uuid(),
            userId: fc.uuid(),
            weight: fc.float({ min: 40, max: 200 }),
            unit: fc.constantFrom('kg' as const, 'lbs' as const),
            timestamp: fc.date(),
            notes: fc.option(fc.string(), { nil: undefined }),
            mood: fc.option(fc.constantFrom('great' as const, 'good' as const, 'okay' as const, 'struggling' as const), { nil: undefined }),
            confidence: fc.integer({ min: 1, max: 5 })
        });

        const consistencyMetricsArbitrary = fc.record({
            loggingStreak: fc.integer({ min: 0, max: 100 }),
            weeklyLoggingRate: fc.float({ min: 0, max: 1 }),
            monthlyLoggingRate: fc.float({ min: 0, max: 1 }),
            honestyRate: fc.float({ min: 0, max: 1 })
        });

        const breachEventArbitrary = fc.record({
            id: fc.uuid(),
            userId: fc.uuid(),
            eatingPlanId: fc.uuid(),
            timestamp: fc.date(),
            description: fc.string(),
            severity: fc.constantFrom('minor' as const, 'moderate' as const, 'major' as const),
            recoveryPlan: fc.option(fc.string(), { nil: undefined }),
            isRecovered: fc.boolean(),
            recoveredAt: fc.option(fc.date(), { nil: undefined }),
            notes: fc.option(fc.string(), { nil: undefined })
        });

        const breachRecoveryMetricsArbitrary = fc.record({
            timeToRecovery: fc.float({ min: 2, max: 72 }), // 2 to 72 hours (more realistic)
            recoverySuccess: fc.boolean(),
            supportEngagement: fc.boolean()
        });

        it('should reward consistency and honesty while avoiding unhealthy reinforcement', async () => {
            await fc.assert(
                fc.asyncProperty(
                    userProfileArbitrary,
                    weightEntryArbitrary,
                    consistencyMetricsArbitrary,
                    async (profile, weightEntry, metrics) => {
                        // Feature: vitracka-weight-management, Property 11: Safe Gamification Logic
                        const response = await gameMasterService.processWeightLogging(
                            profile.userId,
                            weightEntry,
                            profile,
                            metrics
                        );

                        // Verify safe gamification logic
                        const isSafe = gameMasterService.validateSafeGamification(response);
                        expect(isSafe).toBe(true);

                        // Verify consistency and honesty rewards
                        const hasValidRewards = gameMasterService.validateConsistencyAndHonestyReward(response, metrics);
                        expect(hasValidRewards).toBe(true);

                        // Verify adaptation to user preferences
                        const adaptedResponse = gameMasterService.adaptToUserPreferences(response, profile);

                        if (profile.preferences.gamificationLevel === 'minimal') {
                            expect(adaptedResponse.rewards).toHaveLength(0);
                            expect(adaptedResponse.achievements).toHaveLength(0);
                            expect(adaptedResponse.pointsEarned).toBe(0);
                        }

                        // Verify no unsafe patterns in messages
                        const unsafePatterns = ['starvation', 'extreme restriction', 'unhealthy low weight', 'skipping meals', 'purging'];
                        const messageContent = (adaptedResponse.message + ' ' + adaptedResponse.encouragement).toLowerCase();

                        unsafePatterns.forEach(pattern => {
                            expect(messageContent).not.toContain(pattern.toLowerCase());
                        });

                        // Verify all rewards are marked as healthy
                        adaptedResponse.rewards.forEach(reward => {
                            expect(reward.isHealthy).toBe(true);
                        });
                    }
                ),
                { numRuns: 100 }
            );
        });

        it('should provide appropriate breach recovery gamification', async () => {
            await fc.assert(
                fc.asyncProperty(
                    userProfileArbitrary,
                    breachEventArbitrary,
                    breachRecoveryMetricsArbitrary,
                    async (profile, breachEvent, recoveryMetrics) => {
                        // Feature: vitracka-weight-management, Property 11: Safe Gamification Logic
                        const response = await gameMasterService.processBreachRecovery(
                            profile.userId,
                            breachEvent,
                            recoveryMetrics,
                            profile
                        );

                        // Verify safe gamification logic
                        const isSafe = gameMasterService.validateSafeGamification(response);
                        expect(isSafe).toBe(true);

                        // Verify honesty is always rewarded for breach logging (safety requirement)
                        const hasHonestyReward = response.rewards.some(reward =>
                            reward.type === 'honesty_reward'
                        );
                        expect(hasHonestyReward).toBe(true);

                        // If recovery was successful and not minimal gamification, should have recovery reward
                        if (recoveryMetrics.recoverySuccess && profile.preferences.gamificationLevel !== 'minimal') {
                            const hasRecoveryReward = response.rewards.some(reward =>
                                reward.type === 'recovery_incentive'
                            );
                            expect(hasRecoveryReward).toBe(true);
                        }

                        // For minimal gamification, should only have honesty reward
                        if (profile.preferences.gamificationLevel === 'minimal') {
                            expect(response.rewards).toHaveLength(1);
                            expect(response.rewards[0].type).toBe('honesty_reward');
                            expect(response.achievements).toHaveLength(0);
                        }

                        // Verify message encourages recovery and honesty
                        const messageContent = response.message.toLowerCase();
                        expect(
                            messageContent.includes('honest') ||
                            messageContent.includes('recovery') ||
                            messageContent.includes('bounce back') ||
                            messageContent.includes('resilience') ||
                            messageContent.includes('thank you')
                        ).toBe(true);
                    }
                ),
                { numRuns: 100 }
            );
        });

        it('should never reinforce extreme restriction behaviors', async () => {
            await fc.assert(
                fc.asyncProperty(
                    userProfileArbitrary,
                    weightEntryArbitrary.map(entry => ({
                        ...entry,
                        notes: fc.sample(fc.constantFrom(
                            'I starved myself today',
                            'Skipped all meals',
                            'Purged after eating',
                            'Extreme restriction worked',
                            'Pride in not eating'
                        ), 1)[0]
                    })),
                    consistencyMetricsArbitrary,
                    async (profile, weightEntry, metrics) => {
                        // Feature: vitracka-weight-management, Property 11: Safe Gamification Logic
                        const response = await gameMasterService.processWeightLogging(
                            profile.userId,
                            weightEntry,
                            profile,
                            metrics
                        );

                        // Should flag safety concerns for extreme restriction language
                        expect(response.safetyChecks.isHealthyBehavior).toBe(false);
                        expect(response.safetyChecks.flaggedConcerns.length).toBeGreaterThan(0);

                        // Should not validate as safe gamification
                        const isSafe = gameMasterService.validateSafeGamification(response);
                        expect(isSafe).toBe(false);
                    }
                ),
                { numRuns: 50 }
            );
        });
    });
});
