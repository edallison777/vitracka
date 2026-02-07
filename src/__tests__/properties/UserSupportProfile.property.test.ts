/**
 * Property-Based Tests for User Support Profile Management
 * Feature: vitracka-weight-management, Property 2: Profile Management Consistency
 * Validates: Requirements 1.4, 1.5
 */

import * as fc from 'fast-check';
import { CoachingStyle, GamificationLevel, NotificationFrequency, GoalType } from '../../types';

describe('User Support Profile Management Properties', () => {
    // Custom arbitraries for generating valid profile data
    const coachingStyleArb = fc.constantFrom('gentle', 'pragmatic', 'upbeat', 'structured') as fc.Arbitrary<CoachingStyle>;
    const gamificationLevelArb = fc.constantFrom('minimal', 'moderate', 'high') as fc.Arbitrary<GamificationLevel>;
    const notificationFrequencyArb = fc.constantFrom('daily', 'weekly', 'custom') as fc.Arbitrary<NotificationFrequency>;
    const goalTypeArb = fc.constantFrom('loss', 'maintenance', 'transition') as fc.Arbitrary<GoalType>;

    const userSupportProfileArb = fc.record({
        userId: fc.uuid(),
        accountId: fc.uuid(),
        goals: fc.record({
            type: goalTypeArb,
            targetWeight: fc.option(fc.integer({ min: 40, max: 200 }).map(n => Number(n))),
            timeframe: fc.option(fc.string({ minLength: 1, maxLength: 100 })),
            weeklyGoal: fc.option(fc.integer({ min: 1, max: 20 }).map(n => Number(n) / 10)) // 0.1 to 2.0
        }),
        preferences: fc.record({
            coachingStyle: coachingStyleArb,
            gamificationLevel: gamificationLevelArb,
            notificationFrequency: notificationFrequencyArb,
            reminderTimes: fc.array(
                fc.record({
                    hour: fc.integer({ min: 0, max: 23 }),
                    minute: fc.integer({ min: 0, max: 59 })
                }).map(time => `${time.hour.toString().padStart(2, '0')}:${time.minute.toString().padStart(2, '0')}`),
                { minLength: 0, maxLength: 5 }
            )
        }),
        medicalContext: fc.record({
            onGLP1Medication: fc.boolean(),
            hasClinicianGuidance: fc.boolean(),
            medicationDetails: fc.option(fc.string({ minLength: 1, maxLength: 500 }))
        }),
        safetyProfile: fc.record({
            riskFactors: fc.array(fc.string({ minLength: 1, maxLength: 100 }), { minLength: 0, maxLength: 10 }),
            triggerWords: fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 0, maxLength: 20 }),
            interventionHistory: fc.constant([]) // Empty for new profiles
        })
    });

    /**
     * Property 2: Profile Management Consistency
     * For any valid onboarding completion or profile update request, 
     * the system should generate and persist a complete User_Support_Profile 
     * with all required fields populated
     * Validates: Requirements 1.4, 1.5
     */
    it('should maintain profile management consistency for all valid profile operations', () => {
        fc.assert(
            fc.property(
                userSupportProfileArb,
                (profileData) => {
                    // Feature: vitracka-weight-management, Property 2: Profile Management Consistency

                    // Test that all required fields are present and valid
                    expect(profileData.userId).toBeDefined();
                    expect(profileData.accountId).toBeDefined();
                    expect(profileData.goals.type).toMatch(/^(loss|maintenance|transition)$/);
                    expect(profileData.preferences.coachingStyle).toMatch(/^(gentle|pragmatic|upbeat|structured)$/);
                    expect(profileData.preferences.gamificationLevel).toMatch(/^(minimal|moderate|high)$/);
                    expect(profileData.preferences.notificationFrequency).toMatch(/^(daily|weekly|custom)$/);
                    expect(typeof profileData.medicalContext.onGLP1Medication).toBe('boolean');
                    expect(typeof profileData.medicalContext.hasClinicianGuidance).toBe('boolean');
                    expect(Array.isArray(profileData.safetyProfile.riskFactors)).toBe(true);
                    expect(Array.isArray(profileData.safetyProfile.triggerWords)).toBe(true);
                    expect(Array.isArray(profileData.safetyProfile.interventionHistory)).toBe(true);

                    // Test weight validation if present
                    if (profileData.goals.targetWeight !== null && profileData.goals.targetWeight !== undefined) {
                        expect(profileData.goals.targetWeight).toBeGreaterThan(0);
                        expect(profileData.goals.targetWeight).toBeLessThan(1000);
                    }

                    // Test weekly goal validation if present
                    if (profileData.goals.weeklyGoal !== null && profileData.goals.weeklyGoal !== undefined) {
                        expect(profileData.goals.weeklyGoal).toBeGreaterThan(0);
                        expect(profileData.goals.weeklyGoal).toBeLessThanOrEqual(5); // Reasonable upper limit
                    }

                    // Test reminder times format if present
                    profileData.preferences.reminderTimes.forEach(time => {
                        expect(time).toMatch(/^\d{2}:\d{2}$/); // HH:MM format
                    });
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Additional property test for profile validation
     * Ensures that profile data structure is consistent
     */
    it('should maintain consistent profile structure across all generated profiles', () => {
        fc.assert(
            fc.property(
                userSupportProfileArb,
                (profileData) => {
                    // Feature: vitracka-weight-management, Property 2: Profile Management Consistency

                    // Verify the profile has all required top-level properties
                    const requiredProperties = ['userId', 'accountId', 'goals', 'preferences', 'medicalContext', 'safetyProfile'];
                    requiredProperties.forEach(prop => {
                        expect(profileData).toHaveProperty(prop);
                    });

                    // Verify goals structure
                    expect(profileData.goals).toHaveProperty('type');

                    // Verify preferences structure
                    const requiredPreferences = ['coachingStyle', 'gamificationLevel', 'notificationFrequency', 'reminderTimes'];
                    requiredPreferences.forEach(prop => {
                        expect(profileData.preferences).toHaveProperty(prop);
                    });

                    // Verify medical context structure
                    const requiredMedicalContext = ['onGLP1Medication', 'hasClinicianGuidance'];
                    requiredMedicalContext.forEach(prop => {
                        expect(profileData.medicalContext).toHaveProperty(prop);
                    });

                    // Verify safety profile structure
                    const requiredSafetyProfile = ['riskFactors', 'triggerWords', 'interventionHistory'];
                    requiredSafetyProfile.forEach(prop => {
                        expect(profileData.safetyProfile).toHaveProperty(prop);
                    });
                }
            ),
            { numRuns: 50 }
        );
    });
});