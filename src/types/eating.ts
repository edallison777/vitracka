/**
 * Eating Plan Types
 * Based on design document specifications for eating plans and logging
 */

export interface EatingPlan {
    id: string;
    userId: string;
    type: 'calorie' | 'points' | 'plate' | 'custom';
    dailyTarget: number;
    restrictions: string[];
    preferences: string[];
    isActive: boolean;
    createdAt: Date;
}

export type EatingPlanType = 'calorie' | 'points' | 'plate' | 'custom';