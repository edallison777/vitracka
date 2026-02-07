/**
 * Auto-scaling Controller
 * Handles HTTP endpoints for auto-scaling operations and performance monitoring
 * Implements Requirements 16.4, 16.5
 */

import { Request, Response } from 'express';
import { AutoScalingService } from '../services/AutoScalingService';
import CachingService from '../services/CachingService';

export class AutoScalingController {
    private autoScalingService: AutoScalingService;
    private cachingService: CachingService;

    constructor() {
        this.autoScalingService = new AutoScalingService();
        this.cachingService = new CachingService();
    }

    /**
     * Get current performance metrics
     * GET /api/scaling/metrics
     */
    async getPerformanceMetrics(req: Request, res: Response): Promise<void> {
        try {
            const metrics = await this.autoScalingService.collectPerformanceMetrics();

            res.json({
                success: true,
                data: metrics,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('Error collecting performance metrics:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to collect performance metrics',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    /**
     * Analyze scaling needs based on current metrics
     * POST /api/scaling/analyze
     */
    async analyzeScalingNeeds(req: Request, res: Response): Promise<void> {
        try {
            const metrics = await this.autoScalingService.collectPerformanceMetrics();
            const scalingDecision = await this.autoScalingService.analyzeScalingNeeds(metrics);

            res.json({
                success: true,
                data: {
                    currentMetrics: metrics,
                    scalingDecision: scalingDecision
                },
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('Error analyzing scaling needs:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to analyze scaling needs',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    /**
     * Execute scaling operation
     * POST /api/scaling/execute
     */
    async executeScaling(req: Request, res: Response): Promise<void> {
        try {
            const { scalingDecision } = req.body;

            if (!scalingDecision) {
                res.status(400).json({
                    success: false,
                    error: 'Scaling decision is required'
                });
                return;
            }

            const result = await this.autoScalingService.executeScaling(scalingDecision);

            res.json({
                success: true,
                data: result,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('Error executing scaling:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to execute scaling',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    /**
     * Trigger database optimization
     * POST /api/scaling/optimize-database
     */
    async optimizeDatabase(req: Request, res: Response): Promise<void> {
        try {
            const result = await this.autoScalingService.optimizeDatabasePerformance();

            res.json({
                success: true,
                data: result,
                message: 'Database optimization completed successfully',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('Error optimizing database:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to optimize database',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    /**
     * Get cache statistics and performance
     * GET /api/scaling/cache-stats
     */
    async getCacheStats(req: Request, res: Response): Promise<void> {
        try {
            const stats = this.cachingService.getStats();

            res.json({
                success: true,
                data: stats,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('Error getting cache stats:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get cache statistics',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    /**
     * Warm up cache with frequently accessed data
     * POST /api/scaling/cache-warmup
     */
    async warmUpCache(req: Request, res: Response): Promise<void> {
        try {
            await this.cachingService.warmUpCache();

            res.json({
                success: true,
                message: 'Cache warm-up completed successfully',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('Error warming up cache:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to warm up cache',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    /**
     * Optimize cache performance
     * POST /api/scaling/optimize-cache
     */
    async optimizeCache(req: Request, res: Response): Promise<void> {
        try {
            const result = await this.cachingService.optimizeCache();

            res.json({
                success: true,
                data: result,
                message: 'Cache optimization completed successfully',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('Error optimizing cache:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to optimize cache',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    /**
     * Get scaling history and decisions
     * GET /api/scaling/history
     */
    async getScalingHistory(req: Request, res: Response): Promise<void> {
        try {
            const { hours = 24, service = 'vitracka-main' } = req.query;

            // This would typically query the scaling_decisions table
            // For now, return a mock response
            const history = {
                service: service,
                timeRange: `${hours} hours`,
                decisions: [
                    {
                        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
                        direction: 'up',
                        reason: 'High CPU utilization detected: 75%',
                        targetInstances: 4,
                        executed: true,
                        success: true
                    },
                    {
                        timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
                        direction: 'down',
                        reason: 'Low resource utilization - optimizing costs',
                        targetInstances: 2,
                        executed: true,
                        success: true
                    }
                ]
            };

            res.json({
                success: true,
                data: history,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('Error getting scaling history:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get scaling history',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    /**
     * Health check endpoint for auto-scaling service
     * GET /api/scaling/health
     */
    async healthCheck(req: Request, res: Response): Promise<void> {
        try {
            const metrics = await this.autoScalingService.collectPerformanceMetrics();
            const cacheStats = this.cachingService.getStats();

            const health = {
                status: 'healthy',
                services: {
                    autoScaling: 'operational',
                    caching: cacheStats.hitRate > 0.5 ? 'optimal' : 'suboptimal',
                    database: metrics.responseTime < 2000 ? 'healthy' : 'degraded'
                },
                metrics: {
                    responseTime: metrics.responseTime,
                    cacheHitRate: cacheStats.hitRate,
                    activeUsers: metrics.activeUsers
                },
                timestamp: new Date().toISOString()
            };

            const statusCode = health.services.database === 'degraded' ? 503 : 200;
            res.status(statusCode).json({
                success: true,
                data: health
            });
        } catch (error) {
            console.error('Error in health check:', error);
            res.status(503).json({
                success: false,
                error: 'Health check failed',
                message: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date().toISOString()
            });
        }
    }

    /**
     * Get performance recommendations
     * GET /api/scaling/recommendations
     */
    async getPerformanceRecommendations(req: Request, res: Response): Promise<void> {
        try {
            const metrics = await this.autoScalingService.collectPerformanceMetrics();
            const scalingDecision = await this.autoScalingService.analyzeScalingNeeds(metrics);
            const cacheStats = this.cachingService.getStats();

            const recommendations = [];

            // CPU-based recommendations
            if (metrics.cpuUtilization > 80) {
                recommendations.push({
                    type: 'scaling',
                    priority: 'high',
                    title: 'Scale Up Instances',
                    description: `CPU utilization is at ${metrics.cpuUtilization}%. Consider scaling up to handle the load.`,
                    action: 'Scale up to reduce CPU pressure',
                    estimatedImpact: 'Improved response times and reduced error rates'
                });
            } else if (metrics.cpuUtilization < 30) {
                recommendations.push({
                    type: 'cost-optimization',
                    priority: 'medium',
                    title: 'Scale Down Instances',
                    description: `CPU utilization is only ${metrics.cpuUtilization}%. Consider scaling down to optimize costs.`,
                    action: 'Scale down to reduce infrastructure costs',
                    estimatedImpact: 'Cost savings without performance impact'
                });
            }

            // Cache-based recommendations
            if (cacheStats.hitRate < 0.7) {
                recommendations.push({
                    type: 'caching',
                    priority: 'medium',
                    title: 'Improve Cache Hit Rate',
                    description: `Cache hit rate is ${(cacheStats.hitRate * 100).toFixed(1)}%. Consider optimizing cache strategies.`,
                    action: 'Review cache TTL settings and warm-up strategies',
                    estimatedImpact: 'Reduced database load and improved response times'
                });
            }

            // Response time recommendations
            if (metrics.responseTime > 1500) {
                recommendations.push({
                    type: 'performance',
                    priority: 'high',
                    title: 'Optimize Response Times',
                    description: `Average response time is ${metrics.responseTime}ms. This may impact user experience.`,
                    action: 'Investigate slow queries and optimize database performance',
                    estimatedImpact: 'Better user experience and reduced bounce rates'
                });
            }

            res.json({
                success: true,
                data: {
                    recommendations,
                    currentMetrics: metrics,
                    scalingDecision,
                    cacheStats
                },
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('Error getting performance recommendations:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get performance recommendations',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
}

export default AutoScalingController;