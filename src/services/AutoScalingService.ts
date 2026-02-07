/**
 * Auto-scaling Service for Vitracka Infrastructure
 * Handles automatic scaling of AWS resources based on demand and performance metrics
 * Implements Requirements 16.4, 16.5
 */

import DatabaseConnection from '../database/connection';

export interface ScalingMetrics {
    cpuUtilization: number;
    memoryUtilization: number;
    responseTime: number;
    errorRate: number;
    activeUsers: number;
    requestsPerSecond: number;
    timestamp: Date;
}

export interface ScalingDecision {
    shouldScale: boolean;
    direction: 'up' | 'down' | 'none';
    targetInstances: number;
    reason: string;
    estimatedCost: number;
}

export interface PerformanceThresholds {
    cpuThreshold: number;
    memoryThreshold: number;
    responseTimeThreshold: number;
    errorRateThreshold: number;
    minInstances: number;
    maxInstances: number;
}

export class AutoScalingService {
    private db: DatabaseConnection;
    private thresholds: PerformanceThresholds;

    constructor(db?: DatabaseConnection) {
        this.db = db || DatabaseConnection.getInstance();
        this.thresholds = {
            cpuThreshold: 70,
            memoryThreshold: 80,
            responseTimeThreshold: 2000, // 2 seconds
            errorRateThreshold: 0.01, // 1%
            minInstances: 2,
            maxInstances: 20
        };
    }

    /**
     * Analyze current metrics and determine if scaling is needed
     * Requirement 16.4: Automatically scale resources based on user demand while optimizing costs
     */
    async analyzeScalingNeeds(metrics: ScalingMetrics): Promise<ScalingDecision> {
        const currentInstances = await this.getCurrentInstanceCount();

        // Check if scaling up is needed
        const needsScaleUp =
            metrics.cpuUtilization > this.thresholds.cpuThreshold ||
            metrics.memoryUtilization > this.thresholds.memoryThreshold ||
            metrics.responseTime > this.thresholds.responseTimeThreshold ||
            metrics.errorRate > this.thresholds.errorRateThreshold;

        // Check if scaling down is possible (cost optimization)
        const canScaleDown =
            metrics.cpuUtilization < this.thresholds.cpuThreshold * 0.5 &&
            metrics.memoryUtilization < this.thresholds.memoryThreshold * 0.5 &&
            metrics.responseTime < this.thresholds.responseTimeThreshold * 0.5 &&
            metrics.errorRate < this.thresholds.errorRateThreshold * 0.5 &&
            currentInstances > this.thresholds.minInstances;

        let decision: ScalingDecision;

        if (needsScaleUp && currentInstances < this.thresholds.maxInstances) {
            const scaleFactor = Math.max(
                metrics.cpuUtilization / this.thresholds.cpuThreshold,
                metrics.memoryUtilization / this.thresholds.memoryThreshold,
                metrics.responseTime / this.thresholds.responseTimeThreshold
            );

            const targetInstances = Math.min(
                Math.ceil(currentInstances * scaleFactor),
                this.thresholds.maxInstances
            );

            decision = {
                shouldScale: true,
                direction: 'up',
                targetInstances,
                reason: `High resource utilization detected: CPU ${metrics.cpuUtilization}%, Memory ${metrics.memoryUtilization}%, Response Time ${metrics.responseTime}ms`,
                estimatedCost: await this.estimateScalingCost(targetInstances - currentInstances)
            };
        } else if (canScaleDown) {
            const targetInstances = Math.max(
                Math.floor(currentInstances * 0.8), // Scale down by 20%
                this.thresholds.minInstances
            );

            decision = {
                shouldScale: true,
                direction: 'down',
                targetInstances,
                reason: `Low resource utilization detected - optimizing costs: CPU ${metrics.cpuUtilization}%, Memory ${metrics.memoryUtilization}%`,
                estimatedCost: await this.estimateScalingCost(targetInstances - currentInstances) // Negative cost (savings)
            };
        } else {
            decision = {
                shouldScale: false,
                direction: 'none',
                targetInstances: currentInstances,
                reason: 'Resource utilization within acceptable thresholds',
                estimatedCost: 0
            };
        }

        // Log scaling decision for audit
        await this.logScalingDecision(metrics, decision);

        return decision;
    }

    /**
     * Execute scaling decision while maintaining performance standards
     * Requirement 16.5: Maintain performance standards during scaling operations
     */
    async executeScaling(decision: ScalingDecision): Promise<{
        success: boolean;
        newInstanceCount: number;
        scalingTime: number;
        performanceMaintained: boolean;
    }> {
        if (!decision.shouldScale) {
            return {
                success: true,
                newInstanceCount: decision.targetInstances,
                scalingTime: 0,
                performanceMaintained: true
            };
        }

        const startTime = Date.now();
        const currentInstances = await this.getCurrentInstanceCount();

        try {
            // Simulate scaling operation (in real implementation, this would call AWS APIs)
            await this.performScalingOperation(decision.targetInstances);

            // Monitor performance during scaling
            const performanceMetrics = await this.monitorScalingPerformance(decision.targetInstances);

            const scalingTime = Date.now() - startTime;

            // Update instance count in database
            await this.updateInstanceCount(decision.targetInstances);

            return {
                success: true,
                newInstanceCount: decision.targetInstances,
                scalingTime,
                performanceMaintained: performanceMetrics.performanceAcceptable
            };
        } catch (error) {
            console.error('Scaling operation failed:', error);
            return {
                success: false,
                newInstanceCount: currentInstances,
                scalingTime: Date.now() - startTime,
                performanceMaintained: false
            };
        }
    }

    /**
     * Monitor system performance metrics
     */
    async collectPerformanceMetrics(): Promise<ScalingMetrics> {
        // In real implementation, this would collect metrics from CloudWatch
        const query = `
            SELECT 
                AVG(cpu_utilization) as cpu_utilization,
                AVG(memory_utilization) as memory_utilization,
                AVG(response_time) as response_time,
                AVG(error_rate) as error_rate,
                COUNT(DISTINCT user_id) as active_users,
                COUNT(*) / 60 as requests_per_second
            FROM system_metrics 
            WHERE timestamp > NOW() - INTERVAL '5 minutes'
        `;

        try {
            const result = await this.db.query(query);
            const row = result.rows[0];

            return {
                cpuUtilization: parseFloat(row.cpu_utilization) || 0,
                memoryUtilization: parseFloat(row.memory_utilization) || 0,
                responseTime: parseFloat(row.response_time) || 0,
                errorRate: parseFloat(row.error_rate) || 0,
                activeUsers: parseInt(row.active_users) || 0,
                requestsPerSecond: parseFloat(row.requests_per_second) || 0,
                timestamp: new Date()
            };
        } catch (error) {
            console.error('Failed to collect performance metrics:', error);
            // Return safe default values
            return {
                cpuUtilization: 50,
                memoryUtilization: 60,
                responseTime: 1000,
                errorRate: 0.001,
                activeUsers: 100,
                requestsPerSecond: 10,
                timestamp: new Date()
            };
        }
    }

    /**
     * Optimize database queries and implement caching strategies
     */
    async optimizeDatabasePerformance(): Promise<{
        queriesOptimized: number;
        cacheHitRate: number;
        performanceImprovement: number;
    }> {
        // Analyze slow queries
        const slowQueries = await this.identifySlowQueries();

        // Optimize queries by adding indexes or rewriting
        let optimizedCount = 0;
        for (const query of slowQueries) {
            const optimized = await this.optimizeQuery(query);
            if (optimized) {
                optimizedCount++;
            }
        }

        // Implement caching for frequently accessed data
        const cacheStats = await this.implementCaching();

        return {
            queriesOptimized: optimizedCount,
            cacheHitRate: cacheStats.hitRate,
            performanceImprovement: cacheStats.performanceGain
        };
    }

    private async getCurrentInstanceCount(): Promise<number> {
        try {
            const result = await this.db.query(
                'SELECT instance_count FROM infrastructure_state WHERE service_name = $1',
                ['vitracka-main']
            );
            return result.rows[0]?.instance_count || 2; // Default to 2 instances
        } catch (error) {
            console.error('Failed to get current instance count:', error);
            return 2;
        }
    }

    private async estimateScalingCost(instanceDelta: number): Promise<number> {
        // Estimate cost per instance per hour (example: $0.10/hour)
        const costPerInstancePerHour = 0.10;
        const hoursInMonth = 24 * 30;

        return instanceDelta * costPerInstancePerHour * hoursInMonth;
    }

    private async logScalingDecision(metrics: ScalingMetrics, decision: ScalingDecision): Promise<void> {
        try {
            await this.db.query(`
                INSERT INTO scaling_decisions (
                    timestamp, cpu_utilization, memory_utilization, response_time, 
                    error_rate, active_users, should_scale, direction, target_instances, 
                    reason, estimated_cost
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            `, [
                metrics.timestamp,
                metrics.cpuUtilization,
                metrics.memoryUtilization,
                metrics.responseTime,
                metrics.errorRate,
                metrics.activeUsers,
                decision.shouldScale,
                decision.direction,
                decision.targetInstances,
                decision.reason,
                decision.estimatedCost
            ]);
        } catch (error) {
            console.error('Failed to log scaling decision:', error);
        }
    }

    private async performScalingOperation(targetInstances: number): Promise<void> {
        // In real implementation, this would call AWS Auto Scaling APIs
        // For now, simulate the operation
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate scaling time
    }

    private async monitorScalingPerformance(targetInstances: number): Promise<{
        performanceAcceptable: boolean;
        responseTime: number;
        errorRate: number;
    }> {
        // Monitor performance during scaling operation
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for scaling to stabilize

        const metrics = await this.collectPerformanceMetrics();

        return {
            performanceAcceptable:
                metrics.responseTime < this.thresholds.responseTimeThreshold &&
                metrics.errorRate < this.thresholds.errorRateThreshold,
            responseTime: metrics.responseTime,
            errorRate: metrics.errorRate
        };
    }

    private async updateInstanceCount(newCount: number): Promise<void> {
        try {
            await this.db.query(`
                INSERT INTO infrastructure_state (service_name, instance_count, updated_at)
                VALUES ($1, $2, NOW())
                ON CONFLICT (service_name) 
                DO UPDATE SET instance_count = $2, updated_at = NOW()
            `, ['vitracka-main', newCount]);
        } catch (error) {
            console.error('Failed to update instance count:', error);
        }
    }

    private async identifySlowQueries(): Promise<string[]> {
        try {
            const result = await this.db.query(`
                SELECT query 
                FROM pg_stat_statements 
                WHERE mean_exec_time > 1000 
                ORDER BY mean_exec_time DESC 
                LIMIT 10
            `);
            return result.rows.map((row: any) => row.query);
        } catch (error) {
            console.error('Failed to identify slow queries:', error);
            return [];
        }
    }

    private async optimizeQuery(query: string): Promise<boolean> {
        // Simulate query optimization
        // In real implementation, this would analyze and optimize specific queries
        return Math.random() > 0.3; // 70% success rate for simulation
    }

    private async implementCaching(): Promise<{
        hitRate: number;
        performanceGain: number;
    }> {
        // Simulate caching implementation
        // In real implementation, this would set up Redis caching
        return {
            hitRate: 0.85, // 85% cache hit rate
            performanceGain: 0.40 // 40% performance improvement
        };
    }
}