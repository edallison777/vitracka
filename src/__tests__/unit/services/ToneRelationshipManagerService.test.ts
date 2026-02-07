/**
 * Unit Tests for Tone & Relationship Manager Service
 * Tests notification preferences, delivery, and weekly reminder functionality
 * Validates: Requirements 10.1, 10.2, 10.3, 10.4, 10.5
 */

import { ToneRelationshipManagerService } from '../../../services/ToneRelationshipManagerService';
import { NotificationSettingsRepository } from '../../../database/repositories/NotificationSettingsRepository';
import {
    NotificationSettings,
    NotificationDeliveryRequest,
    WeeklyReminderSettings
} from '../../../types/notification';
import { UserSupportProfile } from '../../../types/user';

// Mock the repository
jest.mock('../../../database/repositories/NotificationSettingsRepository');

describe('ToneRelationshipManagerService', () => {
    let service: ToneRelationshipManagerService;
    let mockRepository: jest.Mocked<NotificationSettingsRepository>;

    beforeEach(() => {
        service = new ToneRelationshipManagerService();
        mockRepository = new NotificationSettingsRepository() as jest.Mocked<NotificationSettingsRepository>;
        (service as any).notificationRepository = mockRepository;
    });

    describe('updateNotificationSettings', () => {
        it('should update notification settings and preserve safety notifications', async () => {
            const userId = 'test-user-id';
            const existingSettings: NotificationSettings = {
                userId,
                deliveryMethods: { push: true, email: true, sms: false },
                timing: { frequency: 'daily', timeZone: 'UTC' },
                contentTypes: { coaching: true, reminders: true, achievements: true, safety: true, progress: true },
                pauseSettings: { isPaused: false },
                optOutSettings: { optedOutTypes: [] },
                createdAt: new Date(),
                updatedAt: new Date()
            };

            mockRepository.findByUserId.mockResolvedValue(existingSettings);
            mockRepository.upsertNotificationSettings.mockResolvedValue({
                ...existingSettings,
                contentTypes: { ...existingSettings.contentTypes, coaching: false, safety: true },
                updatedAt: new Date()
            });

            const result = await service.updateNotificationSettings(userId, {
                userId,
                contentTypes: { coaching: false, safety: false } // Try to disable safety
            });

            expect(result.contentTypes.safety).toBe(true); // Safety should remain enabled
            expect(result.contentTypes.coaching).toBe(false);
            expect(mockRepository.upsertNotificationSettings).toHaveBeenCalled();
        });
    });

    describe('deliverNotification', () => {
        it('should respect opt-out preferences for non-safety notifications', async () => {
            const userId = 'test-user-id';
            const settings: NotificationSettings = {
                userId,
                deliveryMethods: { push: true, email: true, sms: false },
                timing: { frequency: 'daily', timeZone: 'UTC' },
                contentTypes: { coaching: true, reminders: true, achievements: true, safety: true, progress: true },
                pauseSettings: { isPaused: false },
                optOutSettings: { optedOutTypes: ['coaching'] },
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const request: NotificationDeliveryRequest = {
                userId,
                type: 'coaching',
                content: 'Test coaching message',
                priority: 'low'
            };

            const result = await service.deliverNotification(request, settings);

            expect(result.wasBlocked).toBe(true);
            expect(result.blockReason).toContain('opted out');
            expect(result.deliveredMethods).toHaveLength(0);
        });

        it('should never block safety notifications', async () => {
            const userId = 'test-user-id';
            const settings: NotificationSettings = {
                userId,
                deliveryMethods: { push: true, email: false, sms: false },
                timing: { frequency: 'daily', timeZone: 'UTC' },
                contentTypes: { coaching: false, reminders: false, achievements: false, safety: true, progress: false },
                pauseSettings: { isPaused: true }, // Paused
                optOutSettings: { optedOutTypes: ['safety'] }, // Attempted opt-out
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const request: NotificationDeliveryRequest = {
                userId,
                type: 'safety',
                content: 'Safety intervention message',
                priority: 'critical'
            };

            const result = await service.deliverNotification(request, settings);

            expect(result.wasBlocked).toBe(false);
            expect(result.deliveredMethods).toContain('push');
            expect(result.respectsUserPreferences).toBe(true);
        });

        it('should respect pause settings for non-safety notifications', async () => {
            const userId = 'test-user-id';
            const settings: NotificationSettings = {
                userId,
                deliveryMethods: { push: true, email: true, sms: false },
                timing: { frequency: 'daily', timeZone: 'UTC' },
                contentTypes: { coaching: true, reminders: true, achievements: true, safety: true, progress: true },
                pauseSettings: { isPaused: true },
                optOutSettings: { optedOutTypes: [] },
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const request: NotificationDeliveryRequest = {
                userId,
                type: 'reminders',
                content: 'Test reminder',
                priority: 'medium'
            };

            const result = await service.deliverNotification(request, settings);

            expect(result.wasBlocked).toBe(true);
            expect(result.blockReason).toContain('paused');
        });
    });

    describe('optOutOfNotificationType', () => {
        it('should prevent opting out of safety notifications', async () => {
            const userId = 'test-user-id';

            await expect(
                service.optOutOfNotificationType(userId, 'safety')
            ).rejects.toThrow('Safety notifications cannot be disabled');
        });

        it('should allow opting out of non-safety notifications', async () => {
            const userId = 'test-user-id';
            const existingSettings: NotificationSettings = {
                userId,
                deliveryMethods: { push: true, email: true, sms: false },
                timing: { frequency: 'daily', timeZone: 'UTC' },
                contentTypes: { coaching: true, reminders: true, achievements: true, safety: true, progress: true },
                pauseSettings: { isPaused: false },
                optOutSettings: { optedOutTypes: [] },
                createdAt: new Date(),
                updatedAt: new Date()
            };

            mockRepository.findByUserId.mockResolvedValue(existingSettings);
            mockRepository.upsertNotificationSettings.mockResolvedValue({
                ...existingSettings,
                optOutSettings: { optedOutTypes: ['coaching'], optOutDate: new Date() }
            });

            const result = await service.optOutOfNotificationType(userId, 'coaching');

            expect(result.optOutSettings.optedOutTypes).toContain('coaching');
            expect(mockRepository.upsertNotificationSettings).toHaveBeenCalled();
        });
    });

    describe('updateWeeklyReminder', () => {
        it('should update weekly reminder settings and calculate next scheduled time', async () => {
            const userId = 'test-user-id';
            const existingReminder: WeeklyReminderSettings = {
                userId,
                isEnabled: true,
                dayOfWeek: 0,
                timeOfDay: '09:00',
                toneAdjustment: {
                    allowToneChange: true,
                    allowFrequencyChange: true,
                    allowIntensityChange: true
                }
            };

            mockRepository.findWeeklyReminderByUserId.mockResolvedValue(existingReminder);
            mockRepository.upsertWeeklyReminder.mockResolvedValue({
                ...existingReminder,
                dayOfWeek: 1, // Monday
                timeOfDay: '10:00',
                nextScheduled: new Date()
            });

            const result = await service.updateWeeklyReminder(userId, {
                dayOfWeek: 1,
                timeOfDay: '10:00'
            });

            expect(result.dayOfWeek).toBe(1);
            expect(result.timeOfDay).toBe('10:00');
            expect(result.nextScheduled).toBeDefined();
            expect(mockRepository.upsertWeeklyReminder).toHaveBeenCalled();
        });
    });

    describe('adaptNotificationTone', () => {
        it('should adapt message tone based on user coaching style', async () => {
            const userId = 'test-user-id';
            const baseMessage = 'You should log your weight today';

            const userProfile: UserSupportProfile = {
                userId,
                accountId: userId,
                goals: { type: 'loss', weeklyGoal: 1 },
                preferences: {
                    coachingStyle: 'gentle',
                    gamificationLevel: 'moderate',
                    notificationFrequency: 'weekly',
                    reminderTimes: ['09:00']
                },
                medicalContext: {
                    onGLP1Medication: false,
                    hasClinicianGuidance: false
                },
                safetyProfile: {
                    riskFactors: [],
                    triggerWords: [],
                    interventionHistory: []
                },
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const reminderSettings: WeeklyReminderSettings = {
                userId,
                isEnabled: true,
                dayOfWeek: 0,
                timeOfDay: '09:00',
                toneAdjustment: {
                    allowToneChange: true,
                    allowFrequencyChange: true,
                    allowIntensityChange: true
                }
            };

            mockRepository.findWeeklyReminderByUserId.mockResolvedValue(reminderSettings);

            const result = await service.adaptNotificationTone(userId, baseMessage, userProfile);

            expect(result).toContain('might consider');
            expect(result).not.toContain('should');
        });

        it('should not adapt tone when tone adjustment is disabled', async () => {
            const userId = 'test-user-id';
            const baseMessage = 'You should log your weight today';

            const userProfile: UserSupportProfile = {
                userId,
                accountId: userId,
                goals: { type: 'loss', weeklyGoal: 1 },
                preferences: {
                    coachingStyle: 'gentle',
                    gamificationLevel: 'moderate',
                    notificationFrequency: 'weekly',
                    reminderTimes: ['09:00']
                },
                medicalContext: {
                    onGLP1Medication: false,
                    hasClinicianGuidance: false
                },
                safetyProfile: {
                    riskFactors: [],
                    triggerWords: [],
                    interventionHistory: []
                },
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const reminderSettings: WeeklyReminderSettings = {
                userId,
                isEnabled: true,
                dayOfWeek: 0,
                timeOfDay: '09:00',
                toneAdjustment: {
                    allowToneChange: false, // Disabled
                    allowFrequencyChange: true,
                    allowIntensityChange: true
                }
            };

            mockRepository.findWeeklyReminderByUserId.mockResolvedValue(reminderSettings);

            const result = await service.adaptNotificationTone(userId, baseMessage, userProfile);

            expect(result).toBe(baseMessage); // Should remain unchanged
        });
    });
});