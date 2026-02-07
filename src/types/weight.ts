/**
 * Weight Tracking Types
 * Based on design document specifications for weight entry and tracking
 */

export interface WeightEntry {
    id: string;
    userId: string;
    weight: number;
    unit: 'kg' | 'lbs';
    timestamp: Date;
    notes?: string;
    mood?: 'great' | 'good' | 'okay' | 'struggling';
    confidence: number; // 1-5 scale
}

export type WeightUnit = 'kg' | 'lbs';
export type MoodLevel = 'great' | 'good' | 'okay' | 'struggling';