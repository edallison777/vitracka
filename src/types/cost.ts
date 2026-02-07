/**
 * Cost Analysis Types
 * Types for business intelligence, cost monitoring, and profitability analysis
 */

export interface CostMetrics {
    id: string;
    timestamp: Date;
    period: 'hourly' | 'daily' | 'weekly' | 'monthly';
    totalCost: number;
    costBreakdown: {
        agentCore: number;
        database: number;
        storage: number;
        networking: number;
        externalAPIs: number;
    };
    userCount: number;
    costPerUser: number;
    agentInteractions: number;
    costPerInteraction: number;
}

export interface SubscriptionRecommendation {
    id: string;
    generatedAt: Date;
    recommendedTiers: {
        tierName: string;
        monthlyPrice: number;
        features: string[];
        targetMargin: number;
        projectedUsers: number;
    }[];
    costBasis: {
        avgCostPerUser: number;
        infrastructureOverhead: number;
        targetProfitMargin: number;
    };
    validUntil: Date;
}

export interface ProfitabilityReport {
    id: string;
    reportDate: Date;
    period: 'daily' | 'weekly' | 'monthly' | 'quarterly';
    revenue: {
        subscriptions: number;
        total: number;
    };
    costs: {
        infrastructure: number;
        operations: number;
        total: number;
    };
    profit: {
        gross: number;
        margin: number;
    };
    userMetrics: {
        activeUsers: number;
        newUsers: number;
        churnRate: number;
        lifetimeValue: number;
        acquisitionCost: number;
    };
}

export interface CostAlert {
    id: string;
    timestamp: Date;
    alertType: 'threshold_exceeded' | 'unusual_spike' | 'cost_optimization' | 'profitability_warning';
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    currentValue: number;
    thresholdValue: number;
    recommendedAction: string;
    acknowledged: boolean;
}

export interface BusinessMetrics {
    id: string;
    timestamp: Date;
    metrics: {
        monthlyRecurringRevenue: number;
        customerLifetimeValue: number;
        customerAcquisitionCost: number;
        churnRate: number;
        grossMargin: number;
        burnRate: number;
        runwayMonths: number;
    };
    forecasts: {
        nextMonthRevenue: number;
        nextMonthCosts: number;
        nextMonthProfit: number;
        confidenceInterval: number;
    };
}

export interface CostOptimizationSuggestion {
    id: string;
    generatedAt: Date;
    category: 'infrastructure' | 'operations' | 'pricing' | 'efficiency';
    title: string;
    description: string;
    potentialSavings: number;
    implementationEffort: 'low' | 'medium' | 'high';
    priority: 'low' | 'medium' | 'high' | 'critical';
    estimatedImpact: string;
    actionItems: string[];
}