/**
 * Notification Settings Repository
 * Handles persistence of notification preferences and weekly reminder settings
 */

import DatabaseConnection from '../connection';
import {
    NotificationSettings,
    WeeklyReminderSettings
} from '../../types/notification';

export class NotificationSettingsRepository {
    private db: DatabaseConnection;

    constructor() {
        this.db = DatabaseConnection.getInstance();
    }

    /**
     * Create or update notification settings for a user
     */
    async upsertNotificationSettings(settings: NotificationSettings): Promise<NotificationSettings> {
        const query = `
            INSERT INTO notification_settings (
                user_id, delivery_methods, timing, content_types, 
                pause_settings, opt_out_settings, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            ON CONFLICT (user_id) 
            DO UPDATE SET 
                delivery_methods = $2,
                timing = $3,
                content_types = $4,
                pause_settings = $5,
                opt_out_settings = $6,
                updated_at = $8
            RETURNING *
        `;

        const values = [
            settings.userId,
            JSON.stringify(settings.deliveryMethods),
            JSON.stringify(settings.timing),
            JSON.stringify(settings.contentTypes),
            JSON.stringify(settings.pauseSettings),
            JSON.stringify(settings.optOutSettings),
            settings.createdAt,
            settings.updatedAt
        ];

        const result = await this.db.query(query, values);
        return this.mapRowToNotificationSettings(result.rows[0]);
    }

    /**
     * Get notification settings by user ID
     */
    async findByUserId(userId: string): Promise<NotificationSettings | null> {
        const query = 'SELECT * FROM notification_settings WHERE user_id = $1';
        const result = await this.db.query(query, [userId]);

        if (result.rows.length === 0) {
            return null;
        }

        return this.mapRowToNotificationSettings(result.rows[0]);
    }

    /**
     * Delete notification settings for a user
     */
    async deleteByUserId(userId: string): Promise<boolean> {
        const query = 'DELETE FROM notification_settings WHERE user_id = $1';
        const result = await this.db.query(query, [userId]);
        return result.rowCount > 0;
    }

    async softDeleteByUserId(userId: string): Promise<void> {
        const query = 'UPDATE notification_settings SET deleted_at = CURRENT_TIMESTAMP WHERE user_id = $1';
        await this.db.query(query, [userId]);
    }

    async hardDeleteByUserId(userId: string): Promise<void> {
        const query = 'DELETE FROM notification_settings WHERE user_id = $1';
        await this.db.query(query, [userId]);
    }

    /**
     * Create or update weekly reminder settings for a user
     */
    async upsertWeeklyReminder(reminder: WeeklyReminderSettings): Promise<WeeklyReminderSettings> {
        const query = `
            INSERT INTO weekly_reminder_settings (
                user_id, is_enabled, day_of_week, time_of_day, 
                tone_adjustment, last_sent, next_scheduled
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (user_id) 
            DO UPDATE SET 
                is_enabled = $2,
                day_of_week = $3,
                time_of_day = $4,
                tone_adjustment = $5,
                last_sent = $6,
                next_scheduled = $7
            RETURNING *
        `;

        const values = [
            reminder.userId,
            reminder.isEnabled,
            reminder.dayOfWeek,
            reminder.timeOfDay,
            JSON.stringify(reminder.toneAdjustment),
            reminder.lastSent || null,
            reminder.nextScheduled || null
        ];

        const result = await this.db.query(query, values);
        return this.mapRowToWeeklyReminder(result.rows[0]);
    }

    /**
     * Get weekly reminder settings by user ID
     */
    async findWeeklyReminderByUserId(userId: string): Promise<WeeklyReminderSettings | null> {
        const query = 'SELECT * FROM weekly_reminder_settings WHERE user_id = $1';
        const result = await this.db.query(query, [userId]);

        if (result.rows.length === 0) {
            return null;
        }

        return this.mapRowToWeeklyReminder(result.rows[0]);
    }

    /**
     * Get all users with weekly reminders scheduled for a specific time range
     */
    async findScheduledReminders(startTime: Date, endTime: Date): Promise<WeeklyReminderSettings[]> {
        const query = `
            SELECT * FROM weekly_reminder_settings 
            WHERE is_enabled = true 
            AND next_scheduled BETWEEN $1 AND $2
            ORDER BY next_scheduled ASC
        `;

        const result = await this.db.query(query, [startTime, endTime]);
        return result.rows.map((row: any) => this.mapRowToWeeklyReminder(row));
    }

    /**
     * Update last sent timestamp for a weekly reminder
     */
    async updateLastSent(userId: string, lastSent: Date, nextScheduled: Date): Promise<void> {
        const query = `
            UPDATE weekly_reminder_settings 
            SET last_sent = $2, next_scheduled = $3 
            WHERE user_id = $1
        `;

        await this.db.query(query, [userId, lastSent, nextScheduled]);
    }

    // Private helper methods

    private mapRowToNotificationSettings(row: any): NotificationSettings {
        return {
            userId: row.user_id,
            deliveryMethods: JSON.parse(row.delivery_methods),
            timing: JSON.parse(row.timing),
            contentTypes: JSON.parse(row.content_types),
            pauseSettings: JSON.parse(row.pause_settings),
            optOutSettings: JSON.parse(row.opt_out_settings),
            createdAt: row.created_at,
            updatedAt: row.updated_at
        };
    }

    private mapRowToWeeklyReminder(row: any): WeeklyReminderSettings {
        return {
            userId: row.user_id,
            isEnabled: row.is_enabled,
            dayOfWeek: row.day_of_week,
            timeOfDay: row.time_of_day,
            toneAdjustment: JSON.parse(row.tone_adjustment),
            lastSent: row.last_sent,
            nextScheduled: row.next_scheduled
        };
    }
}