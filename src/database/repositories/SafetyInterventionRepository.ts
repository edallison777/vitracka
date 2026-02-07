/**
 * Safety Intervention Repository
 * Data access layer for safety interventions and audit logging
 */

import { SafetyIntervention, TriggerType, EscalationLevel } from '../../types';
import DatabaseConnection from '../connection';
import { v4 as uuidv4 } from 'uuid';

export class SafetyInterventionRepository {
    private db = DatabaseConnection.getInstance();

    async create(intervention: Omit<SafetyIntervention, 'id' | 'timestamp'>): Promise<SafetyIntervention> {
        const id = uuidv4();

        const query = `
      INSERT INTO safety_interventions (
        id, user_id, trigger_type, trigger_content, agent_response, 
        escalation_level, admin_notified, follow_up_required
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

        const values = [
            id,
            intervention.userId,
            intervention.triggerType,
            intervention.triggerContent,
            intervention.agentResponse,
            intervention.escalationLevel,
            intervention.adminNotified,
            intervention.followUpRequired
        ];

        const result = await this.db.query(query, values);
        return this.mapRowToSafetyIntervention(result.rows[0]);
    }

    async findById(id: string): Promise<SafetyIntervention | null> {
        const query = 'SELECT * FROM safety_interventions WHERE id = $1';
        const result = await this.db.query(query, [id]);

        if (result.rows.length === 0) {
            return null;
        }

        return this.mapRowToSafetyIntervention(result.rows[0]);
    }

    async findByUserId(userId: string, limit?: number, offset?: number): Promise<SafetyIntervention[]> {
        let query = 'SELECT * FROM safety_interventions WHERE user_id = $1 ORDER BY timestamp DESC';
        const values: any[] = [userId];

        if (limit) {
            query += ` LIMIT $${values.length + 1}`;
            values.push(limit);
        }

        if (offset) {
            query += ` OFFSET $${values.length + 1}`;
            values.push(offset);
        }

        const result = await this.db.query(query, values);
        return result.rows.map((row: any) => this.mapRowToSafetyIntervention(row));
    }

    async findByEscalationLevel(escalationLevel: EscalationLevel): Promise<SafetyIntervention[]> {
        const query = 'SELECT * FROM safety_interventions WHERE escalation_level = $1 ORDER BY timestamp DESC';
        const result = await this.db.query(query, [escalationLevel]);
        return result.rows.map((row: any) => this.mapRowToSafetyIntervention(row));
    }

    async findUnnotifiedAdminInterventions(): Promise<SafetyIntervention[]> {
        const query = `
      SELECT * FROM safety_interventions 
      WHERE admin_notified = false AND escalation_level IN ('high', 'critical')
      ORDER BY timestamp ASC
    `;
        const result = await this.db.query(query);
        return result.rows.map((row: any) => this.mapRowToSafetyIntervention(row));
    }

    async findPendingFollowUps(): Promise<SafetyIntervention[]> {
        const query = `
      SELECT * FROM safety_interventions 
      WHERE follow_up_required = true 
      ORDER BY timestamp ASC
    `;
        const result = await this.db.query(query);
        return result.rows.map((row: any) => this.mapRowToSafetyIntervention(row));
    }

    async markAdminNotified(id: string): Promise<SafetyIntervention | null> {
        const query = `
      UPDATE safety_interventions 
      SET admin_notified = true 
      WHERE id = $1
      RETURNING *
    `;

        const result = await this.db.query(query, [id]);

        if (result.rows.length === 0) {
            return null;
        }

        return this.mapRowToSafetyIntervention(result.rows[0]);
    }

    async markFollowUpComplete(id: string): Promise<SafetyIntervention | null> {
        const query = `
      UPDATE safety_interventions 
      SET follow_up_required = false 
      WHERE id = $1
      RETURNING *
    `;

        const result = await this.db.query(query, [id]);

        if (result.rows.length === 0) {
            return null;
        }

        return this.mapRowToSafetyIntervention(result.rows[0]);
    }

    async getInterventionStats(userId?: string): Promise<{
        total: number;
        byTriggerType: Record<TriggerType, number>;
        byEscalationLevel: Record<EscalationLevel, number>;
    }> {
        let baseQuery = 'SELECT trigger_type, escalation_level FROM safety_interventions';
        const values: any[] = [];

        if (userId) {
            baseQuery += ' WHERE user_id = $1';
            values.push(userId);
        }

        const result = await this.db.query(baseQuery, values);

        const stats = {
            total: result.rows.length,
            byTriggerType: {
                eating_disorder: 0,
                self_harm: 0,
                depression: 0,
                medical_emergency: 0
            } as Record<TriggerType, number>,
            byEscalationLevel: {
                low: 0,
                medium: 0,
                high: 0,
                critical: 0
            } as Record<EscalationLevel, number>
        };

        result.rows.forEach((row: any) => {
            stats.byTriggerType[row.trigger_type as TriggerType]++;
            stats.byEscalationLevel[row.escalation_level as EscalationLevel]++;
        });

        return stats;
    }

    async softDeleteByUserId(userId: string): Promise<void> {
        const query = 'UPDATE safety_interventions SET deleted_at = CURRENT_TIMESTAMP WHERE user_id = $1';
        await this.db.query(query, [userId]);
    }

    async hardDeleteByUserId(userId: string): Promise<void> {
        const query = 'DELETE FROM safety_interventions WHERE user_id = $1';
        await this.db.query(query, [userId]);
    }

    private mapRowToSafetyIntervention(row: any): SafetyIntervention {
        return {
            id: row.id,
            userId: row.user_id,
            triggerType: row.trigger_type as TriggerType,
            triggerContent: row.trigger_content,
            agentResponse: row.agent_response,
            escalationLevel: row.escalation_level as EscalationLevel,
            adminNotified: row.admin_notified,
            followUpRequired: row.follow_up_required,
            timestamp: new Date(row.timestamp)
        };
    }
}