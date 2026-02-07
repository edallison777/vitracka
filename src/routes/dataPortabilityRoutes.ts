/**
 * Data Portability Routes
 * API endpoints for GDPR compliance - data export, deletion, and privacy settings
 */

import { Router } from 'express';
import { DataPortabilityController } from '../controllers/DataPortabilityController';
import { authMiddleware } from '../middleware/AuthMiddleware';
import { rateLimitMiddleware } from '../middleware/RateLimitMiddleware';

const router = Router();
const dataPortabilityController = new DataPortabilityController();

// Rate limiting for sensitive operations
const strictRateLimit = rateLimitMiddleware({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each IP to 5 requests per windowMs
    message: 'Too many privacy requests from this IP, please try again later.'
});

const moderateRateLimit = rateLimitMiddleware({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // limit each IP to 20 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
});

/**
 * @route POST /api/data-portability/export
 * @desc Request user data export
 * @access Private
 * @body {
 *   format?: 'json' | 'csv' | 'xml',
 *   includeDeleted?: boolean,
 *   dataTypes?: DataType[]
 * }
 */
router.post('/export',
    strictRateLimit,
    authMiddleware,
    dataPortabilityController.requestDataExport.bind(dataPortabilityController)
);

/**
 * @route POST /api/data-portability/delete
 * @desc Request user data deletion
 * @access Private
 * @body {
 *   deletionType: 'soft' | 'hard',
 *   retainAuditLogs?: boolean,
 *   verificationToken?: string
 * }
 */
router.post('/delete',
    strictRateLimit,
    authMiddleware,
    dataPortabilityController.requestDataDeletion.bind(dataPortabilityController)
);

/**
 * @route GET /api/data-portability/privacy-settings
 * @desc Get user's privacy settings
 * @access Private
 */
router.get('/privacy-settings',
    moderateRateLimit,
    authMiddleware,
    dataPortabilityController.getPrivacySettings.bind(dataPortabilityController)
);

/**
 * @route PUT /api/data-portability/privacy-settings
 * @desc Update user's privacy settings
 * @access Private
 * @body {
 *   dataRetentionPeriod?: number,
 *   allowAnalytics?: boolean,
 *   allowMarketing?: boolean,
 *   allowThirdPartySharing?: boolean,
 *   anonymizeData?: boolean
 * }
 */
router.put('/privacy-settings',
    moderateRateLimit,
    authMiddleware,
    dataPortabilityController.updatePrivacySettings.bind(dataPortabilityController)
);

/**
 * @route POST /api/data-portability/consent
 * @desc Record user consent for data processing
 * @access Private
 * @body {
 *   consentType: 'data_processing' | 'marketing' | 'analytics' | 'third_party_sharing',
 *   granted: boolean,
 *   version: string
 * }
 */
router.post('/consent',
    moderateRateLimit,
    authMiddleware,
    dataPortabilityController.recordConsent.bind(dataPortabilityController)
);

/**
 * @route GET /api/data-portability/gdpr-info
 * @desc Get GDPR compliance information
 * @access Public
 */
router.get('/gdpr-info',
    moderateRateLimit,
    dataPortabilityController.getGDPRInfo.bind(dataPortabilityController)
);

export default router;