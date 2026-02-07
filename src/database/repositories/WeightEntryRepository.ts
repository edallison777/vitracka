/**
 * Weight Entry Repository
 * Data access layer for weight tracking and history
 */

import { WeightEntry, WeightUnit, MoodLevel } from '../../types';
import DatabaseConnection from '../connection';
import { v4 as uuidv4 } from 'uuid';

export class WeightEntryRepository {
    private db = DatabaseConnection.getInstance();

    async create(entry: Omit<WeightEntry, 'id' | 'timestamp'>): Promise<WeightEntry> {
        const id = uuidv4();

        const query = `
      INSERT INTO weight_entries (id, user_id, weight, unit, notes, mood, confidence)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

        const values = [
            id,
            entry.userId,
            entry.weight,
            entry.unit,
            entry.notes || null,
            entry.mood || null,
            entry.confidence
        ];

        const result = await this.db.query(query, values);
        return this.mapRowToWeightEntry(result.rows[0]);
    }

    async findById(id: string): Promise<WeightEntry | null> {
        const query = 'SELECT * FROM weight_entries WHERE id = $1';
        const result = await this.db.query(query, [id]);

        if (result.rows.length === 0) {
            return null;
        }

        return this.mapRowToWeightEntry(result.rows[0]);
    }

    async findByUserId(userId: string, limit?: number, offset?: number): Promise<WeightEntry[]> {
        let query = 'SELECT * FROM weight_entries WHERE user_id = $1 ORDER BY timestamp DESC';
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
        return result.rows.map((row: any) => this.mapRowToWeightEntry(row));
    }

    async findByUserIdInDateRange(
        userId: string,
        startDate: Date,
        endDate: Date
    ): Promise<WeightEntry[]> {
        const query = `
      SELECT * FROM weight_entries 
      WHERE user_id = $1 AND timestamp >= $2 AND timestamp <= $3 
      ORDER BY timestamp ASC
    `;

        const result = await this.db.query(query, [userId, startDate, endDate]);
        return result.rows.map((row: any) => this.mapRowToWeightEntry(row));
    }

    async getLatestEntry(userId: string): Promise<WeightEntry | null> {
        const query = `
      SELECT * FROM weight_entries 
      WHERE user_id = $1 
      ORDER BY timestamp DESC 
      LIMIT 1
    `;

        const result = await this.db.query(query, [userId]);

        if (result.rows.length === 0) {
            return null;
        }

        return this.mapRowToWeightEntry(result.rows[0]);
    }

    async update(id: string, updates: Partial<WeightEntry>): Promise<WeightEntry | null> {
        const updateFields: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        if (updates.weight !== undefined) {
            updateFields.push(`weight = $${paramIndex++}`);
            values.push(updates.weight);
        }

        if (updates.unit !== undefined) {
            updateFields.push(`unit = $${paramIndex++}`);
            values.push(updates.unit);
        }

        if (updates.notes !== undefined) {
            updateFields.push(`notes = $${paramIndex++}`);
            values.push(updates.notes);
        }

        if (updates.mood !== undefined) {
            updateFields.push(`mood = $${paramIndex++}`);
            values.push(updates.mood);
        }

        if (updates.confidence !== undefined) {
            updateFields.push(`confidence = $${paramIndex++}`);
            values.push(updates.confidence);
        }

        if (updateFields.length === 0) {
            return await this.findById(id);
        }

        values.push(id);
        const query = `
      UPDATE weight_entries 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

        const result = await this.db.query(query, values);

        if (result.rows.length === 0) {
            return null;
        }

        return this.mapRowToWeightEntry(result.rows[0]);
    }

    async delete(id: string): Promise<boolean> {
        const query = 'DELETE FROM weight_entries WHERE id = $1';
        const result = await this.db.query(query, [id]);
        return result.rowCount > 0;
    }

    async softDeleteByUserId(userId: string): Promise<void> {
        const query = 'UPDATE weight_entries SET deleted_at = CURRENT_TIMESTAMP WHERE user_id = $1';
        await this.db.query(query, [userId]);
    }

    async hardDeleteByUserId(userId: string): Promise<void> {
        const query = 'DELETE FROM weight_entries WHERE user_id = $1';
        await this.db.query(query, [userId]);
    }

    async getWeightTrend(userId: string, days: number = 30): Promise<WeightEntry[]> {
        const query = `
      SELECT * FROM weight_entries 
      WHERE user_id = $1 AND timestamp >= CURRENT_DATE - INTERVAL '${days} days'
      ORDER BY timestamp ASC
    `;

        const result = await this.db.query(query, [userId]);
        return result.rows.map((row: any) => this.mapRowToWeightEntry(row));
    }

    private mapRowToWeightEntry(row: any): WeightEntry {
        return {
            id: row.id,
            userId: row.user_id,
            weight: parseFloat(row.weight),
            unit: row.unit as WeightUnit,
            timestamp: new Date(row.timestamp),
            notes: row.notes,
            mood: row.mood as MoodLevel,
            confidence: row.confidence
        };
    }
}