/**
 * Cost Analysis Service
 * Business intelligence service for AWS cost monitoring, profitability analysis,
 * and subscription pricing recommendations
 */

import { CostAnalysisRepository } from '../database/repositories/CostAnalysisRepository';
import {
    CostMetrics,
    SubscriptionRecommendation,
    ProfitabilityReport,
    CostAlert,
    BusinessMetrics,
    CostOptimizationSuggestion
} from '../types/cost';

export class CostAnalysisService {
    constructor(private costAnalysisRepository: CostAnalysisRepository) { }

    /**
     * Monitor AWS infrastructure costs and usage patterns in real-time
     * Requirement 16.1: Real-time cost monitoring
     */
    async monitorInfrastructureCosts(): Promise<CostMetrics> {
        // Simulate AWS cost data collection
        // In production, this would integrate with AWS Cost Explorer API
        const currentTime = new Date();
        const mockCostData = this.generateMockCostData(currentTime);

        const costMetrics = await this.costAnalysisRepository.saveCostMetrics(mockCostData);

        // Check for cost alerts
        await this.checkCostThresholds(costMetrics);

        return costMetrics;
    }

    /**
     * Calculate per-user operational costs across all services
     * Requirement 16.2: Per-user cost calculation
     */
    async calculatePerUserCosts(period: 'daily' | 'weekly' | 'monthly'): Promise<number> {
        const endDate = new Date();
        const startDate = new Date();

        switch (period) {
            case 'daily':
                startDate.setDate(endDate.getDate() - 1);
                break;
            case 'weekly':
                startDate.setDate(endDate.getDate() - 7);
                break;
            case 'monthly':
                startDate.setMonth(endDate.getMonth() - 1);
                break;
        }

        const metrics = await this.costAnalysisRepository.getCostMetrics(period, startDate, endDate);

        if (metrics.length === 0) return 0;

        const totalCost = metrics.reduce((sum, metric) => sum + metric.totalCost, 0);
        const totalUsers = metrics.reduce((sum, metric) => sum + metric.userCount, 0);

        return totalUsers > 0 ? totalCost / totalUsers : 0;
    }

    /**
     * Generate subscription pricing recommendations based on cost analysis
     * Requirement 16.3: Subscription pricing recommendations
     */
    async generateSubscriptionRecommendations(
        targetProfitMargin: number = 0.3
    ): Promise<SubscriptionRecommendation> {
        const avgCostPerUser = await this.calculatePerUserCosts('monthly');
        const infrastructureOverhead = avgCostPerUser * 0.2; // 20% overhead for scaling

        const recommendedTiers = [
            {
                tierName: 'Basic',
                monthlyPrice: Math.ceil((avgCostPerUser + infrastructureOverhead) / (1 - targetProfitMargin)),
                features: ['Weight tracking', 'Basic coaching', 'Progress analytics'],
                targetMargin: targetProfitMargin,
                projectedUsers: 1000
            },
            {
                tierName: 'Premium',
                monthlyPrice: Math.ceil((avgCostPerUser * 1.5 + infrastructureOverhead) / (1 - targetProfitMargin)),
                features: ['All Basic features', 'Advanced gamification', 'Nutrition search', 'Priority support'],
                targetMargin: targetProfitMargin,
                projectedUsers: 500
            },
            {
                tierName: 'Pro',
                monthlyPrice: Math.ceil((avgCostPerUser * 2 + infrastructureOverhead) / (1 - targetProfitMargin)),
                features: ['All Premium features', 'Custom coaching styles', 'Advanced analytics', 'API access'],
                targetMargin: targetProfitMargin,
                projectedUsers: 200
            }
        ];

        const recommendation: Omit<SubscriptionRecommendation, 'id'> = {
            generatedAt: new Date(),
            recommendedTiers,
            costBasis: {
                avgCostPerUser,
                infrastructureOverhead,
                targetProfitMargin
            },
            validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // Valid for 30 days
        };

        return await this.costAnalysisRepository.saveSubscriptionRecommendation(recommendation);
    }

    /**
     * Generate comprehensive profitability report
     */
    async generateProfitabilityReport(
        period: 'daily' | 'weekly' | 'monthly' | 'quarterly'
    ): Promise<ProfitabilityReport> {
        const mockRevenueData = this.generateMockRevenueData(period);
        const mockCostData = this.generateMockCostData(new Date());
        const mockUserMetrics = this.generateMockUserMetrics();

        const report: Omit<ProfitabilityReport, 'id'> = {
            reportDate: new Date(),
            period,
            revenue: mockRevenueData,
            costs: {
                infrastructure: mockCostData.totalCost,
                operations: mockCostData.totalCost * 0.3,
                total: mockCostData.totalCost * 1.3
            },
            profit: {
                gross: mockRevenueData.total - (mockCostData.totalCost * 1.3),
                margin: (mockRevenueData.total - (mockCostData.totalCost * 1.3)) / mockRevenueData.total
            },
            userMetrics: mockUserMetrics
        };

        return await this.costAnalysisRepository.saveProfitabilityReport(report);
    }

    /**
     * Get business metrics for admin dashboard
     */
    async getBusinessMetrics(): Promise<BusinessMetrics> {
        const profitabilityReports = await this.costAnalysisRepository.getProfitabilityReports('monthly', 3);

        if (profitabilityReports.length === 0) {
            throw new Error('No profitability data available');
        }

        const latestReport = profitabilityReports[0];
        const previousReport = profitabilityReports[1];

        return {
            id: `metrics-${Date.now()}`,
            timestamp: new Date(),
            metrics: {
                monthlyRecurringRevenue: latestReport.revenue.subscriptions,
                customerLifetimeValue: latestReport.userMetrics.lifetimeValue,
                customerAcquisitionCost: latestReport.userMetrics.acquisitionCost,
                churnRate: latestReport.userMetrics.churnRate,
                grossMargin: latestReport.profit.margin,
                burnRate: latestReport.costs.total,
                runwayMonths: this.calculateRunwayMonths(latestReport)
            },
            forecasts: {
                nextMonthRevenue: this.forecastRevenue(profitabilityReports),
                nextMonthCosts: this.forecastCosts(profitabilityReports),
                nextMonthProfit: 0, // Will be calculated
                confidenceInterval: 0.85
            }
        };
    }

    /**
     * Generate cost optimization suggestions
     */
    async generateOptimizationSuggestions(): Promise<CostOptimizationSuggestion[]> {
        const recentMetrics = await this.costAnalysisRepository.getCostMetrics(
            'daily',
            new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            new Date()
        );

        const suggestions: CostOptimizationSuggestion[] = [];

        // Analyze cost patterns and generate suggestions
        if (recentMetrics.length > 0) {
            const avgDailyCost = recentMetrics.reduce((sum, m) => sum + m.totalCost, 0) / recentMetrics.length;
            const avgInteractionCost = recentMetrics.reduce((sum, m) => sum + m.costPerInteraction, 0) / recentMetrics.length;

            if (avgInteractionCost > 0.05) {
                suggestions.push({
                    id: `opt-${Date.now()}-1`,
                    generatedAt: new Date(),
                    category: 'efficiency',
                    title: 'Optimize Agent Interaction Costs',
                    description: 'Agent interaction costs are above optimal threshold. Consider implementing response caching and optimizing agent workflows.',
                    potentialSavings: avgDailyCost * 0.15 * 30, // 15% savings over 30 days
                    implementationEffort: 'medium',
                    priority: 'high',
                    estimatedImpact: 'Reduce agent interaction costs by 15-20%',
                    actionItems: [
                        'Implement response caching for common queries',
                        'Optimize agent prompt engineering',
                        'Review and consolidate redundant agent calls'
                    ]
                });
            }

            if (avgDailyCost > 100) {
                suggestions.push({
                    id: `opt-${Date.now()}-2`,
                    generatedAt: new Date(),
                    category: 'infrastructure',
                    title: 'Right-size Infrastructure Resources',
                    description: 'Infrastructure costs suggest over-provisioning. Consider implementing auto-scaling and resource optimization.',
                    potentialSavings: avgDailyCost * 0.25 * 30, // 25% savings over 30 days
                    implementationEffort: 'high',
                    priority: 'medium',
                    estimatedImpact: 'Reduce infrastructure costs by 20-30%',
                    actionItems: [
                        'Implement auto-scaling for ECS services',
                        'Optimize RDS instance sizing',
                        'Review and optimize S3 storage classes'
                    ]
                });
            }
        }

        return suggestions;
    }

    /**
     * Check cost thresholds and generate alerts
     */
    private async checkCostThresholds(metrics: CostMetrics): Promise<void> {
        const dailyCostThreshold = 200; // $200 per day
        const costPerUserThreshold = 5; // $5 per user
        const costPerInteractionThreshold = 0.1; // $0.10 per interaction

        if (metrics.totalCost > dailyCostThreshold) {
            await this.costAnalysisRepository.saveCostAlert({
                timestamp: new Date(),
                alertType: 'threshold_exceeded',
                severity: 'high',
                message: `Daily cost threshold exceeded: $${metrics.totalCost.toFixed(2)}`,
                currentValue: metrics.totalCost,
                thresholdValue: dailyCostThreshold,
                recommendedAction: 'Review infrastructure usage and consider scaling optimizations',
                acknowledged: false
            });
        }

        if (metrics.costPerUser > costPerUserThreshold) {
            await this.costAnalysisRepository.saveCostAlert({
                timestamp: new Date(),
                alertType: 'threshold_exceeded',
                severity: 'medium',
                message: `Cost per user threshold exceeded: $${metrics.costPerUser.toFixed(2)}`,
                currentValue: metrics.costPerUser,
                thresholdValue: costPerUserThreshold,
                recommendedAction: 'Analyze user engagement patterns and optimize resource allocation',
                acknowledged: false
            });
        }

        if (metrics.costPerInteraction > costPerInteractionThreshold) {
            await this.costAnalysisRepository.saveCostAlert({
                timestamp: new Date(),
                alertType: 'threshold_exceeded',
                severity: 'medium',
                message: `Cost per interaction threshold exceeded: $${metrics.costPerInteraction.toFixed(3)}`,
                currentValue: metrics.costPerInteraction,
                thresholdValue: costPerInteractionThreshold,
                recommendedAction: 'Optimize agent workflows and implement response caching',
                acknowledged: false
            });
        }
    }

    /**
     * Generate mock cost data for demonstration
     * In production, this would integrate with AWS Cost Explorer API
     */
    private generateMockCostData(timestamp: Date): Omit<CostMetrics, 'id'> {
        const baseAgentCoreCost = 50 + Math.random() * 20;
        const baseDatabaseCost = 30 + Math.random() * 10;
        const baseStorageCost = 15 + Math.random() * 5;
        const baseNetworkingCost = 10 + Math.random() * 5;
        const baseExternalAPICost = 20 + Math.random() * 10;

        const totalCost = baseAgentCoreCost + baseDatabaseCost + baseStorageCost + baseNetworkingCost + baseExternalAPICost;
        const userCount = 100 + Math.floor(Math.random() * 50);
        const agentInteractions = 500 + Math.floor(Math.random() * 200);

        return {
            timestamp,
            period: 'daily',
            totalCost,
            costBreakdown: {
                agentCore: baseAgentCoreCost,
                database: baseDatabaseCost,
                storage: baseStorageCost,
                networking: baseNetworkingCost,
                externalAPIs: baseExternalAPICost
            },
            userCount,
            costPerUser: totalCost / userCount,
            agentInteractions,
            costPerInteraction: totalCost / agentInteractions
        };
    }

    private generateMockRevenueData(period: string) {
        const multiplier = period === 'monthly' ? 30 : period === 'weekly' ? 7 : 1;
        return {
            subscriptions: (2000 + Math.random() * 1000) * multiplier,
            total: (2500 + Math.random() * 1500) * multiplier
        };
    }

    private generateMockUserMetrics() {
        return {
            activeUsers: 150 + Math.floor(Math.random() * 50),
            newUsers: 20 + Math.floor(Math.random() * 10),
            churnRate: 0.05 + Math.random() * 0.03,
            lifetimeValue: 120 + Math.random() * 80,
            acquisitionCost: 25 + Math.random() * 15
        };
    }

    private calculateRunwayMonths(report: ProfitabilityReport): number {
        const monthlyBurn = report.costs.total;
        const assumedCashReserves = 100000; // $100k assumed reserves
        return monthlyBurn > 0 ? assumedCashReserves / monthlyBurn : 0;
    }

    private forecastRevenue(reports: ProfitabilityReport[]): number {
        if (reports.length < 2) return reports[0]?.revenue.total || 0;

        const growth = (reports[0].revenue.total - reports[1].revenue.total) / reports[1].revenue.total;
        return reports[0].revenue.total * (1 + growth);
    }

    private forecastCosts(reports: ProfitabilityReport[]): number {
        if (reports.length < 2) return reports[0]?.costs.total || 0;

        const growth = (reports[0].costs.total - reports[1].costs.total) / reports[1].costs.total;
        return reports[0].costs.total * (1 + growth);
    }
}