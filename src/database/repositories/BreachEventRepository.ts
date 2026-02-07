/**
 * Breach Event Repository
 * Data access layer for eating plan breach events and recovery tracking
 */

import { BreachEvent, BreachSeverity } from '../../types/breach';
import DatabaseConnection from '../connection';
import { v4 as uuidv4 } from 'uuid';

export class BreachEventRepository {
    private db = DatabaseConnection.getInstance();

    async create(breach: Omit<BreachEvent, 'id'>): Promise<BreachEvent> {
        const id = uuidv4();

        const query = `
            INSERT INTO breach_events (
                id, user_id, eating_plan_id, timestamp, description, 
                severity, recovery_plan, is_recovered, recovered_at, notes
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *
        `;

        const values = [
            id,
            breach.userId,
            breach.eatingPlanId,
            breach.timestamp,
            breach.description,
            breach.severity,
            breach.recoveryPlan || null,
            breach.isRecovered,
            breach.recoveredAt || null,
            breach.notes || null
        ];

        const result = await this.db.query(query, values);
        return this.mapRowToBreachEvent(result.rows[0]);
    }

    async findById(id: string): Promise<BreachEvent | null> {
        const query = 'SELECT * FROM breach_events WHERE id = $1';
        const result = await this.db.query(query, [id]);

        if (result.rows.length === 0) {
            return null;
        }

        return this.mapRowToBreachEvent(result.rows[0]);
    }

    async findByUserId(userId: string, limit?: number): Promise<BreachEvent[]> {
        let query = 'SELECT * FROM breach_events WHERE user_id = $1 ORDER BY timestamp DESC';
        const values: any[] = [userId];

        if (limit) {
            query += ' LIMIT $2';
            values.push(limit);
        }

        const result = await this.db.query(query, values);
        return result.rows.map((row: any) => this.mapRowToBreachEvent(row));
    }

    async findByEatingPlanId(eatingPlanId: string): Promise<BreachEvent[]> {
        const query = 'SELECT * FROM breach_events WHERE eating_plan_id = $1 ORDER BY timestamp DESC';
        const result = await this.db.query(query, [eatingPlanId]);
        return result.rows.map((row: any) => this.mapRowToBreachEvent(row));
    }

    async findByUserIdInDateRange(
        userId: string,
        startDate: Date,
        endDate: Date
    ): Promise<BreachEvent[]> {
        const query = `
            SELECT * FROM breach_events 
            WHERE user_id = $1 AND timestamp >= $2 AND timestamp <= $3 
            ORDER BY timestamp DESC
        `;
        const result = await this.db.query(query, [userId, startDate, endDate]);
        return result.rows.map((row: any) => this.mapRowToBreachEvent(row));
    }

    async findUnrecoveredByUserId(userId: string): Promise<BreachEvent[]> {
        const query = `
            SELECT * FROM breach_events 
            WHERE user_id = $1 AND is_recovered = false 
            ORDER BY timestamp DESC
        `;
        const result = await this.db.query(query, [userId]);
        return result.rows.map((row: any) => this.mapRowToBreachEvent(row));
    }

    async update(id: string, updates: Partial<BreachEvent>): Promise<BreachEvent | null> {
        const updateFields: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        if (updates.description !== undefined) {
            updateFields.push(`description = $${paramIndex++}`);
            values.push(updates.description);
        }

        if (updates.severity !== undefined) {
            updateFields.push(`severity = $${paramIndex++}`);
            values.push(updates.severity);
        }

        if (updates.recoveryPlan !== undefined) {
            updateFields.push(`recovery_plan = $${paramIndex++}`);
            values.push(updates.recoveryPlan);
        }

        if (updates.isRecovered !== undefined) {
            updateFields.push(`is_recovered = $${paramIndex++}`);
            values.push(updates.isRecovered);
        }

        if (updates.recoveredAt !== undefined) {
            updateFields.push(`recovered_at = $${paramIndex++}`);
            values.push(updates.recoveredAt);
        }

        if (updates.notes !== undefined) {
            updateFields.push(`notes = $${paramIndex++}`);
            values.push(updates.notes);
        }

        if (updateFields.length === 0) {
            return await this.findById(id);
        }

        values.push(id);
        const query = `
            UPDATE breach_events 
            SET ${updateFields.join(', ')}
            WHERE id = $${paramIndex}
            RETURNING *
        `;

        const result = await this.db.query(query, values);

        if (result.rows.length === 0) {
            return null;
        }

        return this.mapRowToBreachEvent(result.rows[0]);
    }

    async markAsRecovered(id: string, recoveryPlan?: string): Promise<BreachEvent | null> {
        const query = `
            UPDATE breach_events 
            SET is_recovered = true, recovered_at = CURRENT_TIMESTAMP, recovery_plan = COALESCE($2, recovery_plan)
            WHERE id = $1
            RETURNING *
        `;

        const result = await this.db.query(query, [id, recoveryPlan || null]);

        if (result.rows.length === 0) {
            return null;
        }

        return this.mapRowToBreachEvent(result.rows[0]);
    }

    async delete(id: string): Promise<boolean> {
        const query = 'DELETE FROM breach_events WHERE id = $1';
        const result = await this.db.query(query, [id]);
        return result.rowCount > 0;
    }

    async softDeleteByUserId(userId: string): Promise<void> {
        const query = 'UPDATE breach_events SET deleted_at = CURRENT_TIMESTAMP WHERE user_id = $1';
        await this.db.query(query, [userId]);
    }

    async hardDeleteByUserId(userId: string): Promise<void> {
        const query = 'DELETE FROM breach_events WHERE user_id = $1';
        await this.db.query(query, [userId]);
    }

    async getAdherenceStats(
        userId: string,
        startDate: Date,
        endDate: Date
    ): Promise<{
        totalDays: number;
        breachDays: number;
        adherenceRate: number;
        breachCount: number;
    }> {
        const query = `
            SELECT 
                COUNT(*) as breach_count,
                COUNT(DISTINCT DATE(timestamp)) as breach_days
            FROM breach_events 
            WHERE user_id = $1 AND timestamp >= $2 AND timestamp <= $3
        `;

        const result = await this.db.query(query, [userId, startDate, endDate]);
        const row = result.rows[0];

        const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        const breachDays = parseInt(row.breach_days) || 0;
        const breachCount = parseInt(row.breach_count) || 0;
        const adherenceRate = totalDays > 0 ? Math.max(0, (totalDays - breachDays) / totalDays) : 0;

        return {
            totalDays,
            breachDays,
            adherenceRate,
            breachCount
        };
    }

    private mapRowToBreachEvent(row: any): BreachEvent {
        return {
            id: row.id,
            userId: row.user_id,
            eatingPlanId: row.eating_plan_id,
            timestamp: new Date(row.timestamp),
            description: row.description,
            severity: row.severity as BreachSeverity,
            recoveryPlan: row.recovery_plan || undefined,
            isRecovered: row.is_recovered,
            recoveredAt: row.recovered_at ? new Date(row.recovered_at) : undefined,
            notes: row.notes || undefined
        };
    }
}