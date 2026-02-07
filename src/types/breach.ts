/**
 * Breach and Adherence Types
 * Based on design document specifications for eating plan breaches and recovery
 */

export interface BreachEvent {
    id: string;
    userId: string;
    eatingPlanId: string;
    timestamp: Date;
    description: string;
    severity: 'minor' | 'moderate' | 'major';
    recoveryPlan?: string;
    isRecovered: boolean;
    recoveredAt?: Date;
    notes?: string;
}

export interface AdherenceMetrics {
    userId: string;
    eatingPlanId: string;
    period: 'daily' | 'weekly' | 'monthly';
    startDate: Date;
    endDate: Date;
    totalDays: number;
    adherentDays: number;
    adherenceRate: number;
    breachCount: number;
    averageRecoveryTime: number; // in hours
}

export interface BreachRecoveryResponse {
    isRecoveryFocused: boolean;
    avoidsShame: boolean;
    includesRecoveryGuidance: boolean;
    encouragesHonestLogging: boolean;
    framesAsRecoverable: boolean;
    includesGamificationIncentive: boolean;
}

export type BreachSeverity = 'minor' | 'moderate' | 'major';