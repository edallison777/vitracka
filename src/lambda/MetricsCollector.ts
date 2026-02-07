/**
 * AWS Lambda Function for Lightweight Metrics Collection
 * Collects system metrics for auto-scaling decisions
 * Implements Requirements 16.4, 16.5
 */

import { Handler, CloudWatchEvent } from 'aws-lambda';
import { AutoScalingService } from '../services/AutoScalingService';

export interface MetricsCollectorEvent extends CloudWatchEvent {
    source: string;
    'detail-type': string;
}

export interface MetricsCollectorResponse {
    statusCode: number;
    body: string;
    metrics?: {
        cpuUtilization: number;
        memoryUtilization: number;
        responseTime: number;
        errorRate: number;
        activeUsers: number;
        requestsPerSecond: number;
    };
}

/**
 * Lambda handler for collecting performance metrics
 * Triggered every 5 minutes by CloudWatch Events
 */
export const handler: Handler<MetricsCollectorEvent, MetricsCollectorResponse> = async (event, context) => {
    console.log('Metrics collection started:', JSON.stringify(event, null, 2));

    try {
        const autoScalingService = new AutoScalingService();

        // Collect current performance metrics
        const metrics = await autoScalingService.collectPerformanceMetrics();

        console.log('Collected metrics:', metrics);

        // Analyze if scaling is needed
        const scalingDecision = await autoScalingService.analyzeScalingNeeds(metrics);

        console.log('Scaling decision:', scalingDecision);

        // Execute scaling if needed
        if (scalingDecision.shouldScale) {
            const scalingResult = await autoScalingService.executeScaling(scalingDecision);
            console.log('Scaling result:', scalingResult);

            if (!scalingResult.success) {
                console.error('Scaling operation failed');
                return {
                    statusCode: 500,
                    body: JSON.stringify({
                        message: 'Scaling operation failed',
                        metrics,
                        scalingDecision,
                        scalingResult
                    })
                };
            }
        }

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Metrics collection and scaling analysis completed successfully',
                scalingDecision,
                timestamp: new Date().toISOString()
            }),
            metrics: {
                cpuUtilization: metrics.cpuUtilization,
                memoryUtilization: metrics.memoryUtilization,
                responseTime: metrics.responseTime,
                errorRate: metrics.errorRate,
                activeUsers: metrics.activeUsers,
                requestsPerSecond: metrics.requestsPerSecond
            }
        };

    } catch (error) {
        console.error('Error in metrics collection:', error);

        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'Error collecting metrics',
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date().toISOString()
            })
        };
    }
};

/**
 * Lambda handler for database optimization
 * Triggered daily to optimize database performance
 */
export const optimizeDatabaseHandler: Handler = async (event, context) => {
    console.log('Database optimization started:', JSON.stringify(event, null, 2));

    try {
        const autoScalingService = new AutoScalingService();

        // Optimize database queries and implement caching
        const optimizationResult = await autoScalingService.optimizeDatabasePerformance();

        console.log('Database optimization result:', optimizationResult);

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Database optimization completed successfully',
                result: optimizationResult,
                timestamp: new Date().toISOString()
            })
        };

    } catch (error) {
        console.error('Error in database optimization:', error);

        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'Error optimizing database',
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date().toISOString()
            })
        };
    }
};

/**
 * Lambda handler for cost optimization alerts
 * Triggered when scaling decisions involve significant cost changes
 */
export const costOptimizationHandler: Handler = async (event, context) => {
    console.log('Cost optimization check started:', JSON.stringify(event, null, 2));

    try {
        const { scalingDecision, currentCost } = event;

        // Check if cost change is significant (more than 20% increase)
        const costChangeThreshold = currentCost * 0.2;

        if (Math.abs(scalingDecision.estimatedCost) > costChangeThreshold) {
            console.log(`Significant cost change detected: ${scalingDecision.estimatedCost}`);

            // In real implementation, this would send notifications to administrators
            // For now, just log the alert
            console.log('COST ALERT: Scaling decision will result in significant cost change');

            return {
                statusCode: 200,
                body: JSON.stringify({
                    message: 'Cost optimization alert triggered',
                    costChange: scalingDecision.estimatedCost,
                    threshold: costChangeThreshold,
                    recommendation: scalingDecision.estimatedCost > 0
                        ? 'Consider if scaling up is necessary or if optimization can reduce the need'
                        : 'Cost savings opportunity identified',
                    timestamp: new Date().toISOString()
                })
            };
        }

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Cost change within acceptable limits',
                costChange: scalingDecision.estimatedCost,
                timestamp: new Date().toISOString()
            })
        };

    } catch (error) {
        console.error('Error in cost optimization check:', error);

        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'Error in cost optimization check',
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date().toISOString()
            })
        };
    }
};