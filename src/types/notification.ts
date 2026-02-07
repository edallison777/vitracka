/**
 * Notification and User Preference Types
 * Based on design document specifications for notification control compliance
 */

export interface NotificationSettings {
    userId: string;
    deliveryMethods: {
        push: boolean;
        email: boolean;
        sms: boolean;
    };
    timing: {
        frequency: 'daily' | 'weekly' | 'custom';
        customSchedule?: string[];
        timeZone: string;
    };
    contentTypes: {
        coaching: boolean;
        reminders: boolean;
        achievements: boolean;
        safety: boolean; // Cannot be disabled
        progress: boolean;
    };
    pauseSettings: {
        isPaused: boolean;
        pauseUntil?: Date;
        pauseReason?: string;
    };
    optOutSettings: {
        optedOutTypes: string[];
        optOutDate?: Date;
    };
    createdAt: Date;
    updatedAt: Date;
}

export interface NotificationPreferenceUpdate {
    userId: string;
    deliveryMethods?: Partial<NotificationSettings['deliveryMethods']>;
    timing?: Partial<NotificationSettings['timing']>;
    contentTypes?: Partial<NotificationSettings['contentTypes']>;
    pauseSettings?: Partial<NotificationSettings['pauseSettings']>;
    optOutSettings?: Partial<NotificationSettings['optOutSettings']>;
}

export interface WeeklyReminderSettings {
    userId: string;
    isEnabled: boolean;
    dayOfWeek: number; // 0-6, Sunday = 0
    timeOfDay: string; // HH:MM format
    toneAdjustment: {
        allowToneChange: boolean;
        allowFrequencyChange: boolean;
        allowIntensityChange: boolean;
    };
    lastSent?: Date;
    nextScheduled?: Date;
}

export interface NotificationDeliveryRequest {
    userId: string;
    type: 'coaching' | 'reminders' | 'achievements' | 'safety' | 'progress';
    content: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    scheduledFor?: Date;
    metadata?: Record<string, any>;
}

export interface NotificationDeliveryResult {
    success: boolean;
    deliveredMethods: string[];
    failedMethods: string[];
    respectsUserPreferences: boolean;
    wasBlocked: boolean;
    blockReason?: string;
}

export type NotificationType = 'coaching' | 'reminders' | 'achievements' | 'safety' | 'progress';
export type DeliveryMethod = 'push' | 'email' | 'sms';
export type NotificationFrequency = 'daily' | 'weekly' | 'custom';