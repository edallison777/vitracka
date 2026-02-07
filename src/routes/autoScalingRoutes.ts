/**
 * Auto-scaling Routes
 * Defines HTTP endpoints for auto-scaling operations and performance monitoring
 * Implements Requirements 16.4, 16.5
 */

import { Router } from 'express';
import { AutoScalingController } from '../controllers/AutoScalingController';
import { AuthMiddleware } from '../middleware/AuthMiddleware';

const router = Router();
const autoScalingController = new AutoScalingController();
const authMiddleware = new AuthMiddleware();

// Health check endpoint (public)
router.get('/health', autoScalingController.healthCheck.bind(autoScalingController));

// Apply authentication middleware to all other routes
router.use(authMiddleware.authenticate.bind(authMiddleware));

// Performance metrics endpoints
router.get('/metrics', autoScalingController.getPerformanceMetrics.bind(autoScalingController));
router.post('/analyze', autoScalingController.analyzeScalingNeeds.bind(autoScalingController));
router.get('/history', autoScalingController.getScalingHistory.bind(autoScalingController));
router.get('/recommendations', autoScalingController.getPerformanceRecommendations.bind(autoScalingController));

// Scaling operations (admin only)
router.post('/execute',
    authMiddleware.requireAdmin.bind(authMiddleware),
    autoScalingController.executeScaling.bind(autoScalingController)
);

// Database optimization (admin only)
router.post('/optimize-database',
    authMiddleware.requireAdmin.bind(authMiddleware),
    autoScalingController.optimizeDatabase.bind(autoScalingController)
);

// Cache management endpoints
router.get('/cache-stats', autoScalingController.getCacheStats.bind(autoScalingController));
router.post('/cache-warmup',
    authMiddleware.requireAdmin.bind(authMiddleware),
    autoScalingController.warmUpCache.bind(autoScalingController)
);
router.post('/optimize-cache',
    authMiddleware.requireAdmin.bind(authMiddleware),
    autoScalingController.optimizeCache.bind(autoScalingController)
);

export default router;