/**
 * Eating Plan Repository
 * Data access layer for eating plans and dietary preferences
 */

import { EatingPlan, EatingPlanType } from '../../types';
import DatabaseConnection from '../connection';
import { v4 as uuidv4 } from 'uuid';

export class EatingPlanRepository {
    private db = DatabaseConnection.getInstance();

    async create(plan: Omit<EatingPlan, 'id' | 'createdAt'>): Promise<EatingPlan> {
        const id = uuidv4();

        const query = `
      INSERT INTO eating_plans (id, user_id, type, daily_target, restrictions, preferences, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

        const values = [
            id,
            plan.userId,
            plan.type,
            plan.dailyTarget,
            plan.restrictions,
            plan.preferences,
            plan.isActive
        ];

        const result = await this.db.query(query, values);
        return this.mapRowToEatingPlan(result.rows[0]);
    }

    async findById(id: string): Promise<EatingPlan | null> {
        const query = 'SELECT * FROM eating_plans WHERE id = $1';
        const result = await this.db.query(query, [id]);

        if (result.rows.length === 0) {
            return null;
        }

        return this.mapRowToEatingPlan(result.rows[0]);
    }

    async findByUserId(userId: string): Promise<EatingPlan[]> {
        const query = 'SELECT * FROM eating_plans WHERE user_id = $1 ORDER BY created_at DESC';
        const result = await this.db.query(query, [userId]);
        return result.rows.map((row: any) => this.mapRowToEatingPlan(row));
    }

    async findActiveByUserId(userId: string): Promise<EatingPlan | null> {
        const query = 'SELECT * FROM eating_plans WHERE user_id = $1 AND is_active = true ORDER BY created_at DESC LIMIT 1';
        const result = await this.db.query(query, [userId]);

        if (result.rows.length === 0) {
            return null;
        }

        return this.mapRowToEatingPlan(result.rows[0]);
    }

    async update(id: string, updates: Partial<EatingPlan>): Promise<EatingPlan | null> {
        const updateFields: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        if (updates.type !== undefined) {
            updateFields.push(`type = $${paramIndex++}`);
            values.push(updates.type);
        }

        if (updates.dailyTarget !== undefined) {
            updateFields.push(`daily_target = $${paramIndex++}`);
            values.push(updates.dailyTarget);
        }

        if (updates.restrictions !== undefined) {
            updateFields.push(`restrictions = $${paramIndex++}`);
            values.push(updates.restrictions);
        }

        if (updates.preferences !== undefined) {
            updateFields.push(`preferences = $${paramIndex++}`);
            values.push(updates.preferences);
        }

        if (updates.isActive !== undefined) {
            updateFields.push(`is_active = $${paramIndex++}`);
            values.push(updates.isActive);
        }

        if (updateFields.length === 0) {
            return await this.findById(id);
        }

        values.push(id);
        const query = `
      UPDATE eating_plans 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

        const result = await this.db.query(query, values);

        if (result.rows.length === 0) {
            return null;
        }

        return this.mapRowToEatingPlan(result.rows[0]);
    }

    async deactivateAllForUser(userId: string): Promise<void> {
        const query = 'UPDATE eating_plans SET is_active = false WHERE user_id = $1';
        await this.db.query(query, [userId]);
    }

    async activatePlan(id: string, userId: string): Promise<EatingPlan | null> {
        // First deactivate all other plans for the user
        await this.deactivateAllForUser(userId);

        // Then activate the specified plan
        const query = `
      UPDATE eating_plans 
      SET is_active = true 
      WHERE id = $1 AND user_id = $2
      RETURNING *
    `;

        const result = await this.db.query(query, [id, userId]);

        if (result.rows.length === 0) {
            return null;
        }

        return this.mapRowToEatingPlan(result.rows[0]);
    }

    async delete(id: string): Promise<boolean> {
        const query = 'DELETE FROM eating_plans WHERE id = $1';
        const result = await this.db.query(query, [id]);
        return result.rowCount > 0;
    }

    async softDeleteByUserId(userId: string): Promise<void> {
        const query = 'UPDATE eating_plans SET deleted_at = CURRENT_TIMESTAMP WHERE user_id = $1';
        await this.db.query(query, [userId]);
    }

    async hardDeleteByUserId(userId: string): Promise<void> {
        const query = 'DELETE FROM eating_plans WHERE user_id = $1';
        await this.db.query(query, [userId]);
    }

    private mapRowToEatingPlan(row: any): EatingPlan {
        return {
            id: row.id,
            userId: row.user_id,
            type: row.type as EatingPlanType,
            dailyTarget: parseFloat(row.daily_target),
            restrictions: row.restrictions || [],
            preferences: row.preferences || [],
            isActive: row.is_active,
            createdAt: new Date(row.created_at)
        };
    }
}