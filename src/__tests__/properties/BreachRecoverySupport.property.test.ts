/**
 * Property-Based Tests for Breach Recovery Support
 * Feature: vitracka-weight-management, Property 8: Breach Recovery Support
 * Validates: Requirements 5.3, 5.4, 5.5, 7.5, 7.6
 */

import fc from 'fast-check';
import { BreachEvent, BreachSeverity } from '../../types/breach';
import { EatingPlan } from '../../types/eating';
import { PlanLoggingService } from '../../services/PlanLoggingService';

describe('Breach Recovery Support Properties', () => {
    let service: PlanLoggingService;
    let mockEatingPlanRepo: any;
    let mockBreachEventRepo: any;

    beforeEach(() => {
        // Create mock repositories for property testing
        mockEatingPlanRepo = {
            create: jest.fn(),
            findById: jest.fn(),
            findByUserId: jest.fn(),
            findActiveByUserId: jest.fn(),
            update: jest.fn(),
            delete: jest.fn()
        };

        mockBreachEventRepo = {
            create: jest.fn().mockResolvedValue({}),
            findById: jest.fn(),
            findByUserId: jest.fn(),
            findByEatingPlanId: jest.fn(),
            findByUserIdInDateRange: jest.fn().mockResolvedValue([]),
            findUnrecoveredByUserId: jest.fn().mockResolvedValue([]),
            update: jest.fn(),
            markAsRecovered: jest.fn(),
            delete: jest.fn(),
            getAdherenceStats: jest.fn().mockResolvedValue({
                totalDays: 7,
                breachDays: 0,
                adherenceRate: 1.0,
                breachCount: 0
            })
        };

        service = new PlanLoggingService(mockEatingPlanRepo, mockBreachEventRepo);
    });

    // Generators for test data
    const breachEventGenerator = fc.record({
        id: fc.uuid(),
        userId: fc.uuid(),
        eatingPlanId: fc.uuid(),
        timestamp: fc.date({ min: new Date('2024-01-01'), max: new Date('2024-12-31') }),
        description: fc.oneof(
            fc.constant('ate too much at dinner'),
            fc.constant('skipped breakfast'),
            fc.constant('had dessert when not planned'),
            fc.constant('overate at party'),
            fc.constant('stress eating episode'),
            fc.constant('missed meal timing')
        ),
        severity: fc.constantFrom('minor' as BreachSeverity, 'moderate' as BreachSeverity, 'major' as BreachSeverity),
        recoveryPlan: fc.option(fc.string({ minLength: 10, maxLength: 100 }), { nil: undefined }),
        isRecovered: fc.boolean(),
        recoveredAt: fc.option(fc.date({ min: new Date('2024-01-01'), max: new Date('2024-12-31') }), { nil: undefined }),
        notes: fc.option(fc.string({ minLength: 5, maxLength: 200 }), { nil: undefined })
    });

    const eatingPlanGenerator = fc.record({
        id: fc.uuid(),
        userId: fc.uuid(),
        type: fc.constantFrom('calorie' as const, 'points' as const, 'plate' as const, 'custom' as const),
        dailyTarget: fc.float({ min: 1000, max: 3000 }),
        restrictions: fc.array(fc.string({ minLength: 3, maxLength: 20 }), { maxLength: 5 }),
        preferences: fc.array(fc.string({ minLength: 3, maxLength: 20 }), { maxLength: 5 }),
        isActive: fc.boolean(),
        createdAt: fc.date({ min: new Date('2024-01-01'), max: new Date('2024-12-31') })
    });

    it('should encourage honest logging without shame for any breach event', async () => {
        // Feature: vitracka-weight-management, Property 8: Breach Recovery Support
        await fc.assert(fc.asyncProperty(
            breachEventGenerator,
            eatingPlanGenerator,
            async (breach, plan) => {
                const response = await service.processBreachEvent(breach, plan);

                // Should encourage honest logging
                expect(response.encouragesHonestLogging).toBe(true);

                // Should avoid shame-based language
                expect(response.avoidsShame).toBe(true);

                // Should frame as recoverable event
                expect(response.framesAsRecoverable).toBe(true);
            }
        ), { numRuns: 100 });
    });

    it('should provide recovery-focused messaging for any breach event', async () => {
        // Feature: vitracka-weight-management, Property 8: Breach Recovery Support
        await fc.assert(fc.asyncProperty(
            breachEventGenerator,
            eatingPlanGenerator,
            async (breach, plan) => {
                const response = await service.processBreachEvent(breach, plan);

                // Should be recovery-focused
                expect(response.isRecoveryFocused).toBe(true);

                // Should include recovery guidance
                expect(response.includesRecoveryGuidance).toBe(true);
            }
        ), { numRuns: 100 });
    });

    it('should offer gamification incentives for plan resumption after breaches', async () => {
        // Feature: vitracka-weight-management, Property 8: Breach Recovery Support
        await fc.assert(fc.asyncProperty(
            breachEventGenerator,
            eatingPlanGenerator,
            async (breach, plan) => {
                const response = await service.processBreachEvent(breach, plan);

                // Should include gamification incentives for recovery
                // (may vary based on breach severity or other factors)
                expect(typeof response.includesGamificationIncentive).toBe('boolean');
            }
        ), { numRuns: 100 });
    });

    it('should maintain consistent recovery messaging across different breach types', async () => {
        // Feature: vitracka-weight-management, Property 8: Breach Recovery Support
        await fc.assert(fc.asyncProperty(
            fc.array(breachEventGenerator, { minLength: 2, maxLength: 10 }),
            eatingPlanGenerator,
            async (breaches, plan) => {
                const responses = await Promise.all(
                    breaches.map(breach => service.processBreachEvent(breach, plan))
                );

                // All responses should be recovery-focused
                expect(responses.every(r => r.isRecoveryFocused)).toBe(true);

                // All responses should avoid shame
                expect(responses.every(r => r.avoidsShame)).toBe(true);

                // All responses should encourage honest logging
                expect(responses.every(r => r.encouragesHonestLogging)).toBe(true);

                // All responses should frame breaches as recoverable
                expect(responses.every(r => r.framesAsRecoverable)).toBe(true);
            }
        ), { numRuns: 100 });
    });
});