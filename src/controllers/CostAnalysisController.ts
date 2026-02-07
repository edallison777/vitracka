/**
 * Cost Analysis Controller
 * Admin dashboard endpoints for business intelligence and cost monitoring
 */

import { Request, Response } from 'express';
import { CostAnalysisService } from '../services/CostAnalysisService';
import { CostAnalysisRepository } from '../database/repositories/CostAnalysisRepository';
import DatabaseConnection from '../database/connection';

export class CostAnalysisController {
    private costAnalysisService: CostAnalysisService;

    constructor() {
        const dbConnection = DatabaseConnection.getInstance();
        const costAnalysisRepository = new CostAnalysisRepository(dbConnection.getPool());
        this.costAnalysisService = new CostAnalysisService(costAnalysisRepository);
    }

    /**
     * Get current infrastructure costs and metrics
     * GET /api/admin/cost-analysis/metrics
     */
    async getCurrentMetrics(req: Request, res: Response): Promise<void> {
        try {
            const metrics = await this.costAnalysisService.monitorInfrastructureCosts();
            res.json({
                success: true,
                data: metrics
            });
        } catch (error) {
            console.error('Error fetching cost metrics:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch cost metrics'
            });
        }
    }

    /**
     * Get per-user cost analysis
     * GET /api/admin/cost-analysis/per-user?period=daily|weekly|monthly
     */
    async getPerUserCosts(req: Request, res: Response): Promise<void> {
        try {
            const period = req.query.period as 'daily' | 'weekly' | 'monthly' || 'monthly';
            const perUserCost = await this.costAnalysisService.calculatePerUserCosts(period);

            res.json({
                success: true,
                data: {
                    period,
                    costPerUser: perUserCost
                }
            });
        } catch (error) {
            console.error('Error calculating per-user costs:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to calculate per-user costs'
            });
        }
    }

    /**
     * Get subscription pricing recommendations
     * GET /api/admin/cost-analysis/pricing-recommendations?margin=0.3
     */
    async getPricingRecommendations(req: Request, res: Response): Promise<void> {
        try {
            const targetMargin = parseFloat(req.query.margin as string) || 0.3;
            const recommendations = await this.costAnalysisService.generateSubscriptionRecommendations(targetMargin);

            res.json({
                success: true,
                data: recommendations
            });
        } catch (error) {
            console.error('Error generating pricing recommendations:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to generate pricing recommendations'
            });
        }
    }

    /**
     * Get profitability report
     * GET /api/admin/cost-analysis/profitability?period=monthly
     */
    async getProfitabilityReport(req: Request, res: Response): Promise<void> {
        try {
            const period = req.query.period as 'daily' | 'weekly' | 'monthly' | 'quarterly' || 'monthly';
            const report = await this.costAnalysisService.generateProfitabilityReport(period);

            res.json({
                success: true,
                data: report
            });
        } catch (error) {
            console.error('Error generating profitability report:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to generate profitability report'
            });
        }
    }

    /**
     * Get business metrics dashboard
     * GET /api/admin/cost-analysis/business-metrics
     */
    async getBusinessMetrics(req: Request, res: Response): Promise<void> {
        try {
            const metrics = await this.costAnalysisService.getBusinessMetrics();

            res.json({
                success: true,
                data: metrics
            });
        } catch (error) {
            console.error('Error fetching business metrics:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch business metrics'
            });
        }
    }

    /**
     * Get cost optimization suggestions
     * GET /api/admin/cost-analysis/optimization-suggestions
     */
    async getOptimizationSuggestions(req: Request, res: Response): Promise<void> {
        try {
            const suggestions = await this.costAnalysisService.generateOptimizationSuggestions();

            res.json({
                success: true,
                data: suggestions
            });
        } catch (error) {
            console.error('Error generating optimization suggestions:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to generate optimization suggestions'
            });
        }
    }

    /**
     * Get comprehensive admin dashboard data
     * GET /api/admin/cost-analysis/dashboard
     */
    async getDashboardData(req: Request, res: Response): Promise<void> {
        try {
            const [
                currentMetrics,
                businessMetrics,
                optimizationSuggestions,
                pricingRecommendations
            ] = await Promise.all([
                this.costAnalysisService.monitorInfrastructureCosts(),
                this.costAnalysisService.getBusinessMetrics(),
                this.costAnalysisService.generateOptimizationSuggestions(),
                this.costAnalysisService.generateSubscriptionRecommendations()
            ]);

            res.json({
                success: true,
                data: {
                    currentMetrics,
                    businessMetrics,
                    optimizationSuggestions,
                    pricingRecommendations,
                    lastUpdated: new Date()
                }
            });
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch dashboard data'
            });
        }
    }
}