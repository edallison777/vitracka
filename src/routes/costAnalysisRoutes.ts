/**
 * Cost Analysis Routes
 * Admin dashboard routes for business intelligence and cost monitoring
 */

import { Router } from 'express';
import { CostAnalysisController } from '../controllers/CostAnalysisController';
import { AuthMiddleware } from '../middleware/AuthMiddleware';

const router = Router();
const costAnalysisController = new CostAnalysisController();
const authMiddleware = new AuthMiddleware();

// Admin authentication middleware - all routes require admin access
router.use(authMiddleware.requireAdmin.bind(authMiddleware));

/**
 * GET /api/admin/cost-analysis/metrics
 * Get current infrastructure costs and metrics
 */
router.get('/metrics', costAnalysisController.getCurrentMetrics.bind(costAnalysisController));

/**
 * GET /api/admin/cost-analysis/per-user
 * Get per-user cost analysis
 * Query params: period (daily|weekly|monthly)
 */
router.get('/per-user', costAnalysisController.getPerUserCosts.bind(costAnalysisController));

/**
 * GET /api/admin/cost-analysis/pricing-recommendations
 * Get subscription pricing recommendations
 * Query params: margin (target profit margin, default 0.3)
 */
router.get('/pricing-recommendations', costAnalysisController.getPricingRecommendations.bind(costAnalysisController));

/**
 * GET /api/admin/cost-analysis/profitability
 * Get profitability report
 * Query params: period (daily|weekly|monthly|quarterly)
 */
router.get('/profitability', costAnalysisController.getProfitabilityReport.bind(costAnalysisController));

/**
 * GET /api/admin/cost-analysis/business-metrics
 * Get business metrics dashboard
 */
router.get('/business-metrics', costAnalysisController.getBusinessMetrics.bind(costAnalysisController));

/**
 * GET /api/admin/cost-analysis/optimization-suggestions
 * Get cost optimization suggestions
 */
router.get('/optimization-suggestions', costAnalysisController.getOptimizationSuggestions.bind(costAnalysisController));

/**
 * GET /api/admin/cost-analysis/dashboard
 * Get comprehensive admin dashboard data
 */
router.get('/dashboard', costAnalysisController.getDashboardData.bind(costAnalysisController));

export default router;