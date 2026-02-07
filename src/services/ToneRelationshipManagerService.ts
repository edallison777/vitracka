/**
 * Tone & Relationship Manager Service
 * Manages notification preferences, delivery, and weekly reminder system
 * Validates: Requirements 10.1, 10.2, 10.3, 10.4, 10.5
 */

import {
    NotificationSettings,
    NotificationPreferenceUpdate,
    NotificationDeliveryRequest,
    NotificationDeliveryResult,
    WeeklyReminderSettings,
    NotificationType,
    DeliveryMethod
} from '../types/notification';
import { UserSupportProfile } from '../types/user';
import { NotificationSettingsRepository } from '../database/repositories/NotificationSettingsRepository';

export class ToneRelationshipManagerService {
    private notificationRepository: NotificationSettingsRepository;

    constructor() {
        this.notificationRepository = new NotificationSettingsRepository();
    }

    /**
     * Update notification settings for a user
     * Requirement 10.2: Allow adjustment of frequency, timing, and content types
     */
    async updateNotificationSettings(
        userId: string,
        updates: NotificationPreferenceUpdate
    ): Promise<NotificationSettings> {
        const existingSettings = await this.notificationRepository.findByUserId(userId) ||
            this.getDefaultSettings(userId);

        const updatedSettings: NotificationSettings = {
            ...existingSettings,
            ...updates,
            deliveryMethods: {
                ...existingSettings.deliveryMethods,
                ...updates.deliveryMethods
            },
            timing: {
                ...existingSettings.timing,
                ...updates.timing
            },
            contentTypes: {
                ...existingSettings.contentTypes,
                ...updates.contentTypes,
                // Safety notifications cannot be disabled
                safety: true
            },
            pauseSettings: {
                ...existingSettings.pauseSettings,
                ...updates.pauseSettings
            },
            optOutSettings: {
                ...existingSettings.optOutSettings,
                ...updates.optOutSettings
            },
            updatedAt: new Date()
        };

        return await this.notificationRepository.upsertNotificationSettings(updatedSettings);
    }

    /**
     * Get notification settings for a user
     */
    async getNotificationSettings(userId: string): Promise<NotificationSettings> {
        return await this.notificationRepository.findByUserId(userId) ||
            this.getDefaultSettings(userId);
    }

    /**
     * Deliver notification respecting user preferences
     * Requirements 10.3, 10.4: Respect delivery methods and opt-out options
     */
    async deliverNotification(
        request: NotificationDeliveryRequest,
        settings?: NotificationSettings
    ): Promise<NotificationDeliveryResult> {
        const userSettings = settings || await this.getNotificationSettings(request.userId);

        const deliveredMethods: string[] = [];
        const failedMethods: string[] = [];
        let wasBlocked = false;
        let blockReason: string | undefined;

        // Safety notifications cannot be blocked by any user preferences
        if (request.type === 'safety') {
            // Safety notifications always go through, respect only delivery methods
            const enabledMethods: DeliveryMethod[] = [];
            if (userSettings.deliveryMethods.push) enabledMethods.push('push');
            if (userSettings.deliveryMethods.email) enabledMethods.push('email');
            if (userSettings.deliveryMethods.sms) enabledMethods.push('sms');

            // Simulate delivery to enabled methods
            for (const method of enabledMethods) {
                try {
                    await this.sendNotification(method, request);
                    deliveredMethods.push(method);
                } catch (error) {
                    failedMethods.push(method);
                }
            }

            return {
                success: deliveredMethods.length > 0,
                deliveredMethods,
                failedMethods,
                respectsUserPreferences: true,
                wasBlocked: false,
                blockReason: undefined
            };
        }

        // For non-safety notifications, check user preferences

        // Check if notification type is opted out (Requirement 10.5)
        if (userSettings.optOutSettings.optedOutTypes.includes(request.type)) {
            wasBlocked = true;
            blockReason = 'User opted out of this notification type';
        }

        // Check if notifications are paused (Requirement 10.4)
        if (userSettings.pauseSettings.isPaused) {
            // Check if pause period has expired
            if (userSettings.pauseSettings.pauseUntil &&
                new Date() > userSettings.pauseSettings.pauseUntil) {
                // Auto-resume notifications
                await this.updateNotificationSettings(request.userId, {
                    userId: request.userId,
                    pauseSettings: { isPaused: false, pauseUntil: undefined }
                });
            } else {
                wasBlocked = true;
                blockReason = 'Notifications are paused';
            }
        }

        // Check content type preferences
        if (!userSettings.contentTypes[request.type as keyof typeof userSettings.contentTypes]) {
            wasBlocked = true;
            blockReason = 'Content type disabled by user';
        }

        if (!wasBlocked) {
            // Respect delivery method preferences (Requirement 10.3)
            const enabledMethods: DeliveryMethod[] = [];
            if (userSettings.deliveryMethods.push) enabledMethods.push('push');
            if (userSettings.deliveryMethods.email) enabledMethods.push('email');
            if (userSettings.deliveryMethods.sms) enabledMethods.push('sms');

            // Simulate delivery to enabled methods
            for (const method of enabledMethods) {
                try {
                    await this.sendNotification(method, request);
                    deliveredMethods.push(method);
                } catch (error) {
                    failedMethods.push(method);
                }
            }
        }

        return {
            success: !wasBlocked && deliveredMethods.length > 0,
            deliveredMethods,
            failedMethods,
            respectsUserPreferences: true,
            wasBlocked,
            blockReason
        };
    }

    /**
     * Set up weekly reminder system with preference adjustments
     * Requirement 10.1: Weekly reminder system with tone/frequency adjustments
     */
    async updateWeeklyReminder(
        userId: string,
        settings: Partial<WeeklyReminderSettings>
    ): Promise<WeeklyReminderSettings> {
        const existingReminder = await this.notificationRepository.findWeeklyReminderByUserId(userId) ||
            this.getDefaultWeeklyReminder(userId);

        const updatedReminder: WeeklyReminderSettings = {
            ...existingReminder,
            ...settings,
            toneAdjustment: {
                ...existingReminder.toneAdjustment,
                ...settings.toneAdjustment
            }
        };

        // Calculate next scheduled reminder
        if (updatedReminder.isEnabled) {
            updatedReminder.nextScheduled = this.calculateNextReminderDate(
                updatedReminder.dayOfWeek,
                updatedReminder.timeOfDay
            );
        }

        return await this.notificationRepository.upsertWeeklyReminder(updatedReminder);
    }

    /**
     * Get weekly reminder settings for a user
     */
    async getWeeklyReminder(userId: string): Promise<WeeklyReminderSettings> {
        return await this.notificationRepository.findWeeklyReminderByUserId(userId) ||
            this.getDefaultWeeklyReminder(userId);
    }

    /**
     * Pause notifications temporarily
     * Requirement 10.4: Allow users to temporarily pause notifications
     */
    async pauseNotifications(
        userId: string,
        pauseUntil?: Date,
        reason?: string
    ): Promise<NotificationSettings> {
        return this.updateNotificationSettings(userId, {
            userId,
            pauseSettings: {
                isPaused: true,
                pauseUntil,
                pauseReason: reason
            }
        });
    }

    /**
     * Resume notifications
     * Requirement 10.4: Allow users to resume notifications
     */
    async resumeNotifications(userId: string): Promise<NotificationSettings> {
        return this.updateNotificationSettings(userId, {
            userId,
            pauseSettings: {
                isPaused: false,
                pauseUntil: undefined,
                pauseReason: undefined
            }
        });
    }

    /**
     * Opt out of specific notification types
     * Requirement 10.5: Provide opt-out options for non-critical notifications
     */
    async optOutOfNotificationType(
        userId: string,
        notificationType: NotificationType
    ): Promise<NotificationSettings> {
        // Safety notifications cannot be opted out
        if (notificationType === 'safety') {
            throw new Error('Safety notifications cannot be disabled');
        }

        const settings = await this.getNotificationSettings(userId);
        const updatedOptOuts = [...settings.optOutSettings.optedOutTypes];

        if (!updatedOptOuts.includes(notificationType)) {
            updatedOptOuts.push(notificationType);
        }

        return this.updateNotificationSettings(userId, {
            userId,
            optOutSettings: {
                optedOutTypes: updatedOptOuts,
                optOutDate: new Date()
            }
        });
    }

    /**
     * Opt back in to specific notification types
     */
    async optInToNotificationType(
        userId: string,
        notificationType: NotificationType
    ): Promise<NotificationSettings> {
        const settings = await this.getNotificationSettings(userId);
        const updatedOptOuts = settings.optOutSettings.optedOutTypes.filter(
            type => type !== notificationType
        );

        return this.updateNotificationSettings(userId, {
            userId,
            optOutSettings: {
                optedOutTypes: updatedOptOuts
            }
        });
    }

    /**
     * Adapt notification tone based on user profile and preferences
     * Integrates with coaching style from User Support Profile
     */
    async adaptNotificationTone(
        userId: string,
        baseMessage: string,
        userProfile: UserSupportProfile
    ): Promise<string> {
        const reminderSettings = await this.getWeeklyReminder(userId);

        if (!reminderSettings.toneAdjustment.allowToneChange) {
            return baseMessage;
        }

        const coachingStyle = userProfile.preferences.coachingStyle;

        switch (coachingStyle) {
            case 'gentle':
                return this.applyGentleTone(baseMessage);
            case 'pragmatic':
                return this.applyPragmaticTone(baseMessage);
            case 'upbeat':
                return this.applyUpbeatTone(baseMessage);
            case 'structured':
                return this.applyStructuredTone(baseMessage);
            default:
                return baseMessage;
        }
    }

    // Private helper methods

    private getDefaultSettings(userId: string): NotificationSettings {
        return {
            userId,
            deliveryMethods: { push: true, email: true, sms: false },
            timing: { frequency: 'weekly', timeZone: 'UTC' },
            contentTypes: {
                coaching: true,
                reminders: true,
                achievements: true,
                safety: true, // Cannot be disabled
                progress: true
            },
            pauseSettings: { isPaused: false },
            optOutSettings: { optedOutTypes: [] },
            createdAt: new Date(),
            updatedAt: new Date()
        };
    }

    private getDefaultWeeklyReminder(userId: string): WeeklyReminderSettings {
        return {
            userId,
            isEnabled: true,
            dayOfWeek: 0, // Sunday
            timeOfDay: '09:00',
            toneAdjustment: {
                allowToneChange: true,
                allowFrequencyChange: true,
                allowIntensityChange: true
            }
        };
    }

    private calculateNextReminderDate(dayOfWeek: number, timeOfDay: string): Date {
        const now = new Date();
        const [hours, minutes] = timeOfDay.split(':').map(Number);

        const nextReminder = new Date();
        nextReminder.setDate(now.getDate() + ((dayOfWeek + 7 - now.getDay()) % 7));
        nextReminder.setHours(hours, minutes, 0, 0);

        // If the calculated time is in the past, add a week
        if (nextReminder <= now) {
            nextReminder.setDate(nextReminder.getDate() + 7);
        }

        return nextReminder;
    }

    private async sendNotification(method: DeliveryMethod, request: NotificationDeliveryRequest): Promise<void> {
        // Mock implementation - in real system would integrate with push notification services,
        // email providers, SMS services, etc.
        console.log(`Sending ${method} notification to ${request.userId}: ${request.content}`);

        // Simulate potential delivery failures
        if (Math.random() < 0.05) { // 5% failure rate for testing
            throw new Error(`Failed to deliver via ${method}`);
        }
    }

    private applyGentleTone(message: string): string {
        // Apply gentle, supportive tone modifications
        return message
            .replace(/you should/gi, 'you might consider')
            .replace(/must/gi, 'could')
            .replace(/need to/gi, 'might want to');
    }

    private applyPragmaticTone(message: string): string {
        // Apply practical, straightforward tone
        return `Here's what works: ${message}`;
    }

    private applyUpbeatTone(message: string): string {
        // Apply enthusiastic, motivational tone
        return `Great news! ${message} You've got this! 🌟`;
    }

    private applyStructuredTone(message: string): string {
        // Apply organized, systematic tone
        return `Step-by-step guidance: ${message}`;
    }
}