/**
 * Unit Tests for Plan & Logging Service
 * Tests specific examples and edge cases for eating plan breach logging and recovery
 */

import { PlanLoggingService } from '../../../services/PlanLoggingService';
import { EatingPlan } from '../../../types/eating';
import { BreachEvent } from '../../../types/breach';

describe('PlanLoggingService', () => {
    let service: PlanLoggingService;
    let mockEatingPlanRepo: any;
    let mockBreachEventRepo: any;

    const sampleEatingPlan: EatingPlan = {
        id: 'plan-123',
        userId: 'user-123',
        type: 'calorie',
        dailyTarget: 1800,
        restrictions: ['gluten'],
        preferences: ['vegetarian'],
        isActive: true,
        createdAt: new Date('2024-01-01')
    };

    const sampleBreach: BreachEvent = {
        id: 'breach-123',
        userId: 'user-123',
        eatingPlanId: 'plan-123',
        timestamp: new Date('2024-01-15T14:30:00Z'),
        description: 'ate too much at lunch',
        severity: 'moderate',
        isRecovered: false
    };

    beforeEach(() => {
        // Create mock repositories
        mockEatingPlanRepo = {
            create: jest.fn(),
            findById: jest.fn(),
            findByUserId: jest.fn(),
            findActiveByUserId: jest.fn(),
            update: jest.fn(),
            delete: jest.fn()
        };

        mockBreachEventRepo = {
            create: jest.fn().mockResolvedValue(sampleBreach),
            findById: jest.fn(),
            findByUserId: jest.fn(),
            findByEatingPlanId: jest.fn(),
            findByUserIdInDateRange: jest.fn().mockResolvedValue([sampleBreach]),
            findUnrecoveredByUserId: jest.fn().mockResolvedValue([sampleBreach]),
            update: jest.fn(),
            markAsRecovered: jest.fn().mockResolvedValue({
                ...sampleBreach,
                isRecovered: true,
                recoveredAt: new Date()
            }),
            delete: jest.fn(),
            getAdherenceStats: jest.fn().mockResolvedValue({
                totalDays: 7,
                breachDays: 2,
                adherenceRate: 0.714,
                breachCount: 3
            })
        };

        // Inject mocked repositories into service
        service = new PlanLoggingService(mockEatingPlanRepo, mockBreachEventRepo);
    });

    describe('processBreachEvent', () => {
        it('should process breach with recovery-focused response', async () => {
            const response = await service.processBreachEvent(sampleBreach, sampleEatingPlan);

            expect(response.isRecoveryFocused).toBe(true);
            expect(response.avoidsShame).toBe(true);
            expect(response.includesRecoveryGuidance).toBe(true);
            expect(response.encouragesHonestLogging).toBe(true);
            expect(response.framesAsRecoverable).toBe(true);
            expect(mockBreachEventRepo.create).toHaveBeenCalledWith(sampleBreach);
        });

        it('should detect shame-based language in breach descriptions', async () => {
            const shameBreach = {
                ...sampleBreach,
                description: 'I failed completely and ate terrible food'
            };

            const response = await service.processBreachEvent(shameBreach, sampleEatingPlan);

            expect(response.avoidsShame).toBe(false);
        });

        it('should include gamification incentives for moderate and major breaches', async () => {
            const moderateBreach = { ...sampleBreach, severity: 'moderate' as const };
            const majorBreach = { ...sampleBreach, severity: 'major' as const };
            const minorBreach = { ...sampleBreach, severity: 'minor' as const };

            const moderateResponse = await service.processBreachEvent(moderateBreach, sampleEatingPlan);
            const majorResponse = await service.processBreachEvent(majorBreach, sampleEatingPlan);
            const minorResponse = await service.processBreachEvent(minorBreach, sampleEatingPlan);

            expect(moderateResponse.includesGamificationIncentive).toBe(true);
            expect(majorResponse.includesGamificationIncentive).toBe(true);
            expect(minorResponse.includesGamificationIncentive).toBe(false);
        });
    });

    describe('calculateAdherence', () => {
        it('should calculate accurate adherence metrics', async () => {
            const startDate = new Date('2024-01-01');
            const endDate = new Date('2024-01-07');

            const metrics = await service.calculateAdherence('user-123', 'plan-123', startDate, endDate);

            expect(metrics.userId).toBe('user-123');
            expect(metrics.eatingPlanId).toBe('plan-123');
            expect(metrics.totalDays).toBe(7);
            expect(metrics.adherentDays).toBe(5);
            expect(metrics.adherenceRate).toBeCloseTo(0.714, 3);
            expect(metrics.breachCount).toBe(3);
        });

        it('should determine correct period type', async () => {
            const dailyStart = new Date('2024-01-01');
            const dailyEnd = new Date('2024-01-01');
            const weeklyStart = new Date('2024-01-01');
            const weeklyEnd = new Date('2024-01-07');
            const monthlyStart = new Date('2024-01-01');
            const monthlyEnd = new Date('2024-01-31');

            const dailyMetrics = await service.calculateAdherence('user-123', 'plan-123', dailyStart, dailyEnd);
            const weeklyMetrics = await service.calculateAdherence('user-123', 'plan-123', weeklyStart, weeklyEnd);
            const monthlyMetrics = await service.calculateAdherence('user-123', 'plan-123', monthlyStart, monthlyEnd);

            expect(dailyMetrics.period).toBe('daily');
            expect(weeklyMetrics.period).toBe('weekly');
            expect(monthlyMetrics.period).toBe('monthly');
        });
    });

    describe('logBreach', () => {
        it('should log breach and provide recovery guidance', async () => {
            const result = await service.logBreach(
                'user-123',
                'plan-123',
                'ate too much dessert',
                'minor',
                'was at a party'
            );

            expect(result.breach).toBeDefined();
            expect(result.guidance).toBeDefined();
            expect(typeof result.guidance).toBe('string');
            expect(result.guidance.length).toBeGreaterThan(0);
            expect(mockBreachEventRepo.create).toHaveBeenCalled();
        });

        it('should provide appropriate guidance based on severity', async () => {
            const minorResult = await service.logBreach('user-123', 'plan-123', 'small snack', 'minor');
            const moderateResult = await service.logBreach('user-123', 'plan-123', 'large meal', 'moderate');
            const majorResult = await service.logBreach('user-123', 'plan-123', 'binge episode', 'major');

            expect(minorResult.guidance).toBeDefined();
            expect(moderateResult.guidance).toBeDefined();
            expect(majorResult.guidance).toBeDefined();

            // All guidance should be encouraging and non-judgmental
            expect(minorResult.guidance).not.toContain('failure');
            expect(moderateResult.guidance).not.toContain('bad');
            expect(majorResult.guidance).not.toContain('terrible');
        });
    });

    describe('markBreachRecovered', () => {
        it('should mark breach as recovered with recovery plan', async () => {
            const recoveryPlan = 'planned next meal and went for a walk';

            const result = await service.markBreachRecovered('breach-123', recoveryPlan);

            expect(result).toBeDefined();
            expect(result?.isRecovered).toBe(true);
            expect(mockBreachEventRepo.markAsRecovered).toHaveBeenCalledWith('breach-123', recoveryPlan);
        });
    });

    describe('getAdherenceTrends', () => {
        it('should return adherence trends over specified weeks', async () => {
            const trends = await service.getAdherenceTrends('user-123', 4);

            expect(trends).toHaveLength(4);
            expect(trends[0].week).toBe(1);
            expect(trends[3].week).toBe(4);

            trends.forEach(trend => {
                expect(trend.adherenceRate).toBeGreaterThanOrEqual(0);
                expect(trend.adherenceRate).toBeLessThanOrEqual(1);
                expect(trend.breachCount).toBeGreaterThanOrEqual(0);
            });
        });
    });

    describe('getUnrecoveredBreaches', () => {
        it('should return unrecovered breaches for follow-up', async () => {
            const breaches = await service.getUnrecoveredBreaches('user-123');

            expect(breaches).toHaveLength(1);
            expect(breaches[0].isRecovered).toBe(false);
            expect(mockBreachEventRepo.findUnrecoveredByUserId).toHaveBeenCalledWith('user-123');
        });
    });
});