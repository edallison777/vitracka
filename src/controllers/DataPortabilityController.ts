/**
 * Data Portability Controller
 * Handles HTTP requests for user data export and deletion (GDPR compliance)
 */

import { Request, Response } from 'express';
import { DataPortabilityService } from '../services/DataPortabilityService';
import {
    DataExportRequest,
    DataDeletionRequest,
    DataType,
    ConsentRecord,
    PrivacySettings
} from '../types/privacy';
import { v4 as uuidv4 } from 'uuid';

export class DataPortabilityController {
    private dataPortabilityService: DataPortabilityService;

    constructor() {
        this.dataPortabilityService = new DataPortabilityService();
    }

    /**
     * Request user data export
     */
    async requestDataExport(req: Request, res: Response): Promise<void> {
        try {
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({ error: 'User not authenticated' });
                return;
            }

            const {
                format = 'json',
                includeDeleted = false,
                dataTypes
            } = req.body;

            // Validate format
            if (!['json', 'csv', 'xml'].includes(format)) {
                res.status(400).json({ error: 'Invalid format. Must be json, csv, or xml' });
                return;
            }

            // Validate data types if provided
            if (dataTypes && !Array.isArray(dataTypes)) {
                res.status(400).json({ error: 'dataTypes must be an array' });
                return;
            }

            const validDataTypes: DataType[] = [
                'profile', 'weight_entries', 'eating_plans', 'breach_events',
                'safety_interventions', 'gamification_data', 'notification_settings', 'audit_logs'
            ];

            if (dataTypes && !dataTypes.every((type: string) => validDataTypes.includes(type as DataType))) {
                res.status(400).json({
                    error: 'Invalid data types',
                    validTypes: validDataTypes
                });
                return;
            }

            const exportRequest: DataExportRequest = {
                userId,
                requestId: uuidv4(),
                requestedAt: new Date(),
                format,
                includeDeleted,
                dataTypes: dataTypes as DataType[],
                status: 'pending'
            };

            const result = await this.dataPortabilityService.processDataExportRequest(exportRequest);

            if (result.success) {
                res.status(200).json({
                    message: 'Data export request processed successfully',
                    requestId: result.requestId,
                    processedAt: result.processedAt,
                    completedWithinTimeframe: result.completedWithinTimeframe,
                    timeframeDays: result.timeframeDays
                });
            } else {
                res.status(500).json({
                    error: 'Failed to process data export request',
                    requestId: result.requestId,
                    errors: result.errors
                });
            }
        } catch (error) {
            console.error('Error in requestDataExport:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    /**
     * Request user data deletion
     */
    async requestDataDeletion(req: Request, res: Response): Promise<void> {
        try {
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({ error: 'User not authenticated' });
                return;
            }

            const {
                deletionType = 'soft',
                retainAuditLogs = true,
                verificationToken
            } = req.body;

            // Validate deletion type
            if (!['soft', 'hard'].includes(deletionType)) {
                res.status(400).json({ error: 'Invalid deletion type. Must be soft or hard' });
                return;
            }

            // For hard deletion, require additional verification
            const verificationRequired = deletionType === 'hard';
            let verifiedAt: Date | undefined;

            if (verificationRequired) {
                if (!verificationToken) {
                    res.status(400).json({
                        error: 'Verification token required for hard deletion',
                        verificationRequired: true
                    });
                    return;
                }

                // In a real implementation, you would validate the verification token
                // For now, we'll assume any provided token is valid
                verifiedAt = new Date();
            }

            const deletionRequest: DataDeletionRequest = {
                userId,
                requestId: uuidv4(),
                requestedAt: new Date(),
                deletionType,
                retainAuditLogs,
                status: 'pending',
                verificationRequired,
                verifiedAt
            };

            const result = await this.dataPortabilityService.processDataDeletionRequest(deletionRequest);

            if (result.success) {
                res.status(200).json({
                    message: 'Data deletion request processed successfully',
                    requestId: result.requestId,
                    processedAt: result.processedAt,
                    completedWithinTimeframe: result.completedWithinTimeframe,
                    timeframeDays: result.timeframeDays,
                    deletionType
                });
            } else {
                res.status(500).json({
                    error: 'Failed to process data deletion request',
                    requestId: result.requestId,
                    errors: result.errors
                });
            }
        } catch (error) {
            console.error('Error in requestDataDeletion:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    /**
     * Get user's privacy settings
     */
    async getPrivacySettings(req: Request, res: Response): Promise<void> {
        try {
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({ error: 'User not authenticated' });
                return;
            }

            // Default privacy settings - in a real implementation, these would be stored in database
            const privacySettings: PrivacySettings = {
                userId,
                dataRetentionPeriod: 365, // days
                allowAnalytics: true,
                allowMarketing: false,
                allowThirdPartySharing: false,
                anonymizeData: false,
                updatedAt: new Date()
            };

            res.status(200).json(privacySettings);
        } catch (error) {
            console.error('Error in getPrivacySettings:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    /**
     * Update user's privacy settings
     */
    async updatePrivacySettings(req: Request, res: Response): Promise<void> {
        try {
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({ error: 'User not authenticated' });
                return;
            }

            const {
                dataRetentionPeriod,
                allowAnalytics,
                allowMarketing,
                allowThirdPartySharing,
                anonymizeData
            } = req.body;

            // Validate inputs
            if (dataRetentionPeriod !== undefined && (typeof dataRetentionPeriod !== 'number' || dataRetentionPeriod < 30)) {
                res.status(400).json({ error: 'Data retention period must be at least 30 days' });
                return;
            }

            const updatedSettings: PrivacySettings = {
                userId,
                dataRetentionPeriod: dataRetentionPeriod ?? 365,
                allowAnalytics: allowAnalytics ?? true,
                allowMarketing: allowMarketing ?? false,
                allowThirdPartySharing: allowThirdPartySharing ?? false,
                anonymizeData: anonymizeData ?? false,
                updatedAt: new Date()
            };

            // In a real implementation, save to database here

            res.status(200).json({
                message: 'Privacy settings updated successfully',
                settings: updatedSettings
            });
        } catch (error) {
            console.error('Error in updatePrivacySettings:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    /**
     * Record user consent
     */
    async recordConsent(req: Request, res: Response): Promise<void> {
        try {
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({ error: 'User not authenticated' });
                return;
            }

            const { consentType, granted, version } = req.body;

            // Validate consent type
            const validConsentTypes = ['data_processing', 'marketing', 'analytics', 'third_party_sharing'];
            if (!validConsentTypes.includes(consentType)) {
                res.status(400).json({
                    error: 'Invalid consent type',
                    validTypes: validConsentTypes
                });
                return;
            }

            if (typeof granted !== 'boolean') {
                res.status(400).json({ error: 'Granted must be a boolean value' });
                return;
            }

            if (!version || typeof version !== 'string') {
                res.status(400).json({ error: 'Version is required and must be a string' });
                return;
            }

            const consentRecord: ConsentRecord = {
                userId,
                consentType,
                granted,
                grantedAt: granted ? new Date() : undefined,
                revokedAt: !granted ? new Date() : undefined,
                version,
                ipAddress: req.ip,
                userAgent: req.get('User-Agent')
            };

            // In a real implementation, save to database here

            res.status(200).json({
                message: 'Consent recorded successfully',
                consent: consentRecord
            });
        } catch (error) {
            console.error('Error in recordConsent:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    /**
     * Get GDPR compliance information
     */
    async getGDPRInfo(req: Request, res: Response): Promise<void> {
        try {
            const gdprInfo = {
                dataController: {
                    name: 'Vitracka Health Technologies',
                    email: 'privacy@vitracka.com',
                    address: 'London, United Kingdom'
                },
                dataProtectionOfficer: {
                    email: 'dpo@vitracka.com'
                },
                legalBasis: [
                    'Consent (Article 6(1)(a) GDPR)',
                    'Legitimate interests (Article 6(1)(f) GDPR)'
                ],
                dataRetention: {
                    defaultPeriod: '365 days',
                    auditLogs: '7 years (legal requirement)',
                    safetyInterventions: '10 years (safety requirement)'
                },
                userRights: [
                    'Right to access (Article 15)',
                    'Right to rectification (Article 16)',
                    'Right to erasure (Article 17)',
                    'Right to restrict processing (Article 18)',
                    'Right to data portability (Article 20)',
                    'Right to object (Article 21)'
                ],
                processingTimeframes: {
                    dataExport: '30 days maximum',
                    dataDeletion: '30 days maximum',
                    accessRequests: '1 month maximum'
                }
            };

            res.status(200).json(gdprInfo);
        } catch (error) {
            console.error('Error in getGDPRInfo:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
}