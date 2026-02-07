/**
 * Property-Based Tests for Adherence Tracking Accuracy
 * Feature: vitracka-weight-management, Property 9: Adherence Tracking Accuracy
 * Validates: Requirements 5.2
 */

import fc from 'fast-check';
import { BreachEvent } from '../../types/breach';
import { PlanLoggingService } from '../../services/PlanLoggingService';

describe('Adherence Tracking Accuracy Properties', () => {
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
            create: jest.fn(),
            findById: jest.fn(),
            findByUserId: jest.fn(),
            findByEatingPlanId: jest.fn(),
            findByUserIdInDateRange: jest.fn(),
            findUnrecoveredByUserId: jest.fn().mockResolvedValue([]),
            update: jest.fn(),
            markAsRecovered: jest.fn(),
            delete: jest.fn(),
            getAdherenceStats: jest.fn()
        };

        service = new PlanLoggingService(mockEatingPlanRepo, mockBreachEventRepo);
    });

    // Generators for test data
    const breachEventGenerator = fc.record({
        id: fc.uuid(),
        userId: fc.uuid(),
        eatingPlanId: fc.uuid(),
        timestamp: fc.date({ min: new Date('2024-01-01'), max: new Date('2024-12-31') }),
        description: fc.string({ minLength: 5, maxLength: 100 }),
        severity: fc.constantFrom('minor' as const, 'moderate' as const, 'major' as const),
        recoveryPlan: fc.option(fc.string(), { nil: undefined }),
        isRecovered: fc.boolean(),
        recoveredAt: fc.option(fc.date(), { nil: undefined }),
        notes: fc.option(fc.string(), { nil: undefined })
    });

    it('should calculate accurate adherence rates for any eating plan and logging history', async () => {
        // Feature: vitracka-weight-management, Property 9: Adherence Tracking Accuracy
        await fc.assert(fc.asyncProperty(
            fc.array(breachEventGenerator, { maxLength: 50 }),
            fc.integer({ min: 1, max: 100 }),
            async (breachEvents, totalDays) => {
                const startDate = new Date('2024-01-01');
                const endDate = new Date(startDate.getTime() + (totalDays - 1) * 24 * 60 * 60 * 1000);

                // Calculate expected values
                const uniqueBreachDays = new Set(
                    breachEvents.map(e => e.timestamp.toDateString())
                ).size;
                const expectedAdherentDays = Math.max(0, totalDays - uniqueBreachDays);
                const expectedAdherenceRate = expectedAdherentDays / totalDays;

                // Mock the repository response
                mockBreachEventRepo.getAdherenceStats.mockResolvedValue({
                    totalDays,
                    breachDays: uniqueBreachDays,
                    adherenceRate: expectedAdherenceRate,
                    breachCount: breachEvents.length
                });

                mockBreachEventRepo.findByUserIdInDateRange.mockResolvedValue(breachEvents);

                const metrics = await service.calculateAdherence('user-123', 'plan-123', startDate, endDate);

                // Adherence rate should be between 0 and 1
                expect(metrics.adherenceRate).toBeGreaterThanOrEqual(0);
                expect(metrics.adherenceRate).toBeLessThanOrEqual(1);

                // Should match expected calculations
                expect(metrics.totalDays).toBe(totalDays);
                expect(metrics.adherentDays).toBe(expectedAdherentDays);
                expect(metrics.adherenceRate).toBeCloseTo(expectedAdherenceRate, 5);

                // If no breaches, adherence should be 1
                if (breachEvents.length === 0) {
                    expect(metrics.adherenceRate).toBe(1);
                }
            }
        ), { numRuns: 100 });
    });

    it('should track adherence consistently over time periods', async () => {
        // Feature: vitracka-weight-management, Property 9: Adherence Tracking Accuracy
        await fc.assert(fc.asyncProperty(
            fc.array(breachEventGenerator, { maxLength: 30 }),
            fc.date({ min: new Date('2024-01-01'), max: new Date('2024-06-01') }),
            fc.integer({ min: 1, max: 30 }),
            async (breachEvents, startDate, durationDays) => {
                const endDate = new Date(startDate.getTime() + durationDays * 24 * 60 * 60 * 1000);

                // Filter events to the time period
                const periodEvents = breachEvents.filter(event =>
                    event.timestamp >= startDate && event.timestamp <= endDate
                );

                const uniqueBreachDays = new Set(
                    periodEvents.map(e => e.timestamp.toDateString())
                ).size;

                // Mock the repository response
                mockBreachEventRepo.getAdherenceStats.mockResolvedValue({
                    totalDays: durationDays + 1,
                    breachDays: uniqueBreachDays,
                    adherenceRate: Math.max(0, (durationDays + 1 - uniqueBreachDays) / (durationDays + 1)),
                    breachCount: periodEvents.length
                });

                mockBreachEventRepo.findByUserIdInDateRange.mockResolvedValue(periodEvents);

                const metrics = await service.calculateAdherence('user-123', 'plan-123', startDate, endDate);

                // Should have valid metrics
                expect(metrics.totalDays).toBe(durationDays + 1);
                expect(metrics.adherenceRate).toBeGreaterThanOrEqual(0);
                expect(metrics.adherenceRate).toBeLessThanOrEqual(1);
                expect(metrics.breachCount).toBe(periodEvents.length);
            }
        ), { numRuns: 100 });
    });

    it('should calculate weekly adherence metrics accurately', async () => {
        // Feature: vitracka-weight-management, Property 9: Adherence Tracking Accuracy
        await fc.assert(fc.asyncProperty(
            fc.array(breachEventGenerator, { maxLength: 20 }),
            fc.integer({ min: 1, max: 12 }),
            async (breachEvents, weeks) => {
                // Mock the repository to return consistent stats for each week
                mockBreachEventRepo.getAdherenceStats.mockImplementation(() =>
                    Promise.resolve({
                        totalDays: 7,
                        breachDays: Math.min(7, Math.floor(Math.random() * 3)),
                        adherenceRate: 0.5 + Math.random() * 0.5,
                        breachCount: Math.floor(Math.random() * 5)
                    })
                );

                const trends = await service.getAdherenceTrends('user-123', weeks);

                // Should return the requested number of weeks
                expect(trends.length).toBe(weeks);

                // Each week's rate should be between 0 and 1
                trends.forEach(trend => {
                    expect(trend.adherenceRate).toBeGreaterThanOrEqual(0);
                    expect(trend.adherenceRate).toBeLessThanOrEqual(1);
                    expect(trend.breachCount).toBeGreaterThanOrEqual(0);
                    expect(trend.week).toBeGreaterThan(0);
                    expect(trend.week).toBeLessThanOrEqual(weeks);
                });

                // Weeks should be in chronological order
                for (let i = 1; i < trends.length; i++) {
                    expect(trends[i].week).toBe(trends[i - 1].week + 1);
                }
            }
        ), { numRuns: 100 });
    });

    it('should handle edge cases in adherence calculation', async () => {
        // Feature: vitracka-weight-management, Property 9: Adherence Tracking Accuracy
        await fc.assert(fc.asyncProperty(
            fc.array(breachEventGenerator, { maxLength: 10 }),
            async (breachEvents) => {
                const startDate = new Date('2024-01-01');

                // Test zero days - should handle gracefully
                mockBreachEventRepo.getAdherenceStats.mockResolvedValue({
                    totalDays: 0,
                    breachDays: 0,
                    adherenceRate: 0,
                    breachCount: 0
                });
                mockBreachEventRepo.findByUserIdInDateRange.mockResolvedValue([]);

                const zeroMetrics = await service.calculateAdherence('user-123', 'plan-123', startDate, startDate);
                expect(zeroMetrics.adherenceRate).toBeGreaterThanOrEqual(0);
                expect(zeroMetrics.adherenceRate).toBeLessThanOrEqual(1);

                // Test with no breaches - should return 1.0 adherence
                mockBreachEventRepo.getAdherenceStats.mockResolvedValue({
                    totalDays: 10,
                    breachDays: 0,
                    adherenceRate: 1.0,
                    breachCount: 0
                });
                mockBreachEventRepo.findByUserIdInDateRange.mockResolvedValue([]);

                const endDate = new Date(startDate.getTime() + 9 * 24 * 60 * 60 * 1000);
                const perfectMetrics = await service.calculateAdherence('user-123', 'plan-123', startDate, endDate);
                expect(perfectMetrics.adherenceRate).toBe(1.0);
            }
        ), { numRuns: 100 });
    });

    it('should maintain adherence calculation consistency across multiple calls', async () => {
        // Feature: vitracka-weight-management, Property 9: Adherence Tracking Accuracy
        await fc.assert(fc.asyncProperty(
            fc.array(breachEventGenerator, { maxLength: 20 }),
            fc.integer({ min: 1, max: 50 }),
            async (breachEvents, totalDays) => {
                const startDate = new Date('2024-01-01');
                const endDate = new Date(startDate.getTime() + (totalDays - 1) * 24 * 60 * 60 * 1000);

                const uniqueBreachDays = new Set(
                    breachEvents.map(e => e.timestamp.toDateString())
                ).size;

                const mockStats = {
                    totalDays,
                    breachDays: uniqueBreachDays,
                    adherenceRate: Math.max(0, (totalDays - uniqueBreachDays) / totalDays),
                    breachCount: breachEvents.length
                };

                // Mock consistent responses
                mockBreachEventRepo.getAdherenceStats.mockResolvedValue(mockStats);
                mockBreachEventRepo.findByUserIdInDateRange.mockResolvedValue(breachEvents);

                const metrics1 = await service.calculateAdherence('user-123', 'plan-123', startDate, endDate);
                const metrics2 = await service.calculateAdherence('user-123', 'plan-123', startDate, endDate);

                // Multiple calls with same data should return same result
                expect(metrics1.adherenceRate).toBe(metrics2.adherenceRate);
                expect(metrics1.totalDays).toBe(metrics2.totalDays);
                expect(metrics1.breachCount).toBe(metrics2.breachCount);
            }
        ), { numRuns: 100 });
    });
});