/**
 * Notification Routes
 * API endpoints for notification preferences and delivery
 */

import { Router } from 'express';
import { NotificationController } from '../controllers/NotificationController';
import { AuthMiddleware } from '../middleware/AuthMiddleware';

const router = Router();
const notificationController = new NotificationController();
const authMiddleware = new AuthMiddleware();

// Apply authentication middleware to all routes
router.use(authMiddleware.authenticate.bind(authMiddleware));

// Notification settings routes
router.get('/settings', notificationController.getNotificationSettings.bind(notificationController));
router.put('/settings', notificationController.updateNotificationSettings.bind(notificationController));

// Weekly reminder routes
router.get('/weekly-reminder', notificationController.getWeeklyReminder.bind(notificationController));
router.put('/weekly-reminder', notificationController.updateWeeklyReminder.bind(notificationController));

// Pause/resume notifications
router.post('/pause', notificationController.pauseNotifications.bind(notificationController));
router.post('/resume', notificationController.resumeNotifications.bind(notificationController));

// Opt-out/opt-in routes
router.post('/opt-out/:notificationType', notificationController.optOutOfNotificationType.bind(notificationController));
router.post('/opt-in/:notificationType', notificationController.optInToNotificationType.bind(notificationController));

// Test notification (for development/testing)
router.post('/test', notificationController.sendTestNotification.bind(notificationController));

export default router;