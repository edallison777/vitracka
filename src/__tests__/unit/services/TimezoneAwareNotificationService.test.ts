/**
 * Unit Tests for Timezone-Aware Notification Service
 * Tests time zone handling for notifications and coaching
 */

import { TimezoneAwareNotificationService } from '../../../services/TimezoneAwareNotificationService';
import { InternationalizationService } from '../../../services/InternationalizationService';
import {
    LocalizedNotification,
    NotificationScheduleOptions,
    LocalizedNotificationContent
} from '../../../types/internationalization';

// Mock dependencies
jest.mock('../../../services/InternationalizationService');

describe('TimezoneAwareNotificationService', () => {
    let service: TimezoneAwareNotificationService;
    let mockInternationalizationService: jest.Mocked<InternationalizationService>;

    beforeEach(() => {
        mockInternationalizationService = new InternationalizationService() as jest.Mocked<InternationalizationService>;
        service = new TimezoneAwareNotificationService(mockInternationalizationService);
        jest.clearAllMocks();
    });

    describe('scheduleNotification', () => {
        it('should schedule notification in user timezone', async () => {
            const userId = 'user-123';
            const templateKey = 'daily_reminder';
            const scheduleOptions: NotificationScheduleOptions = {
                timezone: 'Europe/London',
                respectQuietHours: true,
                quietHoursStart: '22:00',
                quietHoursEnd: '08:00',
                language: 'en'
            };

            const scheduledTime = new Date('2024-03-15T09:00:00Z'); // 9 AM UTC
            const expectedLocalTime = new Date('2024-03-15T09:00:00+00:00'); // 9 AM London time (GMT)

            mockInternationalizationService.convertToUserTimezone.mockReturnValue(expectedLocalTime);

            const result = await service.scheduleNotification(
                userId,
                templateKey,
                scheduledTime,
                scheduleOptions
            );

            expect(result).toMatchObject({
                userId,
                templateKey,
                scheduledFor: scheduledTime,
                localScheduledFor: expectedLocalTime,
                language: 'en',
                timezone: 'Europe/London'
            });

            expect(mockInternationalizationService.convertToUserTimezone).toHaveBeenCalledWith(
                scheduledTime,
                'Europe/London'
            );
        });

        it('should respect quiet hours when scheduling', async () => {
            const userId = 'user-123';
            const templateKey = 'daily_reminder';
            const scheduleOptions: NotificationScheduleOptions = {
                timezone: 'America/New_York',
                respectQuietHours: true,
                quietHoursStart: '22:00',
                quietHoursEnd: '08:00',
                language: 'en'
            };

            // Schedule during quiet hours (11 PM local time)
            const scheduledTime = new Date('2024-03-15T23:00:00-05:00');

            const result = await service.scheduleNotification(
                userId,
                templateKey,
                scheduledTime,
                scheduleOptions
            );

            // Should be rescheduled to after quiet hours (8 AM next day)
            expect(result.localScheduledFor.getHours()).toBe(8);
            expect(result.localScheduledFor.getDate()).toBe(16); // Next day
        });

        it('should handle different time zones correctly', async () => {
            const testCases = [
                {
                    timezone: 'Asia/Tokyo',
                    utcTime: '2024-03-15T12:00:00Z',
                    expectedLocalHour: 21 // UTC+9
                },
                {
                    timezone: 'America/Los_Angeles',
                    utcTime: '2024-03-15T12:00:00Z',
                    expectedLocalHour: 5 // UTC-7 (PDT)
                },
                {
                    timezone: 'Europe/Berlin',
                    utcTime: '2024-03-15T12:00:00Z',
                    expectedLocalHour: 13 // UTC+1 (CET)
                }
            ];

            for (const testCase of testCases) {
                const scheduledTime = new Date(testCase.utcTime);
                const expectedLocalTime = new Date(scheduledTime);
                expectedLocalTime.setHours(testCase.expectedLocalHour);

                mockInternationalizationService.convertToUserTimezone.mockReturnValue(expectedLocalTime);

                const result = await service.scheduleNotification(
                    'user-123',
                    'daily_reminder',
                    scheduledTime,
                    {
                        timezone: testCase.timezone,
                        respectQuietHours: false,
                        language: 'en'
                    }
                );

                expect(result.localScheduledFor.getHours()).toBe(testCase.expectedLocalHour);
            }
        });
    });

    describe('generateLocalizedContent', () => {
        it('should generate content in user language with cultural context', async () => {
            const templateKey = 'weight_progress_celebration';
            const language = 'es';
            const coachingStyle = 'upbeat';
            const culturalContext = 'ES';

            const expectedContent: LocalizedNotificationContent = {
                title: '¡Excelente progreso!',
                body: '¡Has logrado un gran avance en tu objetivo de peso! Sigue así.',
                actionText: 'Ver Progreso',
                coachingStyle: 'upbeat'
            };

            jest.spyOn(service, 'generateLocalizedContent').mockResolvedValue(expectedContent);

            const result = await service.generateLocalizedContent(
                templateKey,
                language,
                coachingStyle,
                culturalContext
            );

            expect(result).toEqual(expectedContent);
            expect(result.title).toContain('¡');
            expect(result.body).toContain('objetivo de peso');
        });

        it('should adapt coaching style for different cultures', async () => {
            const templateKey = 'daily_encouragement';
            const testCases = [
                {
                    language: 'en',
                    culture: 'US',
                    style: 'upbeat',
                    expectedTone: 'enthusiastic'
                },
                {
                    language: 'de',
                    culture: 'DE',
                    style: 'structured',
                    expectedTone: 'systematic'
                },
                {
                    language: 'fr',
                    culture: 'FR',
                    style: 'gentle',
                    expectedTone: 'elegant'
                }
            ];

            for (const testCase of testCases) {
                const content = await service.generateLocalizedContent(
                    templateKey,
                    testCase.language,
                    testCase.style,
                    testCase.culture
                );

                expect(content.coachingStyle).toBe(testCase.style);
                // Verify cultural adaptation occurred
                expect(typeof content.title).toBe('string');
                expect(content.title.length).toBeGreaterThan(0);
            }
        });
    });

    describe('isWithinQuietHours', () => {
        it('should correctly identify quiet hours in different time zones', () => {
            const testCases = [
                {
                    timezone: 'Europe/London',
                    currentTime: '2024-03-15T23:30:00Z', // 11:30 PM UTC = 11:30 PM GMT
                    quietStart: '22:00',
                    quietEnd: '08:00',
                    expected: true
                },
                {
                    timezone: 'America/New_York',
                    currentTime: '2024-03-15T07:00:00Z', // 7:00 AM UTC = 3:00 AM EDT
                    quietStart: '22:00',
                    quietEnd: '08:00',
                    expected: true
                },
                {
                    timezone: 'Asia/Tokyo',
                    currentTime: '2024-03-15T12:00:00Z', // 12:00 PM UTC = 9:00 PM JST
                    quietStart: '22:00',
                    quietEnd: '08:00',
                    expected: false
                }
            ];

            testCases.forEach(testCase => {
                const result = service.isWithinQuietHours(
                    new Date(testCase.currentTime),
                    testCase.timezone,
                    testCase.quietStart,
                    testCase.quietEnd
                );

                expect(result).toBe(testCase.expected);
            });
        });

        it('should handle quiet hours spanning midnight', () => {
            const timezone = 'Europe/London';
            const quietStart = '22:00';
            const quietEnd = '08:00';

            // Test times during quiet hours
            const quietTimes = [
                '2024-03-15T22:30:00Z', // 10:30 PM
                '2024-03-15T01:00:00Z', // 1:00 AM
                '2024-03-15T07:30:00Z'  // 7:30 AM
            ];

            quietTimes.forEach(time => {
                const result = service.isWithinQuietHours(
                    new Date(time),
                    timezone,
                    quietStart,
                    quietEnd
                );
                expect(result).toBe(true);
            });

            // Test times outside quiet hours
            const activeTimes = [
                '2024-03-15T10:00:00Z', // 10:00 AM
                '2024-03-15T15:00:00Z', // 3:00 PM
                '2024-03-15T20:00:00Z'  // 8:00 PM
            ];

            activeTimes.forEach(time => {
                const result = service.isWithinQuietHours(
                    new Date(time),
                    timezone,
                    quietStart,
                    quietEnd
                );
                expect(result).toBe(false);
            });
        });
    });

    describe('calculateOptimalNotificationTime', () => {
        it('should find optimal time outside quiet hours', () => {
            const userTimezone = 'Europe/London';
            const preferredTime = new Date('2024-03-15T23:00:00Z'); // 11 PM UTC (in quiet hours)
            const quietHoursStart = '22:00';
            const quietHoursEnd = '08:00';

            const result = service.calculateOptimalNotificationTime(
                preferredTime,
                userTimezone,
                quietHoursStart,
                quietHoursEnd
            );

            // Should be moved to 8:00 AM the next day
            expect(result.getHours()).toBe(8);
            expect(result.getDate()).toBe(16); // Next day
        });

        it('should preserve time if not in quiet hours', () => {
            const userTimezone = 'Europe/London';
            const preferredTime = new Date('2024-03-15T14:00:00Z'); // 2 PM UTC (not in quiet hours)
            const quietHoursStart = '22:00';
            const quietHoursEnd = '08:00';

            const result = service.calculateOptimalNotificationTime(
                preferredTime,
                userTimezone,
                quietHoursStart,
                quietHoursEnd
            );

            expect(result).toEqual(preferredTime);
        });
    });

    describe('batchScheduleNotifications', () => {
        it('should schedule multiple notifications efficiently', async () => {
            const notifications = [
                {
                    userId: 'user-1',
                    templateKey: 'daily_reminder',
                    scheduledTime: new Date('2024-03-15T09:00:00Z'),
                    options: {
                        timezone: 'Europe/London',
                        respectQuietHours: true,
                        quietHoursStart: '22:00',
                        quietHoursEnd: '08:00',
                        language: 'en'
                    }
                },
                {
                    userId: 'user-2',
                    templateKey: 'weekly_progress',
                    scheduledTime: new Date('2024-03-15T10:00:00Z'),
                    options: {
                        timezone: 'America/New_York',
                        respectQuietHours: true,
                        quietHoursStart: '22:00',
                        quietHoursEnd: '08:00',
                        language: 'es'
                    }
                }
            ];

            const results = await service.batchScheduleNotifications(notifications);

            expect(results).toHaveLength(2);
            expect(results[0].userId).toBe('user-1');
            expect(results[1].userId).toBe('user-2');
            expect(results[0].language).toBe('en');
            expect(results[1].language).toBe('es');
        });
    });

    describe('daylight saving time handling', () => {
        it('should handle DST transitions correctly', () => {
            // Test spring forward (DST begins)
            const springForward = new Date('2024-03-31T01:00:00Z'); // 1 AM UTC on DST transition day
            const timezone = 'Europe/London';

            const result = service.convertToUserTimezone(springForward, timezone);

            // Should handle the DST transition properly
            expect(result).toBeInstanceOf(Date);
            expect(result.getTime()).not.toBe(springForward.getTime());
        });

        it('should handle fall back (DST ends) correctly', () => {
            // Test fall back (DST ends)
            const fallBack = new Date('2024-10-27T01:00:00Z'); // 1 AM UTC on DST transition day
            const timezone = 'Europe/London';

            const result = service.convertToUserTimezone(fallBack, timezone);

            // Should handle the DST transition properly
            expect(result).toBeInstanceOf(Date);
            expect(result.getTime()).not.toBe(fallBack.getTime());
        });
    });

    describe('regional compliance for notifications', () => {
        it('should respect GDPR requirements for EU users', async () => {
            const userId = 'eu-user-123';
            const templateKey = 'marketing_notification';
            const scheduleOptions: NotificationScheduleOptions = {
                timezone: 'Europe/Berlin',
                respectQuietHours: true,
                quietHoursStart: '22:00',
                quietHoursEnd: '08:00',
                language: 'de'
            };

            // Mock GDPR compliance check
            jest.spyOn(service, 'checkNotificationCompliance').mockResolvedValue({
                isCompliant: true,
                requiresConsent: true,
                consentGiven: true,
                complianceRequirements: ['GDPR']
            });

            const result = await service.scheduleNotification(
                userId,
                templateKey,
                new Date(),
                scheduleOptions
            );

            expect(service.checkNotificationCompliance).toHaveBeenCalledWith(
                userId,
                templateKey,
                'DE'
            );
            expect(result.metadata.complianceNotes).toContain('GDPR');
        });

        it('should handle different regional requirements', async () => {
            const testCases = [
                {
                    region: 'US',
                    expectedCompliance: ['CCPA'],
                    requiresConsent: false
                },
                {
                    region: 'CA',
                    expectedCompliance: ['PIPEDA'],
                    requiresConsent: true
                },
                {
                    region: 'AU',
                    expectedCompliance: ['Privacy_Act'],
                    requiresConsent: true
                }
            ];

            for (const testCase of testCases) {
                jest.spyOn(service, 'checkNotificationCompliance').mockResolvedValue({
                    isCompliant: true,
                    requiresConsent: testCase.requiresConsent,
                    consentGiven: true,
                    complianceRequirements: testCase.expectedCompliance
                });

                const result = await service.scheduleNotification(
                    `${testCase.region.toLowerCase()}-user-123`,
                    'daily_reminder',
                    new Date(),
                    {
                        timezone: 'UTC',
                        respectQuietHours: false,
                        language: 'en'
                    }
                );

                expect(result.metadata.complianceNotes).toContain(testCase.expectedCompliance[0]);
            }
        });
    });
});