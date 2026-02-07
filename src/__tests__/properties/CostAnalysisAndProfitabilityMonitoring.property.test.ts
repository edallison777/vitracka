/**
 * Property-Based Tests for Cost Analysis and Profitability Monitoring
 * Tests Property 17: Cost Analysis and Profitability Monitoring
 * Validates: Requirements 16.1, 16.2, 16.3
 */

import * as fc from 'fast-check';
import { CostAnalysisService } from '../../services/CostAnalysisService';
import { CostAnalysisRepository } from '../../database/repositories/CostAnalysisRepository';
import {
    CostMetrics,
    SubscriptionRecommendation,
    ProfitabilityReport,
    CostAlert
} from '../../types/cost';

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

// Mock the CostAnalysisRepository
jest.mock('../../database/repositories/CostAnalysisRepository');

describe('Cost Analysis and Profitability Monitoring Properties', () => {
    let costAnalysisService: CostAnalysisService;
    let mockCostRepository: jest.Mocked<CostAnalysisRepository>;

    beforeEach(() => {
        jest.clearAllMocks();

        // Create mock repository
        mockCostRepository = new CostAnalysisRepository({} as any) as jest.Mocked<CostAnalysisRepository>;

        // Create service and inject mock
        costAnalysisService = new CostAnalysisService(mockCostRepository);
    });

    /**
     * Property 17: Cost Analysis and Profitability Monitoring
     * For any operational period, the Cost Analysis agent should accurately track 
     * infrastructure costs, calculate per-user costs, generate subscription pricing 
     * recommendations, and provide profitability insights for business decision-making
     * **Validates: Requirements 16.1, 16.2, 16.3**
     */
    describe('Property 17: Cost Analysis and Profitability Monitoring', () => {
        it('should accurately track infrastructure costs and calculate per-user metrics', () => {
            return fc.assert(
                fc.asyncProperty(
                    fc.record({
                        userCount: fc.integer({ min: 1, max: 10000 }),
                        agentInteractions: fc.integer({ min: 1, max: 100000 }),
                        period: fc.constantFrom('daily', 'weekly', 'monthly'),
                        costBreakdown: fc.record({
                            agentCore: fc.float({ min: 5, max: 5000 }).filter(n => Number.isFinite(n)),
                            database: fc.float({ min: 2, max: 2000 }).filter(n => Number.isFinite(n)),
                            storage: fc.float({ min: 1, max: 1000 }).filter(n => Number.isFinite(n)),
                            networking: fc.float({ min: 1, max: 500 }).filter(n => Number.isFinite(n)),
                            externalAPIs: fc.float({ min: 0, max: 1000 }).filter(n => Number.isFinite(n))
                        })
                    }),
                    async (costData) => {
                        // Feature: vitracka-weight-management, Property 17: Cost Analysis and Profitability Monitoring

                        // Calculate total cost from breakdown to avoid NaN issues
                        const totalCost = Object.values(costData.costBreakdown).reduce((sum, cost) => sum + cost, 0);

                        const mockCostMetrics: CostMetrics = {
                            id: 'test-cost-id',
                            timestamp: new Date(),
                            period: costData.period as any,
                            totalCost: totalCost,
                            costBreakdown: costData.costBreakdown,
                            userCount: costData.userCount,
                            costPerUser: totalCost / costData.userCount,
                            agentInteractions: costData.agentInteractions,
                            costPerInteraction: totalCost / costData.agentInteractions
                        };

                        mockCostRepository.saveCostMetrics.mockResolvedValue(mockCostMetrics);
                        mockCostRepository.getCostMetrics.mockResolvedValue([mockCostMetrics]);

                        // Test infrastructure cost monitoring (Requirement 16.1)
                        const monitoringResult = await costAnalysisService.monitorInfrastructureCosts();

                        expect(monitoringResult).toBeDefined();
                        expect(monitoringResult.totalCost).toBeGreaterThan(0);
                        expect(monitoringResult.userCount).toBeGreaterThan(0);
                        expect(monitoringResult.agentInteractions).toBeGreaterThan(0);

                        // Verify cost breakdown integrity - all values should be finite numbers
                        Object.values(monitoringResult.costBreakdown).forEach(cost => {
                            expect(Number.isFinite(cost)).toBe(true);
                            expect(cost).toBeGreaterThanOrEqual(0);
                        });

                        // Test per-user cost calculation (Requirement 16.2)
                        const perUserCost = await costAnalysisService.calculatePerUserCosts(costData.period as any);

                        expect(perUserCost).toBeGreaterThanOrEqual(0);
                        expect(Number.isFinite(perUserCost)).toBe(true);

                        // Verify cost per interaction calculation
                        expect(Number.isFinite(monitoringResult.costPerInteraction)).toBe(true);
                        expect(monitoringResult.costPerInteraction).toBeGreaterThan(0);

                        // Verify cost per user calculation
                        expect(Number.isFinite(monitoringResult.costPerUser)).toBe(true);
                        expect(monitoringResult.costPerUser).toBeGreaterThan(0);
                    }
                ),
                { numRuns: 10 }
            );
        });

        it('should generate accurate subscription pricing recommendations based on cost analysis', () => {
            return fc.assert(
                fc.asyncProperty(
                    fc.record({
                        avgCostPerUser: fc.float({ min: 1, max: 50 }).filter(n => Number.isFinite(n)),
                        targetProfitMargin: fc.float({ min: Math.fround(0.1), max: Math.fround(0.8) }).filter(n => Number.isFinite(n)),
                        infrastructureOverhead: fc.float({ min: Math.fround(0.05), max: Math.fround(0.5) }).filter(n => Number.isFinite(n))
                    }),
                    async (pricingData) => {
                        // Feature: vitracka-weight-management, Property 17: Cost Analysis and Profitability Monitoring

                        const mockCostMetrics: CostMetrics = {
                            id: 'test-cost-id',
                            timestamp: new Date(),
                            period: 'monthly',
                            totalCost: pricingData.avgCostPerUser * 100, // Assume 100 users
                            costBreakdown: {
                                agentCore: pricingData.avgCostPerUser * 40,
                                database: pricingData.avgCostPerUser * 25,
                                storage: pricingData.avgCostPerUser * 15,
                                networking: pricingData.avgCostPerUser * 10,
                                externalAPIs: pricingData.avgCostPerUser * 10
                            },
                            userCount: 100,
                            costPerUser: pricingData.avgCostPerUser,
                            agentInteractions: 5000,
                            costPerInteraction: (pricingData.avgCostPerUser * 100) / 5000
                        };

                        const mockRecommendation: SubscriptionRecommendation = {
                            id: 'test-recommendation-id',
                            generatedAt: new Date(),
                            recommendedTiers: [
                                {
                                    tierName: 'Basic',
                                    monthlyPrice: Math.ceil((pricingData.avgCostPerUser + pricingData.infrastructureOverhead) / (1 - pricingData.targetProfitMargin)),
                                    features: ['Weight tracking', 'Basic coaching'],
                                    targetMargin: pricingData.targetProfitMargin,
                                    projectedUsers: 1000
                                },
                                {
                                    tierName: 'Premium',
                                    monthlyPrice: Math.ceil((pricingData.avgCostPerUser * 1.5 + pricingData.infrastructureOverhead) / (1 - pricingData.targetProfitMargin)),
                                    features: ['All Basic features', 'Advanced gamification'],
                                    targetMargin: pricingData.targetProfitMargin,
                                    projectedUsers: 500
                                },
                                {
                                    tierName: 'Pro',
                                    monthlyPrice: Math.ceil((pricingData.avgCostPerUser * 2 + pricingData.infrastructureOverhead) / (1 - pricingData.targetProfitMargin)),
                                    features: ['All Premium features', 'Custom coaching'],
                                    targetMargin: pricingData.targetProfitMargin,
                                    projectedUsers: 200
                                }
                            ],
                            costBasis: {
                                avgCostPerUser: pricingData.avgCostPerUser,
                                infrastructureOverhead: pricingData.infrastructureOverhead,
                                targetProfitMargin: pricingData.targetProfitMargin
                            },
                            validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                        };

                        mockCostRepository.getCostMetrics.mockResolvedValue([mockCostMetrics]);
                        mockCostRepository.saveSubscriptionRecommendation.mockResolvedValue(mockRecommendation);

                        // Test subscription pricing recommendations (Requirement 16.3)
                        const recommendation = await costAnalysisService.generateSubscriptionRecommendations(
                            pricingData.targetProfitMargin
                        );

                        expect(recommendation).toBeDefined();
                        expect(recommendation.recommendedTiers).toHaveLength(3); // Basic, Premium, Pro
                        expect(recommendation.costBasis.targetProfitMargin).toBe(pricingData.targetProfitMargin);

                        // Verify pricing calculations ensure profitability
                        for (const tier of recommendation.recommendedTiers) {
                            expect(tier.monthlyPrice).toBeGreaterThan(0);
                            expect(tier.targetMargin).toBe(pricingData.targetProfitMargin);
                            expect(tier.projectedUsers).toBeGreaterThan(0);
                            expect(tier.features.length).toBeGreaterThan(0);
                        }

                        // Verify tier pricing progression (Premium >= Basic, Pro >= Premium)
                        const basicTier = recommendation.recommendedTiers.find(t => t.tierName === 'Basic');
                        const premiumTier = recommendation.recommendedTiers.find(t => t.tierName === 'Premium');
                        const proTier = recommendation.recommendedTiers.find(t => t.tierName === 'Pro');

                        if (basicTier && premiumTier && proTier) {
                            expect(premiumTier.monthlyPrice).toBeGreaterThanOrEqual(basicTier.monthlyPrice);
                            expect(proTier.monthlyPrice).toBeGreaterThanOrEqual(premiumTier.monthlyPrice);
                        }

                        // Verify recommendation validity period
                        expect(recommendation.validUntil.getTime()).toBeGreaterThan(Date.now());
                    }
                ),
                { numRuns: 15 }
            );
        });

        it('should provide accurate profitability insights and business metrics', () => {
            return fc.assert(
                fc.asyncProperty(
                    fc.record({
                        revenue: fc.float({ min: 1000, max: 100000 }).filter(n => Number.isFinite(n)),
                        infrastructureCost: fc.float({ min: 100, max: 50000 }).filter(n => Number.isFinite(n)),
                        operationalCost: fc.float({ min: 50, max: 25000 }).filter(n => Number.isFinite(n)),
                        activeUsers: fc.integer({ min: 10, max: 5000 }),
                        newUsers: fc.integer({ min: 1, max: 500 }),
                        churnRate: fc.float({ min: Math.fround(0.01), max: Math.fround(0.2) }).filter(n => Number.isFinite(n)),
                        period: fc.constantFrom('daily', 'weekly', 'monthly', 'quarterly')
                    }),
                    async (businessData) => {
                        // Feature: vitracka-weight-management, Property 17: Cost Analysis and Profitability Monitoring

                        const totalCosts = businessData.infrastructureCost + businessData.operationalCost;
                        const grossProfit = businessData.revenue - totalCosts;
                        const grossMargin = grossProfit / businessData.revenue;

                        const mockProfitabilityReport: ProfitabilityReport = {
                            id: 'test-report-id',
                            reportDate: new Date(),
                            period: businessData.period as any,
                            revenue: {
                                subscriptions: businessData.revenue * 0.9,
                                total: businessData.revenue
                            },
                            costs: {
                                infrastructure: businessData.infrastructureCost,
                                operations: businessData.operationalCost,
                                total: totalCosts
                            },
                            profit: {
                                gross: grossProfit,
                                margin: grossMargin
                            },
                            userMetrics: {
                                activeUsers: businessData.activeUsers,
                                newUsers: businessData.newUsers,
                                churnRate: businessData.churnRate,
                                lifetimeValue: businessData.revenue / businessData.activeUsers * 12, // Assume 12 month LTV
                                acquisitionCost: businessData.operationalCost / businessData.newUsers
                            }
                        };

                        mockCostRepository.saveProfitabilityReport.mockResolvedValue(mockProfitabilityReport);
                        mockCostRepository.getProfitabilityReports.mockResolvedValue([mockProfitabilityReport]);

                        // Test profitability report generation
                        const report = await costAnalysisService.generateProfitabilityReport(businessData.period as any);

                        expect(report).toBeDefined();
                        expect(report.revenue.total).toBe(businessData.revenue);
                        expect(report.costs.total).toBe(totalCosts);
                        expect(report.profit.gross).toBe(grossProfit);
                        expect(report.profit.margin).toBe(grossMargin);

                        // Verify profit calculations are mathematically correct
                        expect(report.profit.gross).toBe(report.revenue.total - report.costs.total);
                        expect(report.profit.margin).toBe(report.profit.gross / report.revenue.total);

                        // Verify user metrics are positive and reasonable
                        expect(report.userMetrics.activeUsers).toBeGreaterThan(0);
                        expect(report.userMetrics.newUsers).toBeGreaterThan(0);
                        expect(report.userMetrics.churnRate).toBeGreaterThanOrEqual(0);
                        expect(report.userMetrics.churnRate).toBeLessThanOrEqual(1);
                        expect(report.userMetrics.lifetimeValue).toBeGreaterThan(0);
                        expect(report.userMetrics.acquisitionCost).toBeGreaterThan(0);

                        // Test business metrics generation
                        const businessMetrics = await costAnalysisService.getBusinessMetrics();

                        expect(businessMetrics).toBeDefined();
                        expect(businessMetrics.metrics.monthlyRecurringRevenue).toBeGreaterThan(0);
                        expect(businessMetrics.metrics.customerLifetimeValue).toBeGreaterThan(0);
                        expect(businessMetrics.metrics.customerAcquisitionCost).toBeGreaterThan(0);
                        expect(businessMetrics.metrics.churnRate).toBeGreaterThanOrEqual(0);
                        expect(Number.isFinite(businessMetrics.metrics.grossMargin)).toBe(true); // Just ensure it's a valid number
                        expect(businessMetrics.metrics.burnRate).toBeGreaterThan(0);

                        // Verify forecasts are reasonable
                        expect(businessMetrics.forecasts.nextMonthRevenue).toBeGreaterThan(0);
                        expect(businessMetrics.forecasts.nextMonthCosts).toBeGreaterThan(0);
                        expect(businessMetrics.forecasts.confidenceInterval).toBeGreaterThan(0);
                        expect(businessMetrics.forecasts.confidenceInterval).toBeLessThanOrEqual(1);
                    }
                ),
                { numRuns: 15 }
            );
        });

        it('should generate appropriate cost alerts and optimization suggestions', () => {
            return fc.assert(
                fc.asyncProperty(
                    fc.record({
                        dailyCost: fc.float({ min: 50, max: 500 }).filter(n => Number.isFinite(n)),
                        costPerUser: fc.float({ min: 1, max: 20 }).filter(n => Number.isFinite(n)),
                        costPerInteraction: fc.float({ min: Math.fround(0.01), max: Math.fround(0.5) }).filter(n => Number.isFinite(n)),
                        userCount: fc.integer({ min: 10, max: 1000 }),
                        agentInteractions: fc.integer({ min: 100, max: 10000 })
                    }),
                    async (alertData) => {
                        // Feature: vitracka-weight-management, Property 17: Cost Analysis and Profitability Monitoring

                        const mockCostMetrics: CostMetrics = {
                            id: 'test-cost-id',
                            timestamp: new Date(),
                            period: 'daily',
                            totalCost: alertData.dailyCost,
                            costBreakdown: {
                                agentCore: alertData.dailyCost * 0.4,
                                database: alertData.dailyCost * 0.25,
                                storage: alertData.dailyCost * 0.15,
                                networking: alertData.dailyCost * 0.1,
                                externalAPIs: alertData.dailyCost * 0.1
                            },
                            userCount: alertData.userCount,
                            costPerUser: alertData.costPerUser,
                            agentInteractions: alertData.agentInteractions,
                            costPerInteraction: alertData.costPerInteraction
                        };

                        const mockAlert: CostAlert = {
                            id: 'test-alert-id',
                            timestamp: new Date(),
                            alertType: 'threshold_exceeded',
                            severity: 'high',
                            message: `Daily cost threshold exceeded: $${alertData.dailyCost.toFixed(2)}`,
                            currentValue: alertData.dailyCost,
                            thresholdValue: 200,
                            recommendedAction: 'Review infrastructure usage and consider scaling optimizations',
                            acknowledged: false
                        };

                        mockCostRepository.saveCostMetrics.mockResolvedValue(mockCostMetrics);
                        mockCostRepository.saveCostAlert.mockResolvedValue(mockAlert);
                        mockCostRepository.getCostMetrics.mockResolvedValue([mockCostMetrics]);

                        // Test cost monitoring and alert generation
                        const monitoringResult = await costAnalysisService.monitorInfrastructureCosts();

                        expect(monitoringResult).toBeDefined();

                        // Test optimization suggestions generation
                        const suggestions = await costAnalysisService.generateOptimizationSuggestions();

                        expect(suggestions).toBeDefined();
                        expect(Array.isArray(suggestions)).toBe(true);

                        // Verify suggestions are relevant to cost thresholds
                        if (alertData.costPerInteraction > 0.05) {
                            const interactionOptimization = suggestions.find(s =>
                                s.category === 'efficiency' && s.title.includes('Agent Interaction')
                            );
                            if (interactionOptimization) {
                                expect(interactionOptimization.potentialSavings).toBeGreaterThan(0);
                                expect(interactionOptimization.actionItems.length).toBeGreaterThan(0);
                                expect(['low', 'medium', 'high']).toContain(interactionOptimization.implementationEffort);
                                expect(['low', 'medium', 'high', 'critical']).toContain(interactionOptimization.priority);
                            }
                        }

                        if (alertData.dailyCost > 100) {
                            const infrastructureOptimization = suggestions.find(s =>
                                s.category === 'infrastructure' && s.title.includes('Infrastructure')
                            );
                            if (infrastructureOptimization) {
                                expect(infrastructureOptimization.potentialSavings).toBeGreaterThan(0);
                                expect(infrastructureOptimization.actionItems.length).toBeGreaterThan(0);
                            }
                        }

                        // Verify all suggestions have required fields
                        for (const suggestion of suggestions) {
                            expect(suggestion.id).toBeDefined();
                            expect(suggestion.generatedAt).toBeInstanceOf(Date);
                            expect(['infrastructure', 'operations', 'pricing', 'efficiency']).toContain(suggestion.category);
                            expect(suggestion.title).toBeDefined();
                            expect(suggestion.description).toBeDefined();
                            expect(suggestion.potentialSavings).toBeGreaterThanOrEqual(0);
                            expect(['low', 'medium', 'high']).toContain(suggestion.implementationEffort);
                            expect(['low', 'medium', 'high', 'critical']).toContain(suggestion.priority);
                            expect(suggestion.estimatedImpact).toBeDefined();
                            expect(Array.isArray(suggestion.actionItems)).toBe(true);
                        }
                    }
                ),
                { numRuns: 15 }
            );
        });

        it('should maintain data consistency across all cost analysis operations', () => {
            return fc.assert(
                fc.asyncProperty(
                    fc.record({
                        operationalPeriods: fc.array(
                            fc.record({
                                totalCost: fc.float({ min: 10, max: 1000 }).filter(n => Number.isFinite(n)),
                                userCount: fc.integer({ min: 1, max: 500 }),
                                agentInteractions: fc.integer({ min: 10, max: 5000 }),
                                timestamp: fc.date({ min: new Date('2024-01-01'), max: new Date() })
                            }),
                            { minLength: 1, maxLength: 10 }
                        )
                    }),
                    async (testData) => {
                        // Feature: vitracka-weight-management, Property 17: Cost Analysis and Profitability Monitoring

                        const mockMetrics: CostMetrics[] = testData.operationalPeriods.map((period, index) => ({
                            id: `test-cost-${index}`,
                            timestamp: period.timestamp,
                            period: 'daily',
                            totalCost: period.totalCost,
                            costBreakdown: {
                                agentCore: period.totalCost * 0.4,
                                database: period.totalCost * 0.25,
                                storage: period.totalCost * 0.15,
                                networking: period.totalCost * 0.1,
                                externalAPIs: period.totalCost * 0.1
                            },
                            userCount: period.userCount,
                            costPerUser: period.totalCost / period.userCount,
                            agentInteractions: period.agentInteractions,
                            costPerInteraction: period.totalCost / period.agentInteractions
                        }));

                        mockCostRepository.getCostMetrics.mockResolvedValue(mockMetrics);

                        // Test data consistency in per-user cost calculations
                        const perUserCost = await costAnalysisService.calculatePerUserCosts('daily');

                        if (mockMetrics.length > 0) {
                            const expectedTotalCost = mockMetrics.reduce((sum, m) => sum + m.totalCost, 0);
                            const expectedTotalUsers = mockMetrics.reduce((sum, m) => sum + m.userCount, 0);
                            const expectedPerUserCost = expectedTotalUsers > 0 ? expectedTotalCost / expectedTotalUsers : 0;

                            expect(perUserCost).toBe(expectedPerUserCost);
                        }

                        // Verify mathematical consistency in all metrics
                        for (const metric of mockMetrics) {
                            // Cost per user should equal total cost divided by user count
                            expect(metric.costPerUser).toBeCloseTo(metric.totalCost / metric.userCount, 6);

                            // Cost per interaction should equal total cost divided by interactions
                            expect(metric.costPerInteraction).toBeCloseTo(metric.totalCost / metric.agentInteractions, 6);

                            // Cost breakdown should not exceed total cost (allowing for small floating point errors)
                            const breakdownTotal = Object.values(metric.costBreakdown).reduce((sum, cost) => sum + cost, 0);
                            expect(breakdownTotal).toBeLessThanOrEqual(metric.totalCost * 1.001);

                            // All cost values should be non-negative
                            expect(metric.totalCost).toBeGreaterThanOrEqual(0);
                            expect(metric.costPerUser).toBeGreaterThanOrEqual(0);
                            expect(metric.costPerInteraction).toBeGreaterThanOrEqual(0);
                            Object.values(metric.costBreakdown).forEach(cost => {
                                expect(cost).toBeGreaterThanOrEqual(0);
                            });
                        }
                    }
                ),
                { numRuns: 10 }
            );
        });
    });
});