/**
 * Property-Based Tests for Healthy Weight Boundaries
 * Feature: vitracka-weight-management, Property 5: Healthy Weight Boundaries
 * Validates: Requirements 2.7, 2.8, 2.9
 */

import * as fc from 'fast-check';
import { HealthyWeightBoundariesService, WeightGoal, WeightGoalValidation } from '../../services/HealthyWeightBoundariesService';

describe('Healthy Weight Boundaries Properties', () => {
    let service: HealthyWeightBoundariesService;

    beforeEach(() => {
        service = new HealthyWeightBoundariesService();
    });

    // Custom generators for weight goal data
    const weightGenerator = fc.float({ min: 40, max: 200, noDefaultInfinity: true, noNaN: true });
    const heightGenerator = fc.float({ min: 140, max: 220, noDefaultInfinity: true, noNaN: true }); // cm
    const timeframeGenerator = fc.integer({ min: 1, max: 104 }); // 1-104 weeks
    const unitGenerator = fc.constantFrom('kg', 'lbs') as fc.Arbitrary<'kg' | 'lbs'>;

    const validWeightGoalGenerator = fc.record({
        currentWeight: weightGenerator,
        targetWeight: weightGenerator,
        timeframe: timeframeGenerator,
        unit: unitGenerator,
        height: fc.option(heightGenerator, { nil: undefined })
    });

    /**
     * Property 5: Healthy Weight Boundaries
     * For any weight loss goal or recommendation, the system should ensure gradual sustainable rates,
     * reject unhealthily low targets, and recognize maintenance as success when healthy weight is achieved
     */
    describe('Property 5: Healthy Weight Boundaries', () => {
        it('should enforce gradual sustainable weight loss rates', () => {
            return fc.assert(
                fc.property(validWeightGoalGenerator, (goal) => {
                    // Feature: vitracka-weight-management, Property 5: Healthy Weight Boundaries

                    const validation = service.validateGoal(goal);

                    // Convert to kg for consistent calculations
                    const currentWeightKg = goal.unit === 'lbs' ? goal.currentWeight * 0.453592 : goal.currentWeight;
                    const targetWeightKg = goal.unit === 'lbs' ? goal.targetWeight * 0.453592 : goal.targetWeight;

                    // Only test weight loss scenarios
                    if (targetWeightKg < currentWeightKg) {
                        const totalLossKg = currentWeightKg - targetWeightKg;
                        const weeklyLossKg = totalLossKg / goal.timeframe;

                        // Check if BMI would be too low (this takes priority)
                        let wouldHaveLowBMI = false;
                        if (goal.height) {
                            const heightM = goal.height / 100;
                            const targetBMI = targetWeightKg / (heightM * heightM);
                            wouldHaveLowBMI = targetBMI < 18.5;
                        }

                        // Should reject aggressive weight loss (> 1kg/week) if BMI is not the issue
                        if (weeklyLossKg > 1.0 && !wouldHaveLowBMI) {
                            expect(validation.isAccepted).toBe(false);
                            expect(validation.suggestsModification).toBe(true);
                            expect(validation.reason).toContain('aggressive');
                            expect(validation.recommendedTimeframe).toBeGreaterThan(goal.timeframe);
                        }

                        // Should accept gradual weight loss (<= 1kg/week) if BMI is acceptable
                        if (weeklyLossKg <= 1.0 && !wouldHaveLowBMI) {
                            // Should be accepted unless there are other issues
                            expect(validation.isAccepted).toBe(true);
                        }
                    }
                })
            );
        });

        it('should reject unhealthily low BMI targets', () => {
            return fc.assert(
                fc.property(
                    fc.record({
                        currentWeight: fc.float({ min: 60, max: 120 }),
                        targetWeight: fc.float({ min: 30, max: 60 }),
                        timeframe: fc.integer({ min: 10, max: 52 }),
                        unit: unitGenerator,
                        height: fc.float({ min: 150, max: 200 }) // Always provide height for BMI calculation
                    }),
                    (goal) => {
                        // Feature: vitracka-weight-management, Property 5: Healthy Weight Boundaries

                        const validation = service.validateGoal(goal);

                        // Calculate target BMI
                        const targetWeightKg = goal.unit === 'lbs' ? goal.targetWeight * 0.453592 : goal.targetWeight;
                        const heightM = goal.height! / 100;
                        const targetBMI = targetWeightKg / (heightM * heightM);

                        // Should reject BMI below 18.5
                        if (targetBMI < 18.5) {
                            expect(validation.isAccepted).toBe(false);
                            expect(validation.suggestsModification).toBe(true);
                            expect(validation.reason).toContain('unhealthily low BMI');
                            expect(validation.recommendedTarget).toBeGreaterThan(goal.targetWeight);
                        }

                        // Should accept healthy BMI targets
                        if (targetBMI >= 18.5) {
                            // May be rejected for other reasons, but not for low BMI
                            if (!validation.isAccepted) {
                                expect(validation.reason).not.toContain('unhealthily low BMI');
                            }
                        }
                    }
                )
            );
        });

        it('should recognize maintenance as valid when in healthy weight range', () => {
            return fc.assert(
                fc.property(
                    fc.record({
                        currentWeight: fc.float({ min: 60, max: 80 }),
                        targetWeight: fc.float({ min: 60, max: 80 }),
                        timeframe: timeframeGenerator,
                        unit: unitGenerator,
                        height: fc.float({ min: 160, max: 180 })
                    }),
                    (goal) => {
                        // Feature: vitracka-weight-management, Property 5: Healthy Weight Boundaries

                        // Ensure this is maintenance (target >= current)
                        const adjustedGoal = {
                            ...goal,
                            targetWeight: Math.max(goal.targetWeight, goal.currentWeight)
                        };

                        const validation = service.validateGoal(adjustedGoal);

                        // Maintenance should always be accepted
                        expect(validation.isAccepted).toBe(true);

                        // Check if already in healthy range
                        const isHealthy = service.isHealthyMaintenanceWeight(
                            adjustedGoal.currentWeight,
                            adjustedGoal.height!,
                            adjustedGoal.unit
                        );

                        if (isHealthy) {
                            // Should suggest maintenance focus
                            const hasMaintenanceWarning = validation.warnings.some(warning =>
                                warning.toLowerCase().includes('maintenance') ||
                                warning.toLowerCase().includes('healthy weight range')
                            );
                            expect(hasMaintenanceWarning).toBe(true);
                        }
                    }
                )
            );
        });

        it('should provide appropriate encouragement messages', () => {
            return fc.assert(
                fc.property(validWeightGoalGenerator, (goal) => {
                    // Feature: vitracka-weight-management, Property 5: Healthy Weight Boundaries

                    const validation = service.validateGoal(goal);
                    const message = service.getEncouragementMessage(validation);

                    // Message should always be encouraging and supportive
                    expect(message).toBeDefined();
                    expect(message.length).toBeGreaterThan(0);

                    // Should not contain negative or shaming language
                    const negativeWords = ['bad', 'wrong', 'failure', 'impossible', 'stupid', 'ridiculous'];
                    const lowerMessage = message.toLowerCase();
                    negativeWords.forEach(word => {
                        expect(lowerMessage).not.toContain(word);
                    });

                    // Should contain positive language
                    const positiveWords = ['healthy', 'achievable', 'progress', 'safe', 'sustainable'];
                    const hasPositiveLanguage = positiveWords.some(word =>
                        lowerMessage.includes(word)
                    );
                    expect(hasPositiveLanguage).toBe(true);
                })
            );
        });

        it('should handle edge cases and extreme values safely', () => {
            return fc.assert(
                fc.property(
                    fc.record({
                        currentWeight: fc.oneof(
                            fc.float({ min: 1, max: 10 }), // Very low weight
                            fc.float({ min: 300, max: 500 }), // Very high weight
                            fc.constant(0), // Zero weight
                            fc.constant(-1) // Negative weight
                        ),
                        targetWeight: fc.oneof(
                            fc.float({ min: 1, max: 10 }),
                            fc.float({ min: 300, max: 500 }),
                            fc.constant(0),
                            fc.constant(-1)
                        ),
                        timeframe: fc.oneof(
                            fc.constant(0), // Zero timeframe
                            fc.constant(-1), // Negative timeframe
                            fc.integer({ min: 1, max: 5 }) // Very short timeframe
                        ),
                        unit: unitGenerator,
                        height: fc.option(fc.oneof(
                            fc.float({ min: 50, max: 100 }), // Very short
                            fc.float({ min: 250, max: 300 }), // Very tall
                            fc.constant(0) // Zero height
                        ), { nil: undefined })
                    }),
                    (extremeGoal) => {
                        // Feature: vitracka-weight-management, Property 5: Healthy Weight Boundaries

                        // Should not throw errors even with extreme values
                        expect(() => {
                            const validation = service.validateGoal(extremeGoal);
                            const message = service.getEncouragementMessage(validation);

                            // Basic validation should still work
                            expect(typeof validation.isAccepted).toBe('boolean');
                            expect(typeof validation.suggestsModification).toBe('boolean');
                            expect(Array.isArray(validation.warnings)).toBe(true);
                            expect(typeof message).toBe('string');
                        }).not.toThrow();
                    }
                )
            );
        });

        it('should maintain consistency in BMI calculations', () => {
            return fc.assert(
                fc.property(
                    fc.record({
                        weight: fc.float({ min: 40, max: 150, noDefaultInfinity: true, noNaN: true }),
                        height: fc.float({ min: 140, max: 200, noDefaultInfinity: true, noNaN: true }),
                        unit: unitGenerator
                    }),
                    (data) => {
                        // Feature: vitracka-weight-management, Property 5: Healthy Weight Boundaries

                        const bmi = service.calculateBMI(data.weight, data.height, data.unit);
                        const isHealthy = service.isHealthyMaintenanceWeight(data.weight, data.height, data.unit);

                        // BMI should be a positive number for valid inputs
                        expect(bmi).toBeGreaterThan(0);
                        expect(bmi).toBeLessThan(100); // Reasonable upper bound
                        expect(bmi).not.toBeNaN();

                        // Healthy weight determination should be consistent with BMI
                        if (bmi >= 18.5 && bmi <= 24.9) {
                            expect(isHealthy).toBe(true);
                        } else {
                            expect(isHealthy).toBe(false);
                        }
                    }
                )
            );
        });

        it('should provide safe recommendations when modifications are suggested', () => {
            return fc.assert(
                fc.property(
                    fc.record({
                        currentWeight: fc.float({ min: 80, max: 120 }),
                        targetWeight: fc.float({ min: 40, max: 70 }), // Aggressive target
                        timeframe: fc.integer({ min: 1, max: 10 }), // Short timeframe
                        unit: unitGenerator,
                        height: fc.float({ min: 160, max: 180 })
                    }),
                    (aggressiveGoal) => {
                        // Feature: vitracka-weight-management, Property 5: Healthy Weight Boundaries

                        const validation = service.validateGoal(aggressiveGoal);

                        if (validation.suggestsModification) {
                            // Recommended timeframe should be longer than original
                            if (validation.recommendedTimeframe) {
                                expect(validation.recommendedTimeframe).toBeGreaterThan(aggressiveGoal.timeframe);
                            }

                            // Recommended target should be higher than original (less aggressive)
                            if (validation.recommendedTarget) {
                                expect(validation.recommendedTarget).toBeGreaterThan(aggressiveGoal.targetWeight);
                            }

                            // Should have a clear reason for modification
                            expect(validation.reason).toBeDefined();
                            expect(validation.reason!.length).toBeGreaterThan(0);

                            // Should provide helpful warnings
                            expect(validation.warnings.length).toBeGreaterThan(0);
                        }
                    }
                )
            );
        });

        it('should handle invalid BMI inputs gracefully', () => {
            return fc.assert(
                fc.property(
                    fc.record({
                        weight: fc.oneof(
                            fc.constant(NaN),
                            fc.constant(0),
                            fc.constant(-1)
                        ),
                        height: fc.oneof(
                            fc.constant(NaN),
                            fc.constant(0),
                            fc.constant(-1)
                        ),
                        unit: unitGenerator
                    }),
                    (data) => {
                        // Feature: vitracka-weight-management, Property 5: Healthy Weight Boundaries

                        const bmi = service.calculateBMI(data.weight, data.height, data.unit);
                        const isHealthy = service.isHealthyMaintenanceWeight(data.weight, data.height, data.unit);

                        // Should return NaN for invalid inputs
                        expect(bmi).toBeNaN();
                        expect(isHealthy).toBe(false);
                    }
                )
            );
        });
    });
});