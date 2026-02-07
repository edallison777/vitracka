/**
 * Property-Based Tests for Adaptive Coaching Consistency
 * Tests Property 6: Adaptive Coaching Consistency
 * Validates: Requirements 3.1, 3.2, 3.3, 8.1, 8.2, 8.3
 */

import * as fc from 'fast-check';
import { CoachCompanionService, CoachingContext } from '../../services/CoachCompanionService';

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

describe('Adaptive Coaching Consistency Properties', () => {
    let coachService: CoachCompanionService;

    beforeEach(() => {
        jest.clearAllMocks();
        coachService = new CoachCompanionService();
    });

    /**
     * Property 6: Adaptive Coaching Consistency
     * For any coaching response generation, the output should match the user's specified 
     * tone preference, contain encouraging language, avoid shame-based content, and adapt 
     * appropriately for GLP-1 medication users
     * **Validates: Requirements 3.1, 3.2, 3.3, 8.1, 8.2, 8.3**
     */
    describe('Property 6: Adaptive Coaching Consistency', () => {
        // Custom arbitraries for generating user profiles and coaching scenarios
        const coachingStyleArbitrary = fc.constantFrom('gentle' as const, 'pragmatic' as const, 'upbeat' as const, 'structured' as const);

        const userProfileArbitrary = fc.record({
            userId: fc.uuid(),
            accountId: fc.uuid(),
            goals: fc.record({
                type: fc.constantFrom('loss' as const, 'maintenance' as const, 'transition' as const),
                targetWeight: fc.option(fc.float({ min: 50, max: 200 }), { nil: undefined }),
                timeframe: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: undefined }),
                weeklyGoal: fc.option(fc.float({ min: 0.5, max: 2.0 }), { nil: undefined })
            }),
            preferences: fc.record({
                coachingStyle: coachingStyleArbitrary,
                gamificationLevel: fc.constantFrom('minimal' as const, 'moderate' as const, 'high' as const),
                notificationFrequency: fc.constantFrom('daily' as const, 'weekly' as const, 'custom' as const),
                reminderTimes: fc.array(fc.string({ minLength: 5, maxLength: 5 }), { minLength: 0, maxLength: 3 })
            }),
            medicalContext: fc.record({
                onGLP1Medication: fc.boolean(),
                hasClinicianGuidance: fc.boolean(),
                medicationDetails: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined })
            }),
            safetyProfile: fc.record({
                riskFactors: fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 0, maxLength: 3 }),
                triggerWords: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 0, maxLength: 5 }),
                interventionHistory: fc.array(fc.record({
                    id: fc.uuid(),
                    userId: fc.uuid(),
                    triggerType: fc.constantFrom('eating_disorder' as const, 'self_harm' as const, 'depression' as const, 'medical_emergency' as const),
                    triggerContent: fc.string({ minLength: 1, maxLength: 100 }),
                    agentResponse: fc.string({ minLength: 1, maxLength: 200 }),
                    escalationLevel: fc.constantFrom('low' as const, 'medium' as const, 'high' as const, 'critical' as const),
                    adminNotified: fc.boolean(),
                    followUpRequired: fc.boolean(),
                    timestamp: fc.date()
                }), { minLength: 0, maxLength: 2 })
            }),
            createdAt: fc.date(),
            updatedAt: fc.date()
        });

        const coachingScenarioArbitrary = fc.record({
            userMessage: fc.string({ minLength: 5, maxLength: 200 }),
            context: fc.constantFrom(
                'weight_logging' as const, 'goal_setting' as const, 'progress_check' as const, 'setback_recovery' as const,
                'meal_planning' as const, 'exercise_discussion' as const, 'motivation_request' as const, 'general_support' as const
            ),
            recentProgress: fc.record({
                weightTrend: fc.constantFrom('losing' as const, 'maintaining' as const, 'gaining' as const, 'fluctuating' as const),
                adherenceRate: fc.float({ min: 0, max: 1 }),
                daysActive: fc.integer({ min: 1, max: 90 })
            })
        });

        it('should match user coaching style preferences consistently', () => {
            return fc.assert(
                fc.asyncProperty(
                    fc.record({
                        profile: userProfileArbitrary,
                        scenario: coachingScenarioArbitrary
                    }),
                    async (testData) => {
                        // Feature: vitracka-weight-management, Property 6: Adaptive Coaching Consistency

                        const response = await coachService.generateCoachingResponse(
                            testData.scenario.userMessage,
                            testData.profile,
                            testData.scenario.context,
                            testData.scenario.recentProgress
                        );

                        // Response should match the user's preferred coaching style (core behavioral property)
                        const style = testData.profile.preferences.coachingStyle;
                        expect(response.tone).toBe(style);

                        // All styles should avoid shame-based language (negative validation)
                        const shamefulWords = ['failure', 'failed', 'bad', 'wrong', 'terrible', 'awful', 'shame', 'guilt', 'disappointed', 'pathetic', 'weak', 'lazy'];
                        for (const word of shamefulWords) {
                            expect(response.content.toLowerCase()).not.toContain(word);
                        }

                        // All responses should be encouraging (behavioral property)
                        expect(response.isEncouraging).toBe(true);

                        // Response should be substantive
                        expect(response.content.length).toBeGreaterThan(10);
                    }
                ),
                { numRuns: 50 }
            );
        });

        it('should adapt appropriately for GLP-1 medication users', () => {
            return fc.assert(
                fc.asyncProperty(
                    fc.record({
                        profile: userProfileArbitrary.map(profile => ({
                            ...profile,
                            medicalContext: {
                                ...profile.medicalContext,
                                onGLP1Medication: true // Force GLP-1 medication usage
                            }
                        })),
                        scenario: coachingScenarioArbitrary
                    }),
                    async (testData) => {
                        // Feature: vitracka-weight-management, Property 6: Adaptive Coaching Consistency

                        const response = await coachService.generateCoachingResponse(
                            testData.scenario.userMessage,
                            testData.profile,
                            testData.scenario.context,
                            testData.scenario.recentProgress
                        );

                        // GLP-1 users should receive medication-aware coaching
                        expect(response.isGLP1Aware).toBe(true);

                        // Should avoid encouraging under-eating (focus on harmful phrases only)
                        expect(response.content.toLowerCase()).not.toMatch(/(eat less|cut calories|skip meals|barely eat|starve)/);

                        // Should include under-eating check when contextually relevant
                        if (testData.scenario.context === 'meal_planning' ||
                            testData.scenario.context === 'setback_recovery' ||
                            (testData.scenario.context === 'progress_check' && testData.scenario.recentProgress.adherenceRate < 0.3)) {
                            expect(response.includesUnderEatingCheck).toBe(true);
                        }

                        // Should avoid shame-based language (same as all users)
                        const shamefulWords = ['failure', 'failed', 'bad', 'wrong', 'terrible', 'awful', 'shame', 'guilt'];
                        for (const word of shamefulWords) {
                            expect(response.content.toLowerCase()).not.toContain(word);
                        }

                        // Should maintain encouraging tone
                        expect(response.isEncouraging).toBe(true);
                    }
                ),
                { numRuns: 30 }
            );
        });

        it('should maintain shame-free language across all coaching styles', () => {
            return fc.assert(
                fc.asyncProperty(
                    fc.record({
                        profile: userProfileArbitrary,
                        scenario: coachingScenarioArbitrary.filter(scenario => {
                            const contexts: CoachingContext[] = ['setback_recovery', 'weight_logging', 'progress_check'];
                            return contexts.includes(scenario.context as CoachingContext);
                        }).map(scenario => ({
                            ...scenario,
                            recentProgress: {
                                ...scenario.recentProgress,
                                adherenceRate: Math.random() * 0.5 // Low adherence to test shame-free messaging
                            }
                        }))
                    }),
                    async (testData) => {
                        // Feature: vitracka-weight-management, Property 6: Adaptive Coaching Consistency

                        const response = await coachService.generateCoachingResponse(
                            testData.scenario.userMessage,
                            testData.profile,
                            testData.scenario.context,
                            testData.scenario.recentProgress
                        );

                        // Should never use shame-based language (comprehensive negative validation)
                        const shamefulWords = [
                            'failure', 'failed', 'bad', 'wrong', 'terrible', 'awful',
                            'shame', 'guilt', 'disappointed', 'pathetic', 'weak',
                            'lazy', 'undisciplined', 'hopeless', 'useless'
                        ];

                        for (const word of shamefulWords) {
                            expect(response.content.toLowerCase()).not.toContain(word);
                        }

                        // Should reframe setbacks positively when adherence is low
                        if (testData.scenario.recentProgress.adherenceRate < 0.5) {
                            expect(response.isReframingSetback).toBe(true);
                            // Should avoid shame-based language even in setback scenarios
                            const shamefulWords = ['failure', 'failed', 'bad', 'wrong', 'terrible', 'awful', 'shame', 'guilt'];
                            for (const word of shamefulWords) {
                                expect(response.content.toLowerCase()).not.toContain(word);
                            }
                        }

                        // Should maintain encouraging tone even with poor progress
                        expect(response.isEncouraging).toBe(true);
                    }
                ),
                { numRuns: 40 }
            );
        });

        it('should provide consistent encouragement regardless of user progress', () => {
            return fc.assert(
                fc.asyncProperty(
                    fc.record({
                        profile: userProfileArbitrary,
                        goodProgress: coachingScenarioArbitrary.map(scenario => ({
                            ...scenario,
                            recentProgress: {
                                weightTrend: 'losing' as const,
                                adherenceRate: 0.8 + Math.random() * 0.2,
                                daysActive: 20 + Math.floor(Math.random() * 70)
                            }
                        })),
                        poorProgress: coachingScenarioArbitrary.map(scenario => ({
                            ...scenario,
                            recentProgress: {
                                weightTrend: 'gaining' as const,
                                adherenceRate: Math.random() * 0.3,
                                daysActive: 1 + Math.floor(Math.random() * 4)
                            }
                        }))
                    }),
                    async (testData) => {
                        // Feature: vitracka-weight-management, Property 6: Adaptive Coaching Consistency

                        const goodResponse = await coachService.generateCoachingResponse(
                            testData.goodProgress.userMessage,
                            testData.profile,
                            testData.goodProgress.context,
                            testData.goodProgress.recentProgress
                        );

                        const poorResponse = await coachService.generateCoachingResponse(
                            testData.poorProgress.userMessage,
                            testData.profile,
                            testData.poorProgress.context,
                            testData.poorProgress.recentProgress
                        );

                        // Both responses should be encouraging (behavioral property)
                        expect(goodResponse.isEncouraging).toBe(true);
                        expect(poorResponse.isEncouraging).toBe(true);

                        // Both should maintain the same coaching style
                        expect(goodResponse.tone).toBe(testData.profile.preferences.coachingStyle);
                        expect(poorResponse.tone).toBe(testData.profile.preferences.coachingStyle);

                        // Both should avoid shame-based language (negative validation)
                        const shamefulWords = ['failure', 'failed', 'bad', 'wrong', 'shame', 'guilt', 'terrible', 'awful'];
                        for (const word of shamefulWords) {
                            expect(goodResponse.content.toLowerCase()).not.toContain(word);
                            expect(poorResponse.content.toLowerCase()).not.toContain(word);
                        }

                        // Poor progress should include recovery-focused messaging
                        if (testData.poorProgress.recentProgress.adherenceRate < 0.5) {
                            expect(poorResponse.isReframingSetback).toBe(true);
                        }

                        // Both responses should be contextually appropriate but consistently encouraging
                        expect(goodResponse.content.length).toBeGreaterThan(10);
                        expect(poorResponse.content.length).toBeGreaterThan(10);
                    }
                ),
                { numRuns: 25 }
            );
        });

        it('should adapt coaching intensity based on user preferences', () => {
            return fc.assert(
                fc.asyncProperty(
                    fc.record({
                        minimalProfile: userProfileArbitrary.map(profile => ({
                            ...profile,
                            preferences: {
                                ...profile.preferences,
                                gamificationLevel: 'minimal' as const,
                                notificationFrequency: 'weekly' as const
                            }
                        })),
                        highProfile: userProfileArbitrary.map(profile => ({
                            ...profile,
                            preferences: {
                                ...profile.preferences,
                                gamificationLevel: 'high' as const,
                                notificationFrequency: 'daily' as const
                            }
                        })),
                        scenario: coachingScenarioArbitrary
                    }),
                    async (testData) => {
                        // Feature: vitracka-weight-management, Property 6: Adaptive Coaching Consistency

                        const minimalResponse = await coachService.generateCoachingResponse(
                            testData.scenario.userMessage,
                            testData.minimalProfile,
                            testData.scenario.context,
                            testData.scenario.recentProgress
                        );

                        const highResponse = await coachService.generateCoachingResponse(
                            testData.scenario.userMessage,
                            testData.highProfile,
                            testData.scenario.context,
                            testData.scenario.recentProgress
                        );

                        // Intensity should match gamification preferences
                        expect(minimalResponse.intensity).toBe('low');
                        expect(highResponse.intensity).toBe('high');

                        // Both should maintain core encouraging principles (behavioral properties)
                        expect(minimalResponse.isEncouraging).toBe(true);
                        expect(highResponse.isEncouraging).toBe(true);

                        // Both should respect the user's coaching style preference
                        expect(minimalResponse.tone).toBe(testData.minimalProfile.preferences.coachingStyle);
                        expect(highResponse.tone).toBe(testData.highProfile.preferences.coachingStyle);

                        // Both should avoid shame-based language
                        const shamefulWords = ['failure', 'failed', 'bad', 'wrong', 'shame', 'guilt'];
                        for (const word of shamefulWords) {
                            expect(minimalResponse.content.toLowerCase()).not.toContain(word);
                            expect(highResponse.content.toLowerCase()).not.toContain(word);
                        }

                        // Both responses should be substantive
                        expect(minimalResponse.content.length).toBeGreaterThan(10);
                        expect(highResponse.content.length).toBeGreaterThan(10);
                    }
                ),
                { numRuns: 30 }
            );
        });

        it('should handle goal transitions with appropriate coaching adaptation', () => {
            return fc.assert(
                fc.asyncProperty(
                    fc.record({
                        lossProfile: userProfileArbitrary.map(profile => ({
                            ...profile,
                            goals: {
                                ...profile.goals,
                                type: 'loss' as const
                            }
                        })),
                        maintenanceProfile: userProfileArbitrary.map(profile => ({
                            ...profile,
                            goals: {
                                ...profile.goals,
                                type: 'maintenance' as const
                            }
                        })),
                        transitionProfile: userProfileArbitrary.map(profile => ({
                            ...profile,
                            goals: {
                                ...profile.goals,
                                type: 'transition' as const
                            }
                        })),
                        scenario: coachingScenarioArbitrary
                    }),
                    async (testData) => {
                        // Feature: vitracka-weight-management, Property 6: Adaptive Coaching Consistency

                        const lossResponse = await coachService.generateCoachingResponse(
                            testData.scenario.userMessage,
                            testData.lossProfile,
                            testData.scenario.context,
                            testData.scenario.recentProgress
                        );

                        const maintenanceResponse = await coachService.generateCoachingResponse(
                            testData.scenario.userMessage,
                            testData.maintenanceProfile,
                            testData.scenario.context,
                            testData.scenario.recentProgress
                        );

                        const transitionResponse = await coachService.generateCoachingResponse(
                            testData.scenario.userMessage,
                            testData.transitionProfile,
                            testData.scenario.context,
                            testData.scenario.recentProgress
                        );

                        // Goal focus should match the user's goal type (behavioral property)
                        expect(lossResponse.goalFocus).toBe('loss');
                        expect(maintenanceResponse.goalFocus).toBe('maintenance');
                        expect(transitionResponse.goalFocus).toBe('transition');

                        // All should maintain encouraging, shame-free messaging (core properties)
                        expect(lossResponse.isEncouraging).toBe(true);
                        expect(maintenanceResponse.isEncouraging).toBe(true);
                        expect(transitionResponse.isEncouraging).toBe(true);

                        // All should avoid shame-based language (negative validation)
                        const shamefulWords = ['failure', 'shame', 'guilt', 'bad', 'wrong', 'terrible', 'awful'];
                        for (const word of shamefulWords) {
                            expect(lossResponse.content.toLowerCase()).not.toContain(word);
                            expect(maintenanceResponse.content.toLowerCase()).not.toContain(word);
                            expect(transitionResponse.content.toLowerCase()).not.toContain(word);
                        }

                        // All responses should be substantive and contextually appropriate
                        expect(lossResponse.content.length).toBeGreaterThan(10);
                        expect(maintenanceResponse.content.length).toBeGreaterThan(10);
                        expect(transitionResponse.content.length).toBeGreaterThan(10);
                    }
                ),
                { numRuns: 25 }
            );
        });
    });
});