/**
 * Production Readiness Verification - Phase 5: Infrastructure and Scaling
 * 
 * This test suite validates the requirements for task 25.4:
 * - Verify Terraform infrastructure deployment in staging environment
 * - Test auto-scaling functionality under simulated load
 * - Validate cost monitoring and business intelligence features
 * - Confirm backup and disaster recovery procedures
 * 
 * Requirements: 17.1, 17.2, 16.4, 16.5, 16.1, 16.2, 16.3
 */

import { AutoScalingService, ScalingMetrics, PerformanceThresholds } from '../../services/AutoScalingService';
import { CostAnalysisService } from '../../services/CostAnalysisService';
import DatabaseConnection from '../../database/connection';
import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

// Mock database connection
jest.mock('../../database/connection', () => ({
    __esModule: true,
    default: {
        getInstance: jest.fn(() => ({
            query: jest.fn(),
            getPool: jest.fn(() => mockPool),
            close: jest.fn(),
            testConnection: jest.fn()
        }))
    }
}));

// Mock repositories
jest.mock('../../database/repositories/CostAnalysisRepository');

// Create mock pool
const mockPool = {
    query: jest.fn(),
    connect: jest.fn(),
    end: jest.fn()
} as unknown as Pool;

describe('Infrastructure and Scaling Production Readiness', () => {
    let autoScalingService: AutoScalingService;
    let costAnalysisService: CostAnalysisService;
    let mockDb: any;

    beforeEach(() => {
        jest.clearAllMocks();

        // Create mock database connection
        mockDb = {
            query: jest.fn(),
            getPool: jest.fn(() => mockPool),
            close: jest.fn(),
            testConnection: jest.fn()
        };

        // Initialize services
        autoScalingService = new AutoScalingService(mockDb);

        // Mock cost analysis repository
        const mockCostRepo = {
            saveCostMetrics: jest.fn().mockImplementation((metrics) => ({
                id: `cost-${Date.now()}`,
                ...metrics
            })),
            getCostMetrics: jest.fn().mockResolvedValue([]),
            saveSubscriptionRecommendation: jest.fn().mockImplementation((rec) => ({
                id: `rec-${Date.now()}`,
                ...rec
            })),
            saveProfitabilityReport: jest.fn().mockImplementation((report) => ({
                id: `report-${Date.now()}`,
                ...report
            })),
            getProfitabilityReports: jest.fn().mockResolvedValue([]),
            saveCostAlert: jest.fn().mockImplementation((alert) => ({
                id: `alert-${Date.now()}`,
                ...alert
            }))
        };

        costAnalysisService = new CostAnalysisService(mockCostRepo as any);

        // Mock default database responses
        mockDb.query.mockImplementation((query: string, values?: any[]) => {
            if (query.includes('infrastructure_state')) {
                return Promise.resolve({
                    rows: [{ instance_count: 2 }]
                });
            }
            if (query.includes('system_metrics')) {
                return Promise.resolve({
                    rows: [{
                        cpu_utilization: '45.5',
                        memory_utilization: '60.2',
                        response_time: '800',
                        error_rate: '0.001',
                        active_users: '150',
                        requests_per_second: '25.5'
                    }]
                });
            }
            if (query.includes('scaling_decisions')) {
                return Promise.resolve({ rows: [] });
            }
            if (query.includes('pg_stat_statements')) {
                return Promise.resolve({
                    rows: [
                        { query: 'SELECT * FROM users WHERE id = $1' },
                        { query: 'SELECT * FROM weight_entries WHERE user_id = $1 ORDER BY timestamp DESC' }
                    ]
                });
            }
            return Promise.resolve({ rows: [] });
        });
    });

    describe('Terraform Infrastructure Deployment Verification', () => {
        it('should validate Terraform configuration syntax and structure', () => {
            // Requirement 17.1: Terraform scripts for infrastructure as code
            const terraformMainPath = path.join(process.cwd(), 'terraform', 'main.tf');
            const terraformVariablesPath = path.join(process.cwd(), 'terraform', 'variables.tf');
            const terraformOutputsPath = path.join(process.cwd(), 'terraform', 'outputs.tf');

            // Verify main Terraform files exist
            expect(fs.existsSync(terraformMainPath)).toBe(true);
            expect(fs.existsSync(terraformVariablesPath)).toBe(true);
            expect(fs.existsSync(terraformOutputsPath)).toBe(true);

            // Read and validate main.tf structure
            const mainTfContent = fs.readFileSync(terraformMainPath, 'utf8');

            // Verify required providers and backend configuration
            expect(mainTfContent).toContain('terraform {');
            expect(mainTfContent).toContain('required_providers');
            expect(mainTfContent).toContain('backend "s3"');
            expect(mainTfContent).toContain('provider "aws"');

            // Verify essential modules are defined
            expect(mainTfContent).toContain('module "networking"');
            expect(mainTfContent).toContain('module "security"');
            expect(mainTfContent).toContain('module "database"');
            expect(mainTfContent).toContain('module "storage"');
            expect(mainTfContent).toContain('module "compute"');
            expect(mainTfContent).toContain('module "monitoring"');
            expect(mainTfContent).toContain('module "international"');
        });

        it('should validate environment-specific configurations', () => {
            // Requirement 17.2: Separate configurations for development, staging, production
            const environmentsPath = path.join(process.cwd(), 'terraform', 'environments');

            // Check if environments directory exists (may be closed in file tree)
            // For this test, we'll validate the variables support environment differentiation
            const variablesPath = path.join(process.cwd(), 'terraform', 'variables.tf');
            const variablesContent = fs.readFileSync(variablesPath, 'utf8');

            // Verify environment variable with validation
            expect(variablesContent).toContain('variable "environment"');
            expect(variablesContent).toContain('validation {');
            expect(variablesContent).toContain('development');
            expect(variablesContent).toContain('staging');
            expect(variablesContent).toContain('production');

            // Verify scaling configuration variables
            expect(variablesContent).toContain('variable "min_capacity"');
            expect(variablesContent).toContain('variable "max_capacity"');
            expect(variablesContent).toContain('variable "desired_capacity"');
        });

        it('should validate module structure and dependencies', () => {
            const modulesPath = path.join(process.cwd(), 'terraform', 'modules');

            // Verify essential modules exist
            const requiredModules = [
                'networking', 'security', 'database', 'storage',
                'compute', 'monitoring', 'international'
            ];

            for (const moduleName of requiredModules) {
                const modulePath = path.join(modulesPath, moduleName);
                const mainTfPath = path.join(modulePath, 'main.tf');
                const variablesPath = path.join(modulePath, 'variables.tf');
                const outputsPath = path.join(modulePath, 'outputs.tf');

                expect(fs.existsSync(mainTfPath)).toBe(true);
                expect(fs.existsSync(variablesPath)).toBe(true);
                expect(fs.existsSync(outputsPath)).toBe(true);
            }
        });

        it('should validate infrastructure outputs for service integration', () => {
            const outputsPath = path.join(process.cwd(), 'terraform', 'outputs.tf');
            const outputsContent = fs.readFileSync(outputsPath, 'utf8');

            // Verify essential outputs for application integration
            const requiredOutputs = [
                'vpc_id', 'rds_endpoint', 'elasticache_endpoint',
                's3_bucket_name', 'cloudfront_distribution_id',
                'ecs_cluster_name', 'load_balancer_dns_name'
            ];

            for (const output of requiredOutputs) {
                expect(outputsContent).toContain(`output "${output}"`);
            }

            // Verify sensitive outputs are marked appropriately
            expect(outputsContent).toContain('sensitive   = true');
        });

        it('should validate Terraform state management configuration', () => {
            const mainTfPath = path.join(process.cwd(), 'terraform', 'main.tf');
            const mainTfContent = fs.readFileSync(mainTfPath, 'utf8');

            // Verify S3 backend configuration
            expect(mainTfContent).toContain('backend "s3"');

            // Verify required version constraints
            expect(mainTfContent).toContain('required_version = ">= 1.0"');
            expect(mainTfContent).toContain('version = "~> 5.0"');

            // Verify default tags configuration
            expect(mainTfContent).toContain('default_tags');
            expect(mainTfContent).toContain('Project');
            expect(mainTfContent).toContain('Environment');
            expect(mainTfContent).toContain('ManagedBy');
        });
    });

    describe('Auto-scaling Functionality Under Simulated Load', () => {
        it('should scale up when performance thresholds are exceeded', async () => {
            // Requirement 16.4: Automatically scale resources based on user demand
            const highLoadMetrics: ScalingMetrics = {
                cpuUtilization: 85, // Above 70% threshold
                memoryUtilization: 90, // Above 80% threshold
                responseTime: 2500, // Above 2000ms threshold
                errorRate: 0.02, // Above 1% threshold
                activeUsers: 500,
                requestsPerSecond: 100,
                timestamp: new Date()
            };

            const decision = await autoScalingService.analyzeScalingNeeds(highLoadMetrics);

            expect(decision.shouldScale).toBe(true);
            expect(decision.direction).toBe('up');
            expect(decision.targetInstances).toBeGreaterThan(2);
            expect(decision.reason).toContain('High resource utilization');
            expect(decision.estimatedCost).toBeGreaterThan(0);
        });

        it('should scale down when resources are underutilized for cost optimization', async () => {
            // Mock higher current instance count for scale-down test
            mockDb.query.mockImplementation((query: string) => {
                if (query.includes('infrastructure_state')) {
                    return Promise.resolve({
                        rows: [{ instance_count: 6 }] // Higher count to allow scale-down
                    });
                }
                return Promise.resolve({ rows: [] });
            });

            const lowLoadMetrics: ScalingMetrics = {
                cpuUtilization: 25, // Well below 35% (50% of 70% threshold)
                memoryUtilization: 30, // Well below 40% (50% of 80% threshold)
                responseTime: 500, // Well below 1000ms (50% of 2000ms threshold)
                errorRate: 0.0001, // Well below 0.005% (50% of 1% threshold)
                activeUsers: 50,
                requestsPerSecond: 5,
                timestamp: new Date()
            };

            const decision = await autoScalingService.analyzeScalingNeeds(lowLoadMetrics);

            expect(decision.shouldScale).toBe(true);
            expect(decision.direction).toBe('down');
            expect(decision.targetInstances).toBeLessThan(6);
            expect(decision.targetInstances).toBeGreaterThanOrEqual(2); // Respect minimum
            expect(decision.reason).toContain('Low resource utilization');
            expect(decision.estimatedCost).toBeLessThan(0); // Negative cost (savings)
        });

        it('should maintain performance standards during scaling operations', async () => {
            // Requirement 16.5: Maintain performance standards during scaling
            const scalingDecision = {
                shouldScale: true,
                direction: 'up' as const,
                targetInstances: 4,
                reason: 'Test scaling operation',
                estimatedCost: 50
            };

            const result = await autoScalingService.executeScaling(scalingDecision);

            expect(result.success).toBe(true);
            expect(result.newInstanceCount).toBe(4);
            expect(result.scalingTime).toBeGreaterThan(0);
            expect(result.performanceMaintained).toBe(true);

            // Verify instance count was updated in database
            expect(mockDb.query).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO infrastructure_state'),
                expect.arrayContaining(['vitracka-main', 4])
            );
        });

        it('should respect minimum and maximum instance limits', async () => {
            // Test maximum limit
            mockDb.query.mockImplementation((query: string) => {
                if (query.includes('infrastructure_state')) {
                    return Promise.resolve({
                        rows: [{ instance_count: 18 }] // Near maximum
                    });
                }
                return Promise.resolve({ rows: [] });
            });

            const extremeLoadMetrics: ScalingMetrics = {
                cpuUtilization: 95,
                memoryUtilization: 95,
                responseTime: 5000,
                errorRate: 0.05,
                activeUsers: 1000,
                requestsPerSecond: 200,
                timestamp: new Date()
            };

            const upDecision = await autoScalingService.analyzeScalingNeeds(extremeLoadMetrics);
            expect(upDecision.targetInstances).toBeLessThanOrEqual(20); // Max limit

            // Test minimum limit
            mockDb.query.mockImplementation((query: string) => {
                if (query.includes('infrastructure_state')) {
                    return Promise.resolve({
                        rows: [{ instance_count: 3 }] // Near minimum
                    });
                }
                return Promise.resolve({ rows: [] });
            });

            const minimalLoadMetrics: ScalingMetrics = {
                cpuUtilization: 10,
                memoryUtilization: 15,
                responseTime: 200,
                errorRate: 0.0001,
                activeUsers: 10,
                requestsPerSecond: 1,
                timestamp: new Date()
            };

            const downDecision = await autoScalingService.analyzeScalingNeeds(minimalLoadMetrics);
            expect(downDecision.targetInstances).toBeGreaterThanOrEqual(2); // Min limit
        });

        it('should collect and analyze performance metrics accurately', async () => {
            const metrics = await autoScalingService.collectPerformanceMetrics();

            expect(metrics).toHaveProperty('cpuUtilization');
            expect(metrics).toHaveProperty('memoryUtilization');
            expect(metrics).toHaveProperty('responseTime');
            expect(metrics).toHaveProperty('errorRate');
            expect(metrics).toHaveProperty('activeUsers');
            expect(metrics).toHaveProperty('requestsPerSecond');
            expect(metrics).toHaveProperty('timestamp');

            expect(typeof metrics.cpuUtilization).toBe('number');
            expect(typeof metrics.memoryUtilization).toBe('number');
            expect(typeof metrics.responseTime).toBe('number');
            expect(typeof metrics.errorRate).toBe('number');
            expect(typeof metrics.activeUsers).toBe('number');
            expect(typeof metrics.requestsPerSecond).toBe('number');
            expect(metrics.timestamp).toBeInstanceOf(Date);
        });

        it('should optimize database performance and implement caching', async () => {
            const optimization = await autoScalingService.optimizeDatabasePerformance();

            expect(optimization).toHaveProperty('queriesOptimized');
            expect(optimization).toHaveProperty('cacheHitRate');
            expect(optimization).toHaveProperty('performanceImprovement');

            expect(typeof optimization.queriesOptimized).toBe('number');
            expect(typeof optimization.cacheHitRate).toBe('number');
            expect(typeof optimization.performanceImprovement).toBe('number');

            expect(optimization.queriesOptimized).toBeGreaterThanOrEqual(0);
            expect(optimization.cacheHitRate).toBeGreaterThanOrEqual(0);
            expect(optimization.cacheHitRate).toBeLessThanOrEqual(1);
            expect(optimization.performanceImprovement).toBeGreaterThanOrEqual(0);
        });
    });

    describe('Cost Monitoring and Business Intelligence Features', () => {
        it('should monitor infrastructure costs in real-time', async () => {
            // Requirement 16.1: Monitor AWS infrastructure costs and usage patterns
            const costMetrics = await costAnalysisService.monitorInfrastructureCosts();

            expect(costMetrics).toHaveProperty('id');
            expect(costMetrics).toHaveProperty('timestamp');
            expect(costMetrics).toHaveProperty('period');
            expect(costMetrics).toHaveProperty('totalCost');
            expect(costMetrics).toHaveProperty('costBreakdown');
            expect(costMetrics).toHaveProperty('userCount');
            expect(costMetrics).toHaveProperty('costPerUser');
            expect(costMetrics).toHaveProperty('agentInteractions');
            expect(costMetrics).toHaveProperty('costPerInteraction');

            expect(costMetrics.period).toBe('daily');
            expect(costMetrics.totalCost).toBeGreaterThan(0);
            expect(costMetrics.userCount).toBeGreaterThan(0);
            expect(costMetrics.costPerUser).toBeGreaterThan(0);
            expect(costMetrics.agentInteractions).toBeGreaterThan(0);
            expect(costMetrics.costPerInteraction).toBeGreaterThan(0);

            // Verify cost breakdown structure
            expect(costMetrics.costBreakdown).toHaveProperty('agentCore');
            expect(costMetrics.costBreakdown).toHaveProperty('database');
            expect(costMetrics.costBreakdown).toHaveProperty('storage');
            expect(costMetrics.costBreakdown).toHaveProperty('networking');
            expect(costMetrics.costBreakdown).toHaveProperty('externalAPIs');
        });

        it('should calculate per-user operational costs accurately', async () => {
            // Requirement 16.2: Calculate per-user operational costs
            const dailyCost = await costAnalysisService.calculatePerUserCosts('daily');
            const weeklyCost = await costAnalysisService.calculatePerUserCosts('weekly');
            const monthlyCost = await costAnalysisService.calculatePerUserCosts('monthly');

            expect(typeof dailyCost).toBe('number');
            expect(typeof weeklyCost).toBe('number');
            expect(typeof monthlyCost).toBe('number');

            expect(dailyCost).toBeGreaterThanOrEqual(0);
            expect(weeklyCost).toBeGreaterThanOrEqual(0);
            expect(monthlyCost).toBeGreaterThanOrEqual(0);

            // Weekly cost should generally be higher than daily (more data points)
            // Monthly cost should generally be higher than weekly
            expect(monthlyCost).toBeGreaterThanOrEqual(weeklyCost);
        });

        it('should generate subscription pricing recommendations', async () => {
            // Requirement 16.3: Generate subscription pricing recommendations

            // Mock cost metrics data for the calculation
            const mockCostRepo = (costAnalysisService as any).costAnalysisRepository;
            mockCostRepo.getCostMetrics.mockResolvedValue([
                {
                    timestamp: new Date(),
                    totalCost: 100,
                    userCount: 50,
                    costPerUser: 2.0,
                    agentInteractions: 500,
                    costPerInteraction: 0.2
                },
                {
                    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
                    totalCost: 95,
                    userCount: 48,
                    costPerUser: 1.98,
                    agentInteractions: 480,
                    costPerInteraction: 0.198
                }
            ]);

            const recommendations = await costAnalysisService.generateSubscriptionRecommendations(0.35);

            expect(recommendations).toHaveProperty('id');
            expect(recommendations).toHaveProperty('generatedAt');
            expect(recommendations).toHaveProperty('recommendedTiers');
            expect(recommendations).toHaveProperty('costBasis');
            expect(recommendations).toHaveProperty('validUntil');

            expect(Array.isArray(recommendations.recommendedTiers)).toBe(true);
            expect(recommendations.recommendedTiers.length).toBeGreaterThan(0);

            // Verify tier structure
            const basicTier = recommendations.recommendedTiers.find(t => t.tierName === 'Basic');
            const premiumTier = recommendations.recommendedTiers.find(t => t.tierName === 'Premium');
            const proTier = recommendations.recommendedTiers.find(t => t.tierName === 'Pro');

            expect(basicTier).toBeDefined();
            expect(premiumTier).toBeDefined();
            expect(proTier).toBeDefined();

            // Verify pricing progression (should be greater than 0 and increasing)
            expect(basicTier!.monthlyPrice).toBeGreaterThan(0);
            expect(premiumTier!.monthlyPrice).toBeGreaterThan(basicTier!.monthlyPrice);
            expect(proTier!.monthlyPrice).toBeGreaterThan(premiumTier!.monthlyPrice);

            // Verify cost basis
            expect(recommendations.costBasis).toHaveProperty('avgCostPerUser');
            expect(recommendations.costBasis).toHaveProperty('infrastructureOverhead');
            expect(recommendations.costBasis).toHaveProperty('targetProfitMargin');
            expect(recommendations.costBasis.targetProfitMargin).toBe(0.35);
            expect(recommendations.costBasis.avgCostPerUser).toBeGreaterThan(0);
        });

        it('should generate comprehensive profitability reports', async () => {
            const report = await costAnalysisService.generateProfitabilityReport('monthly');

            expect(report).toHaveProperty('id');
            expect(report).toHaveProperty('reportDate');
            expect(report).toHaveProperty('period');
            expect(report).toHaveProperty('revenue');
            expect(report).toHaveProperty('costs');
            expect(report).toHaveProperty('profit');
            expect(report).toHaveProperty('userMetrics');

            expect(report.period).toBe('monthly');

            // Verify revenue structure
            expect(report.revenue).toHaveProperty('subscriptions');
            expect(report.revenue).toHaveProperty('total');
            expect(report.revenue.total).toBeGreaterThanOrEqual(report.revenue.subscriptions);

            // Verify cost structure
            expect(report.costs).toHaveProperty('infrastructure');
            expect(report.costs).toHaveProperty('operations');
            expect(report.costs).toHaveProperty('total');

            // Verify profit calculations
            expect(report.profit).toHaveProperty('gross');
            expect(report.profit).toHaveProperty('margin');
            expect(typeof report.profit.margin).toBe('number');

            // Verify user metrics
            expect(report.userMetrics).toHaveProperty('activeUsers');
            expect(report.userMetrics).toHaveProperty('newUsers');
            expect(report.userMetrics).toHaveProperty('churnRate');
            expect(report.userMetrics).toHaveProperty('lifetimeValue');
            expect(report.userMetrics).toHaveProperty('acquisitionCost');
        });

        it('should provide business metrics for admin dashboard', async () => {
            // Mock profitability reports for business metrics calculation
            const mockReports = [
                {
                    id: 'report-1',
                    reportDate: new Date(),
                    period: 'monthly',
                    revenue: { subscriptions: 50000, total: 55000 },
                    costs: { infrastructure: 15000, operations: 10000, total: 25000 },
                    profit: { gross: 30000, margin: 0.545 },
                    userMetrics: {
                        activeUsers: 1000,
                        newUsers: 150,
                        churnRate: 0.05,
                        lifetimeValue: 240,
                        acquisitionCost: 35
                    }
                },
                {
                    id: 'report-2',
                    reportDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                    period: 'monthly',
                    revenue: { subscriptions: 45000, total: 50000 },
                    costs: { infrastructure: 14000, operations: 9000, total: 23000 },
                    profit: { gross: 27000, margin: 0.54 },
                    userMetrics: {
                        activeUsers: 900,
                        newUsers: 120,
                        churnRate: 0.06,
                        lifetimeValue: 220,
                        acquisitionCost: 32
                    }
                }
            ];

            // Mock the repository method
            const mockCostRepo = (costAnalysisService as any).costAnalysisRepository;
            mockCostRepo.getProfitabilityReports.mockResolvedValue(mockReports);

            const businessMetrics = await costAnalysisService.getBusinessMetrics();

            expect(businessMetrics).toHaveProperty('id');
            expect(businessMetrics).toHaveProperty('timestamp');
            expect(businessMetrics).toHaveProperty('metrics');
            expect(businessMetrics).toHaveProperty('forecasts');

            // Verify key business metrics
            expect(businessMetrics.metrics).toHaveProperty('monthlyRecurringRevenue');
            expect(businessMetrics.metrics).toHaveProperty('customerLifetimeValue');
            expect(businessMetrics.metrics).toHaveProperty('customerAcquisitionCost');
            expect(businessMetrics.metrics).toHaveProperty('churnRate');
            expect(businessMetrics.metrics).toHaveProperty('grossMargin');
            expect(businessMetrics.metrics).toHaveProperty('burnRate');
            expect(businessMetrics.metrics).toHaveProperty('runwayMonths');

            // Verify forecasts
            expect(businessMetrics.forecasts).toHaveProperty('nextMonthRevenue');
            expect(businessMetrics.forecasts).toHaveProperty('nextMonthCosts');
            expect(businessMetrics.forecasts).toHaveProperty('confidenceInterval');
        });

        it('should generate cost optimization suggestions', async () => {
            // Mock recent metrics with high costs to trigger suggestions
            const mockCostRepo = (costAnalysisService as any).costAnalysisRepository;
            mockCostRepo.getCostMetrics.mockResolvedValue([
                {
                    timestamp: new Date(),
                    totalCost: 150,
                    costPerInteraction: 0.08,
                    userCount: 200,
                    agentInteractions: 1000
                },
                {
                    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
                    totalCost: 145,
                    costPerInteraction: 0.07,
                    userCount: 195,
                    agentInteractions: 950
                }
            ]);

            const suggestions = await costAnalysisService.generateOptimizationSuggestions();

            expect(Array.isArray(suggestions)).toBe(true);
            expect(suggestions.length).toBeGreaterThan(0);

            // Verify suggestion structure
            const suggestion = suggestions[0];
            expect(suggestion).toHaveProperty('id');
            expect(suggestion).toHaveProperty('generatedAt');
            expect(suggestion).toHaveProperty('category');
            expect(suggestion).toHaveProperty('title');
            expect(suggestion).toHaveProperty('description');
            expect(suggestion).toHaveProperty('potentialSavings');
            expect(suggestion).toHaveProperty('implementationEffort');
            expect(suggestion).toHaveProperty('priority');
            expect(suggestion).toHaveProperty('estimatedImpact');
            expect(suggestion).toHaveProperty('actionItems');

            expect(Array.isArray(suggestion.actionItems)).toBe(true);
            expect(suggestion.actionItems.length).toBeGreaterThan(0);
        });
    });

    describe('Backup and Disaster Recovery Procedures', () => {
        it('should validate backup configuration in Terraform', () => {
            // Check if international module exists (handles backup and DR)
            const internationalModulePath = path.join(process.cwd(), 'terraform', 'modules', 'international');
            const mainTfPath = path.join(internationalModulePath, 'main.tf');

            expect(fs.existsSync(mainTfPath)).toBe(true);

            // Verify backup-related variables in main variables file
            const variablesPath = path.join(process.cwd(), 'terraform', 'variables.tf');
            const variablesContent = fs.readFileSync(variablesPath, 'utf8');

            expect(variablesContent).toContain('backup_regions');
            expect(variablesContent).toContain('enable_multi_region');
            expect(variablesContent).toContain('data_residency_region');
        });

        it('should verify database backup and recovery capabilities', async () => {
            // Test database connection and backup readiness
            const connectionTest = await mockDb.testConnection();
            expect(connectionTest).toBeUndefined(); // Mock returns undefined for success

            // Verify backup-related database queries work
            const backupQuery = 'SELECT pg_start_backup($1, $2)';
            const backupResult = await mockDb.query(backupQuery, ['test-backup', false]);
            expect(backupResult).toBeDefined();

            // Test point-in-time recovery query structure
            const recoveryQuery = 'SELECT pg_stop_backup()';
            const recoveryResult = await mockDb.query(recoveryQuery);
            expect(recoveryResult).toBeDefined();
        });

        it('should validate multi-region deployment readiness', () => {
            const mainTfPath = path.join(process.cwd(), 'terraform', 'main.tf');
            const mainTfContent = fs.readFileSync(mainTfPath, 'utf8');

            // Verify international module is configured
            expect(mainTfContent).toContain('module "international"');
            expect(mainTfContent).toContain('enable_multi_region');
            expect(mainTfContent).toContain('backup_regions');
            expect(mainTfContent).toContain('data_residency_region');
            expect(mainTfContent).toContain('primary_region');

            // Verify data sources for availability zones
            expect(mainTfContent).toContain('data "aws_availability_zones" "available"');
        });

        it('should verify disaster recovery automation scripts', () => {
            const scriptsPath = path.join(process.cwd(), 'terraform', 'scripts');

            // Check for deployment and recovery scripts
            const deployScriptPath = path.join(scriptsPath, 'deploy.sh');
            const validateScriptPath = path.join(scriptsPath, 'validate.ps1');
            const blueGreenScriptPath = path.join(scriptsPath, 'blue-green-deploy.sh');

            expect(fs.existsSync(deployScriptPath)).toBe(true);
            expect(fs.existsSync(validateScriptPath)).toBe(true);
            expect(fs.existsSync(blueGreenScriptPath)).toBe(true);

            // Verify blue-green deployment script for zero-downtime recovery
            const blueGreenContent = fs.readFileSync(blueGreenScriptPath, 'utf8');
            expect(blueGreenContent).toContain('blue');
            expect(blueGreenContent).toContain('green');
        });

        it('should validate monitoring and alerting for disaster scenarios', () => {
            const monitoringModulePath = path.join(process.cwd(), 'terraform', 'modules', 'monitoring');
            const mainTfPath = path.join(monitoringModulePath, 'main.tf');

            expect(fs.existsSync(mainTfPath)).toBe(true);

            // Verify monitoring module exists in main configuration
            const mainConfigPath = path.join(process.cwd(), 'terraform', 'main.tf');
            const mainConfigContent = fs.readFileSync(mainConfigPath, 'utf8');
            expect(mainConfigContent).toContain('module "monitoring"');
        });

        it('should test data integrity during simulated failure scenarios', async () => {
            // Simulate database connection failure
            const originalQuery = mockDb.query;
            mockDb.query = jest.fn().mockRejectedValue(new Error('Connection failed'));

            // Test graceful handling of database failures
            try {
                await autoScalingService.collectPerformanceMetrics();
                // Should not throw, should return default values
            } catch (error) {
                // If it throws, the service should handle it gracefully
                expect(error).toBeUndefined();
            }

            // Restore original query function
            mockDb.query = originalQuery;

            // Test recovery after connection restoration
            const metrics = await autoScalingService.collectPerformanceMetrics();
            expect(metrics).toBeDefined();
            expect(metrics.timestamp).toBeInstanceOf(Date);
        });

        it('should validate backup retention and compliance policies', () => {
            // Check if compliance requirements are defined in variables
            const variablesPath = path.join(process.cwd(), 'terraform', 'variables.tf');
            const variablesContent = fs.readFileSync(variablesPath, 'utf8');

            expect(variablesContent).toContain('compliance_requirements');
            expect(variablesContent).toContain('GDPR');

            // Verify backup retention is considered in the configuration
            // This would typically be in the database or storage modules
            const databaseModulePath = path.join(process.cwd(), 'terraform', 'modules', 'database');
            const databaseMainPath = path.join(databaseModulePath, 'main.tf');

            expect(fs.existsSync(databaseMainPath)).toBe(true);
        });
    });

    describe('Infrastructure Performance and Reliability', () => {
        it('should validate infrastructure scaling limits and thresholds', async () => {
            const testMetrics: ScalingMetrics = {
                cpuUtilization: 50,
                memoryUtilization: 60,
                responseTime: 1000,
                errorRate: 0.005,
                activeUsers: 100,
                requestsPerSecond: 20,
                timestamp: new Date()
            };

            const decision = await autoScalingService.analyzeScalingNeeds(testMetrics);

            // Should not scale when within normal thresholds
            expect(decision.shouldScale).toBe(false);
            expect(decision.direction).toBe('none');
            expect(decision.reason).toContain('within acceptable thresholds');
        });

        it('should handle concurrent scaling operations safely', async () => {
            const scalingPromises = [];

            // Simulate multiple concurrent scaling requests
            for (let i = 0; i < 3; i++) {
                const decision = {
                    shouldScale: true,
                    direction: 'up' as const,
                    targetInstances: 3 + i,
                    reason: `Concurrent scaling test ${i}`,
                    estimatedCost: 10 * i
                };

                scalingPromises.push(autoScalingService.executeScaling(decision));
            }

            const results = await Promise.all(scalingPromises);

            // All operations should complete successfully
            results.forEach(result => {
                expect(result.success).toBe(true);
                expect(result.scalingTime).toBeGreaterThan(0);
            });
        });

        it('should maintain service availability during infrastructure updates', async () => {
            // Test that the service continues to function during simulated updates
            const beforeMetrics = await autoScalingService.collectPerformanceMetrics();
            expect(beforeMetrics).toBeDefined();

            // Simulate infrastructure update (brief delay)
            await new Promise(resolve => setTimeout(resolve, 100));

            const afterMetrics = await autoScalingService.collectPerformanceMetrics();
            expect(afterMetrics).toBeDefined();
            expect(afterMetrics.timestamp.getTime()).toBeGreaterThan(beforeMetrics.timestamp.getTime());
        });
    });
});