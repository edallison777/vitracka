/**
 * User Support Profile Repository
 * Data access layer for user profiling and preferences
 */

import { UserSupportProfile, SafetyIntervention, CoachingStyle, GamificationLevel, NotificationFrequency, GoalType } from '../../types';
import DatabaseConnection from '../connection';

export class UserSupportProfileRepository {
    private db = DatabaseConnection.getInstance();

    async create(profile: Omit<UserSupportProfile, 'createdAt' | 'updatedAt'>): Promise<UserSupportProfile> {
        const query = `
      INSERT INTO user_support_profiles (
        user_id, account_id, goal_type, target_weight, timeframe, weekly_goal,
        coaching_style, gamification_level, notification_frequency, reminder_times,
        on_glp1_medication, has_clinician_guidance, medication_details,
        risk_factors, trigger_words
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *
    `;

        const values = [
            profile.userId,
            profile.accountId,
            profile.goals.type,
            profile.goals.targetWeight || null,
            profile.goals.timeframe || null,
            profile.goals.weeklyGoal || null,
            profile.preferences.coachingStyle,
            profile.preferences.gamificationLevel,
            profile.preferences.notificationFrequency,
            profile.preferences.reminderTimes,
            profile.medicalContext.onGLP1Medication,
            profile.medicalContext.hasClinicianGuidance,
            profile.medicalContext.medicationDetails || null,
            profile.safetyProfile.riskFactors,
            profile.safetyProfile.triggerWords
        ];

        const result = await this.db.query(query, values);
        return this.mapRowToProfile(result.rows[0]);
    }

    async findByUserId(userId: string): Promise<UserSupportProfile | null> {
        const query = 'SELECT * FROM user_support_profiles WHERE user_id = $1';
        const result = await this.db.query(query, [userId]);

        if (result.rows.length === 0) {
            return null;
        }

        return this.mapRowToProfile(result.rows[0]);
    }

    async update(userId: string, updates: Partial<UserSupportProfile>): Promise<UserSupportProfile | null> {
        const profile = await this.findByUserId(userId);
        if (!profile) {
            return null;
        }

        // Build dynamic update query based on provided fields
        const updateFields: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        if (updates.goals) {
            if (updates.goals.type !== undefined) {
                updateFields.push(`goal_type = $${paramIndex++}`);
                values.push(updates.goals.type);
            }
            if (updates.goals.targetWeight !== undefined) {
                updateFields.push(`target_weight = $${paramIndex++}`);
                values.push(updates.goals.targetWeight);
            }
            if (updates.goals.timeframe !== undefined) {
                updateFields.push(`timeframe = $${paramIndex++}`);
                values.push(updates.goals.timeframe);
            }
            if (updates.goals.weeklyGoal !== undefined) {
                updateFields.push(`weekly_goal = $${paramIndex++}`);
                values.push(updates.goals.weeklyGoal);
            }
        }

        if (updates.preferences) {
            if (updates.preferences.coachingStyle !== undefined) {
                updateFields.push(`coaching_style = $${paramIndex++}`);
                values.push(updates.preferences.coachingStyle);
            }
            if (updates.preferences.gamificationLevel !== undefined) {
                updateFields.push(`gamification_level = $${paramIndex++}`);
                values.push(updates.preferences.gamificationLevel);
            }
            if (updates.preferences.notificationFrequency !== undefined) {
                updateFields.push(`notification_frequency = $${paramIndex++}`);
                values.push(updates.preferences.notificationFrequency);
            }
            if (updates.preferences.reminderTimes !== undefined) {
                updateFields.push(`reminder_times = $${paramIndex++}`);
                values.push(updates.preferences.reminderTimes);
            }
        }

        if (updates.medicalContext) {
            if (updates.medicalContext.onGLP1Medication !== undefined) {
                updateFields.push(`on_glp1_medication = $${paramIndex++}`);
                values.push(updates.medicalContext.onGLP1Medication);
            }
            if (updates.medicalContext.hasClinicianGuidance !== undefined) {
                updateFields.push(`has_clinician_guidance = $${paramIndex++}`);
                values.push(updates.medicalContext.hasClinicianGuidance);
            }
            if (updates.medicalContext.medicationDetails !== undefined) {
                updateFields.push(`medication_details = $${paramIndex++}`);
                values.push(updates.medicalContext.medicationDetails);
            }
        }

        if (updates.safetyProfile) {
            if (updates.safetyProfile.riskFactors !== undefined) {
                updateFields.push(`risk_factors = $${paramIndex++}`);
                values.push(updates.safetyProfile.riskFactors);
            }
            if (updates.safetyProfile.triggerWords !== undefined) {
                updateFields.push(`trigger_words = $${paramIndex++}`);
                values.push(updates.safetyProfile.triggerWords);
            }
        }

        if (updateFields.length === 0) {
            return profile; // No updates to apply
        }

        values.push(userId); // Add userId for WHERE clause
        const query = `
      UPDATE user_support_profiles 
      SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $${paramIndex}
      RETURNING *
    `;

        const result = await this.db.query(query, values);
        return this.mapRowToProfile(result.rows[0]);
    }

    async delete(userId: string): Promise<boolean> {
        const query = 'DELETE FROM user_support_profiles WHERE user_id = $1';
        const result = await this.db.query(query, [userId]);
        return result.rowCount > 0;
    }

    async softDelete(userId: string): Promise<void> {
        const query = 'UPDATE user_support_profiles SET deleted_at = CURRENT_TIMESTAMP WHERE user_id = $1';
        await this.db.query(query, [userId]);
    }

    async hardDelete(userId: string): Promise<void> {
        const query = 'DELETE FROM user_support_profiles WHERE user_id = $1';
        await this.db.query(query, [userId]);
    }

    private mapRowToProfile(row: any): UserSupportProfile {
        return {
            userId: row.user_id,
            accountId: row.account_id,
            goals: {
                type: row.goal_type as GoalType,
                targetWeight: row.target_weight,
                timeframe: row.timeframe,
                weeklyGoal: row.weekly_goal
            },
            preferences: {
                coachingStyle: row.coaching_style as CoachingStyle,
                gamificationLevel: row.gamification_level as GamificationLevel,
                notificationFrequency: row.notification_frequency as NotificationFrequency,
                reminderTimes: row.reminder_times || []
            },
            medicalContext: {
                onGLP1Medication: row.on_glp1_medication,
                hasClinicianGuidance: row.has_clinician_guidance,
                medicationDetails: row.medication_details
            },
            safetyProfile: {
                riskFactors: row.risk_factors || [],
                triggerWords: row.trigger_words || [],
                interventionHistory: [] // This would be populated separately
            },
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at)
        };
    }
}