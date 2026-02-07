/**
 * Cost Analysis Repository
 * Data access layer for cost metrics, profitability reports, and business intelligence
 */

import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import {
    CostMetrics,
    SubscriptionRecommendation,
    ProfitabilityReport,
    CostAlert,
    BusinessMetrics,
    CostOptimizationSuggestion
} from '../../types/cost';

export class CostAnalysisRepository {
    constructor(private pool: Pool) { }

    async saveCostMetrics(metrics: Omit<CostMetrics, 'id'>): Promise<CostMetrics> {
        const id = uuidv4();
        const query = `
      INSERT INTO cost_metrics (
        id, timestamp, period, total_cost, cost_breakdown,
        user_count, cost_per_user, agent_interactions, cost_per_interaction
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

        const values = [
            id,
            metrics.timestamp,
            metrics.period,
            metrics.totalCost,
            JSON.stringify(metrics.costBreakdown),
            metrics.userCount,
            metrics.costPerUser,
            metrics.agentInteractions,
            metrics.costPerInteraction
        ];

        const result = await this.pool.query(query, values);
        const row = result.rows[0];

        return {
            id: row.id,
            timestamp: row.timestamp,
            period: row.period,
            totalCost: row.total_cost,
            costBreakdown: JSON.parse(row.cost_breakdown),
            userCount: row.user_count,
            costPerUser: row.cost_per_user,
            agentInteractions: row.agent_interactions,
            costPerInteraction: row.cost_per_interaction
        };
    }

    async getCostMetrics(
        period: 'hourly' | 'daily' | 'weekly' | 'monthly',
        startDate: Date,
        endDate: Date
    ): Promise<CostMetrics[]> {
        const query = `
      SELECT * FROM cost_metrics
      WHERE period = $1 AND timestamp BETWEEN $2 AND $3
      ORDER BY timestamp DESC
    `;

        const result = await this.pool.query(query, [period, startDate, endDate]);

        return result.rows.map(row => ({
            id: row.id,
            timestamp: row.timestamp,
            period: row.period,
            totalCost: row.total_cost,
            costBreakdown: JSON.parse(row.cost_breakdown),
            userCount: row.user_count,
            costPerUser: row.cost_per_user,
            agentInteractions: row.agent_interactions,
            costPerInteraction: row.cost_per_interaction
        }));
    }

    async saveSubscriptionRecommendation(
        recommendation: Omit<SubscriptionRecommendation, 'id'>
    ): Promise<SubscriptionRecommendation> {
        const id = uuidv4();
        const query = `
      INSERT INTO subscription_recommendations (
        id, generated_at, recommended_tiers, cost_basis, valid_until
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

        const values = [
            id,
            recommendation.generatedAt,
            JSON.stringify(recommendation.recommendedTiers),
            JSON.stringify(recommendation.costBasis),
            recommendation.validUntil
        ];

        const result = await this.pool.query(query, values);
        const row = result.rows[0];

        return {
            id: row.id,
            generatedAt: row.generated_at,
            recommendedTiers: JSON.parse(row.recommended_tiers),
            costBasis: JSON.parse(row.cost_basis),
            validUntil: row.valid_until
        };
    }

    async getLatestSubscriptionRecommendation(): Promise<SubscriptionRecommendation | null> {
        const query = `
      SELECT * FROM subscription_recommendations
      WHERE valid_until > NOW()
      ORDER BY generated_at DESC
      LIMIT 1
    `;

        const result = await this.pool.query(query);
        if (result.rows.length === 0) return null;

        const row = result.rows[0];
        return {
            id: row.id,
            generatedAt: row.generated_at,
            recommendedTiers: JSON.parse(row.recommended_tiers),
            costBasis: JSON.parse(row.cost_basis),
            validUntil: row.valid_until
        };
    }

    async saveProfitabilityReport(
        report: Omit<ProfitabilityReport, 'id'>
    ): Promise<ProfitabilityReport> {
        const id = uuidv4();
        const query = `
      INSERT INTO profitability_reports (
        id, report_date, period, revenue, costs, profit, user_metrics
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

        const values = [
            id,
            report.reportDate,
            report.period,
            JSON.stringify(report.revenue),
            JSON.stringify(report.costs),
            JSON.stringify(report.profit),
            JSON.stringify(report.userMetrics)
        ];

        const result = await this.pool.query(query, values);
        const row = result.rows[0];

        return {
            id: row.id,
            reportDate: row.report_date,
            period: row.period,
            revenue: JSON.parse(row.revenue),
            costs: JSON.parse(row.costs),
            profit: JSON.parse(row.profit),
            userMetrics: JSON.parse(row.user_metrics)
        };
    }

    async getProfitabilityReports(
        period: 'daily' | 'weekly' | 'monthly' | 'quarterly',
        limit: number = 10
    ): Promise<ProfitabilityReport[]> {
        const query = `
      SELECT * FROM profitability_reports
      WHERE period = $1
      ORDER BY report_date DESC
      LIMIT $2
    `;

        const result = await this.pool.query(query, [period, limit]);

        return result.rows.map(row => ({
            id: row.id,
            reportDate: row.report_date,
            period: row.period,
            revenue: JSON.parse(row.revenue),
            costs: JSON.parse(row.costs),
            profit: JSON.parse(row.profit),
            userMetrics: JSON.parse(row.user_metrics)
        }));
    }

    async saveCostAlert(alert: Omit<CostAlert, 'id'>): Promise<CostAlert> {
        const id = uuidv4();
        const query = `
      INSERT INTO cost_alerts (
        id, timestamp, alert_type, severity, message,
        current_value, threshold_value, recommended_action, acknowledged
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

        const values = [
            id,
            alert.timestamp,
            alert.alertType,
            alert.severity,
            alert.message,
            alert.currentValue,
            alert.thresholdValue,
            alert.recommendedAction,
            alert.acknowledged
        ];

        const result = await this.pool.query(query, values);
        const row = result.rows[0];

        return {
            id: row.id,
            timestamp: row.timestamp,
            alertType: row.alert_type,
            severity: row.severity,
            message: row.message,
            currentValue: row.current_value,
            thresholdValue: row.threshold_value,
            recommendedAction: row.recommended_action,
            acknowledged: row.acknowledged
        };
    }

    async getUnacknowledgedAlerts(): Promise<CostAlert[]> {
        const query = `
      SELECT * FROM cost_alerts
      WHERE acknowledged = false
      ORDER BY severity DESC, timestamp DESC
    `;

        const result = await this.pool.query(query);

        return result.rows.map(row => ({
            id: row.id,
            timestamp: row.timestamp,
            alertType: row.alert_type,
            severity: row.severity,
            message: row.message,
            currentValue: row.current_value,
            thresholdValue: row.threshold_value,
            recommendedAction: row.recommended_action,
            acknowledged: row.acknowledged
        }));
    }

    async acknowledgeAlert(alertId: string): Promise<void> {
        const query = `
      UPDATE cost_alerts
      SET acknowledged = true
      WHERE id = $1
    `;

        await this.pool.query(query, [alertId]);
    }
}