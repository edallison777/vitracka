/**
 * User Profile and Support Types
 * Based on design document specifications for user profiling and safety
 */

import { SafetyIntervention, TriggerType, EscalationLevel } from './safety';

export interface UserSupportProfile {
    userId: string; // Links to UserAccount.id
    accountId: string; // Reference to UserAccount
    goals: {
        type: 'loss' | 'maintenance' | 'transition';
        targetWeight?: number;
        timeframe?: string;
        weeklyGoal?: number;
    };
    preferences: {
        coachingStyle: 'gentle' | 'pragmatic' | 'upbeat' | 'structured';
        gamificationLevel: 'minimal' | 'moderate' | 'high';
        notificationFrequency: 'daily' | 'weekly' | 'custom';
        reminderTimes: string[];
    };
    medicalContext: {
        onGLP1Medication: boolean;
        hasClinicianGuidance: boolean;
        medicationDetails?: string;
    };
    safetyProfile: {
        riskFactors: string[];
        triggerWords: string[];
        interventionHistory: SafetyIntervention[];
    };
    createdAt: Date;
    updatedAt: Date;
}

export type CoachingStyle = 'gentle' | 'pragmatic' | 'upbeat' | 'structured';
export type GamificationLevel = 'minimal' | 'moderate' | 'high';
export type NotificationFrequency = 'daily' | 'weekly' | 'custom';
export type GoalType = 'loss' | 'maintenance' | 'transition';