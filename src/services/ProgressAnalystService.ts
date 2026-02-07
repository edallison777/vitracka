/**
 * Progress Analyst Service
 * Analyzes weight trends using rolling averages and provides insights
 * Requirements: 4.1, 4.2, 4.3, 4.4
 */

import { WeightEntry } from '../types';
import { WeightEntryRepository } from '../database/repositories';

export interface WeightTrend {
    period: string;
    averageWeight: number;
    trend: 'increasing' | 'decreasing' | 'stable';
    changeRate: number; // kg/week or lbs/week
    confidence: number; // 1-5 based on data consistency
}

export interface ProgressInsight {
    type: 'achievement' | 'plateau' | 'concern' | 'encouragement';
    message: string;
    data?: any;
}

export class ProgressAnalystService {
    private weightRepository: WeightEntryRepository;

    constructor() {
        this.weightRepository = new WeightEntryRepository();
    }

    /**
     * Calculates rolling average for weight trend analysis
     * Requirements: 4.3, 4.4
     */
    async calculateRollingAverage(userId: string, days: number = 7): Promise<WeightTrend[]> {
        const entries = await this.weightRepository.getWeightTrend(userId, days * 2); // Get more data for better analysis

        if (entries.length < 3) {
            return [];
        }

        const trends: WeightTrend[] = [];
        const windowSize = Math.min(days, entries.length);

        for (let i = windowSize - 1; i < entries.length; i++) {
            const window = entries.slice(i - windowSize + 1, i + 1);
            const averageWeight = window.reduce((sum, entry) => sum + entry.weight, 0) / window.length;

            // Calculate trend direction
            const firstWeight = window[0].weight;
            const lastWeight = window[window.length - 1].weight;
            const totalDays = (window[window.length - 1].timestamp.getTime() - window[0].timestamp.getTime()) / (1000 * 60 * 60 * 24);
            const changeRate = totalDays > 0 ? (lastWeight - firstWeight) / (totalDays / 7) : 0; // per week

            let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
            if (Math.abs(changeRate) > 0.1) { // Threshold for significant change
                trend = changeRate > 0 ? 'increasing' : 'decreasing';
            }

            // Calculate confidence based on data consistency
            const weights = window.map(e => e.weight);
            const variance = this.calculateVariance(weights);
            const confidence = Math.max(1, Math.min(5, Math.round(5 - variance / 2)));

            trends.push({
                period: `${window[0].timestamp.toISOString().split('T')[0]} to ${window[window.length - 1].timestamp.toISOString().split('T')[0]}`,
                averageWeight: Math.round(averageWeight * 10) / 10,
                trend,
                changeRate: Math.round(changeRate * 10) / 10,
                confidence
            });
        }

        return trends;
    }

    /**
     * Generates progress insights based on weight data
     * Requirements: 4.3, 4.4
     */
    async generateProgressInsights(userId: string): Promise<ProgressInsight[]> {
        const insights: ProgressInsight[] = [];
        const recentEntries = await this.weightRepository.getWeightTrend(userId, 30);

        if (recentEntries.length < 2) {
            insights.push({
                type: 'encouragement',
                message: 'Keep logging your weight regularly to see meaningful progress trends!'
            });
            return insights;
        }

        const trends = await this.calculateRollingAverage(userId, 7);
        if (trends.length === 0) return insights;

        const latestTrend = trends[trends.length - 1];
        const previousTrend = trends.length > 1 ? trends[trends.length - 2] : null;

        // Achievement detection
        if (latestTrend.trend === 'decreasing' && latestTrend.changeRate < -0.5) {
            insights.push({
                type: 'achievement',
                message: `Great progress! You're losing weight at a healthy rate of ${Math.abs(latestTrend.changeRate)} per week.`,
                data: { changeRate: latestTrend.changeRate }
            });
        }

        // Plateau detection
        if (latestTrend.trend === 'stable' && previousTrend?.trend === 'stable') {
            insights.push({
                type: 'plateau',
                message: 'Your weight has been stable recently. This might be a good time to review your eating plan or celebrate maintenance success!',
                data: { duration: 'recent weeks' }
            });
        }

        // Rapid change concern
        if (Math.abs(latestTrend.changeRate) > 2.0) {
            insights.push({
                type: 'concern',
                message: 'Your weight is changing quite rapidly. Consider discussing this pattern with a healthcare professional.',
                data: { changeRate: latestTrend.changeRate }
            });
        }

        // Consistency encouragement
        const consistencyScore = recentEntries.length / 30; // Entries per day over 30 days
        if (consistencyScore > 0.8) {
            insights.push({
                type: 'encouragement',
                message: 'Excellent job staying consistent with your weight logging! This helps create reliable trends.'
            });
        }

        return insights;
    }

    /**
     * Prepares weight data for visualization with emphasis on long-term trends
     * Requirements: 4.3, 4.4
     */
    async getVisualizationData(userId: string, period: '7d' | '30d' | '90d' = '30d'): Promise<{
        rawData: WeightEntry[];
        trendData: { date: string; weight: number; rollingAverage: number }[];
        insights: ProgressInsight[];
    }> {
        const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
        const rawData = await this.weightRepository.getWeightTrend(userId, days);

        // Calculate rolling averages for visualization
        const trendData = [];
        const windowSize = Math.min(7, rawData.length); // 7-day rolling average

        for (let i = 0; i < rawData.length; i++) {
            const startIndex = Math.max(0, i - windowSize + 1);
            const window = rawData.slice(startIndex, i + 1);
            const rollingAverage = window.reduce((sum, entry) => sum + entry.weight, 0) / window.length;

            trendData.push({
                date: rawData[i].timestamp.toISOString().split('T')[0],
                weight: rawData[i].weight,
                rollingAverage: Math.round(rollingAverage * 10) / 10
            });
        }

        const insights = await this.generateProgressInsights(userId);

        return {
            rawData,
            trendData,
            insights
        };
    }

    /**
     * Validates weight entries for data integrity
     * Requirements: 4.1, 4.2
     */
    validateWeightEntry(entry: Omit<WeightEntry, 'id' | 'timestamp'>): { isValid: boolean; errors: string[] } {
        const errors: string[] = [];

        // Weight validation
        if (entry.weight <= 0) {
            errors.push('Weight must be greater than 0');
        }
        if (entry.weight > 1000) {
            errors.push('Weight seems unrealistic (over 1000)');
        }

        // Unit validation
        if (!['kg', 'lbs'].includes(entry.unit)) {
            errors.push('Unit must be kg or lbs');
        }

        // Confidence validation
        if (entry.confidence < 1 || entry.confidence > 5) {
            errors.push('Confidence must be between 1 and 5');
        }

        // Mood validation (if provided)
        if (entry.mood && !['great', 'good', 'okay', 'struggling'].includes(entry.mood)) {
            errors.push('Mood must be one of: great, good, okay, struggling');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    private calculateVariance(numbers: number[]): number {
        const mean = numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
        const squaredDiffs = numbers.map(num => Math.pow(num - mean, 2));
        return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / numbers.length;
    }
}