/**
 * Notification Controller
 * Handles HTTP requests for notification preferences and delivery
 */

import { Request, Response } from 'express';
import { ToneRelationshipManagerService } from '../services/ToneRelationshipManagerService';
import {
    NotificationPreferenceUpdate,
    NotificationDeliveryRequest,
    WeeklyReminderSettings
} from '../types/notification';

export class NotificationController {
    private toneManagerService: ToneRelationshipManagerService;

    constructor() {
        this.toneManagerService = new ToneRelationshipManagerService();
    }

    /**
     * Get notification settings for the authenticated user
     */
    async getNotificationSettings(req: Request, res: Response): Promise<void> {
        try {
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({ error: 'User not authenticated' });
                return;
            }

            const settings = await this.toneManagerService.getNotificationSettings(userId);
            res.json(settings);
        } catch (error) {
            console.error('Error getting notification settings:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    /**
     * Update notification settings for the authenticated user
     */
    async updateNotificationSettings(req: Request, res: Response): Promise<void> {
        try {
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({ error: 'User not authenticated' });
                return;
            }

            const updates: NotificationPreferenceUpdate = {
                userId,
                ...req.body
            };

            const updatedSettings = await this.toneManagerService.updateNotificationSettings(userId, updates);
            res.json(updatedSettings);
        } catch (error) {
            console.error('Error updating notification settings:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    /**
     * Get weekly reminder settings for the authenticated user
     */
    async getWeeklyReminder(req: Request, res: Response): Promise<void> {
        try {
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({ error: 'User not authenticated' });
                return;
            }

            const reminder = await this.toneManagerService.getWeeklyReminder(userId);
            res.json(reminder);
        } catch (error) {
            console.error('Error getting weekly reminder:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    /**
     * Update weekly reminder settings for the authenticated user
     */
    async updateWeeklyReminder(req: Request, res: Response): Promise<void> {
        try {
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({ error: 'User not authenticated' });
                return;
            }

            const settings: Partial<WeeklyReminderSettings> = {
                userId,
                ...req.body
            };

            const updatedReminder = await this.toneManagerService.updateWeeklyReminder(userId, settings);
            res.json(updatedReminder);
        } catch (error) {
            console.error('Error updating weekly reminder:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    /**
     * Pause notifications for the authenticated user
     */
    async pauseNotifications(req: Request, res: Response): Promise<void> {
        try {
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({ error: 'User not authenticated' });
                return;
            }

            const { pauseUntil, reason } = req.body;
            const pauseDate = pauseUntil ? new Date(pauseUntil) : undefined;

            const settings = await this.toneManagerService.pauseNotifications(userId, pauseDate, reason);
            res.json(settings);
        } catch (error) {
            console.error('Error pausing notifications:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    /**
     * Resume notifications for the authenticated user
     */
    async resumeNotifications(req: Request, res: Response): Promise<void> {
        try {
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({ error: 'User not authenticated' });
                return;
            }

            const settings = await this.toneManagerService.resumeNotifications(userId);
            res.json(settings);
        } catch (error) {
            console.error('Error resuming notifications:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    /**
     * Opt out of a specific notification type
     */
    async optOutOfNotificationType(req: Request, res: Response): Promise<void> {
        try {
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({ error: 'User not authenticated' });
                return;
            }

            const { notificationType } = req.params;

            if (!['coaching', 'reminders', 'achievements', 'progress'].includes(notificationType)) {
                res.status(400).json({ error: 'Invalid notification type' });
                return;
            }

            const settings = await this.toneManagerService.optOutOfNotificationType(
                userId,
                notificationType as any
            );
            res.json(settings);
        } catch (error) {
            if (error instanceof Error && error.message.includes('Safety notifications')) {
                res.status(400).json({ error: error.message });
                return;
            }
            console.error('Error opting out of notification type:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    /**
     * Opt back in to a specific notification type
     */
    async optInToNotificationType(req: Request, res: Response): Promise<void> {
        try {
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({ error: 'User not authenticated' });
                return;
            }

            const { notificationType } = req.params;

            if (!['coaching', 'reminders', 'achievements', 'progress'].includes(notificationType)) {
                res.status(400).json({ error: 'Invalid notification type' });
                return;
            }

            const settings = await this.toneManagerService.optInToNotificationType(
                userId,
                notificationType as any
            );
            res.json(settings);
        } catch (error) {
            console.error('Error opting in to notification type:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    /**
     * Send a test notification (for testing purposes)
     */
    async sendTestNotification(req: Request, res: Response): Promise<void> {
        try {
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({ error: 'User not authenticated' });
                return;
            }

            const { type, content, priority } = req.body;

            const request: NotificationDeliveryRequest = {
                userId,
                type: type || 'coaching',
                content: content || 'This is a test notification',
                priority: priority || 'low'
            };

            const result = await this.toneManagerService.deliverNotification(request);
            res.json(result);
        } catch (error) {
            console.error('Error sending test notification:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
}