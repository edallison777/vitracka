export interface UserSupportProfile {
    userId: string;
    accountId: string;
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
    };
    createdAt: Date;
    updatedAt: Date;
}

export interface WeightEntry {
    id: string;
    userId: string;
    weight: number;
    unit: 'kg' | 'lbs';
    timestamp: Date;
    notes?: string;
    mood?: 'great' | 'good' | 'okay' | 'struggling';
    confidence: number;
}