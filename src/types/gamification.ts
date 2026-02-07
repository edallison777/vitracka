/**
 * Gamification Types
 * Based on design document specifications for safe gamification mechanics
 */

export interface Achievement {
    id: string;
    userId: string;
    type: AchievementType;
    title: string;
    description: string;
    earnedAt: Date;
    points: number;
    category: AchievementCategory;
}

export interface Reward {
    id: string;
    type: RewardType;
    title: string;
    description: string;
    points: number;
    isHealthy: boolean; // Ensures no reinforcement of unhealthy behaviors
    category: RewardCategory;
}

export interface GamificationProfile {
    userId: string;
    level: 'minimal' | 'moderate' | 'high';
    totalPoints: number;
    currentStreak: number;
    longestStreak: number;
    achievements: Achievement[];
    preferences: GamificationPreferences;
    safetyFlags: SafetyFlag[];
}

export interface GamificationPreferences {
    enableAchievements: boolean;
    enableStreaks: boolean;
    enablePoints: boolean;
    enableBadges: boolean;
    notificationLevel: 'none' | 'minimal' | 'moderate' | 'high';
}

export interface SafetyFlag {
    type: 'starvation_risk' | 'extreme_restriction' | 'unhealthy_pride';
    triggeredAt: Date;
    resolved: boolean;
    resolvedAt?: Date;
}

export type AchievementType =
    | 'consistency_logging'
    | 'honest_breach_recording'
    | 'healthy_weight_loss'
    | 'maintenance_stability'
    | 'recovery_from_breach'
    | 'nutritional_awareness'
    | 'long_term_commitment';

export type AchievementCategory =
    | 'consistency'
    | 'honesty'
    | 'health'
    | 'recovery'
    | 'learning';

export type RewardType =
    | 'consistency_reward'
    | 'honesty_reward'
    | 'recovery_incentive'
    | 'milestone_celebration'
    | 'learning_bonus';

export type RewardCategory =
    | 'daily'
    | 'weekly'
    | 'monthly'
    | 'milestone'
    | 'recovery';

export interface GamificationResponse {
    message: string;
    rewards: Reward[];
    achievements: Achievement[];
    pointsEarned: number;
    streakUpdate?: {
        current: number;
        isNewRecord: boolean;
    };
    safetyChecks: {
        isHealthyBehavior: boolean;
        flaggedConcerns: string[];
    };
    encouragement: string;
}

export interface ConsistencyMetrics {
    loggingStreak: number;
    weeklyLoggingRate: number; // 0-1 scale
    monthlyLoggingRate: number; // 0-1 scale
    honestyRate: number; // 0-1 scale (includes breach logging)
}

export interface BreachRecoveryMetrics {
    timeToRecovery: number; // hours
    recoverySuccess: boolean;
    supportEngagement: boolean;
}