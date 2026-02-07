/**
 * Unit Tests for DataPortabilityController
 * Tests GDPR compliance endpoints for data export and deletion
 */

import { Request, Response } from 'express';
import { DataPortabilityController } from '../../../controllers/DataPortabilityController';
import { DataPortabilityService } from '../../../services/DataPortabilityService';

// Mock the DataPortabilityService
jest.mock('../../../services/DataPortabilityService');

describe('DataPortabilityController', () => {
    let controller: DataPortabilityController;
    let mockDataPortabilityService: jest.Mocked<DataPortabilityService>;
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;

    beforeEach(() => {
        jest.clearAllMocks();

        controller = new DataPortabilityController();
        mockDataPortabilityService = new DataPortabilityService() as jest.Mocked<DataPortabilityService>;
        (controller as any).dataPortabilityService = mockDataPortabilityService;

        mockRequest = {
            user: {
                id: 'test-user-id',
                authMethod: 'email' as const,
                emailVerified: true,
                createdAt: new Date(),
                lastLoginAt: new Date(),
                isActive: true
            },
            body: {},
            ip: '127.0.0.1',
            get: jest.fn()
        };

        mockResponse = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };
    });

    describe('requestDataExport', () => {
        it('should successfully process data export request with default parameters', async () => {
            const mockResult = {
                success: true,
                requestId: 'test-request-id',
                processedAt: new Date(),
                completedWithinTimeframe: true,
                timeframeDays: 1
            };

            mockDataPortabilityService.processDataExportRequest.mockResolvedValue(mockResult);

            await controller.requestDataExport(mockRequest as Request, mockResponse as Response);

            expect(mockDataPortabilityService.processDataExportRequest).toHaveBeenCalledWith(
                expect.objectContaining({
                    userId: 'test-user-id',
                    format: 'json',
                    includeDeleted: false,
                    status: 'pending'
                })
            );

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: 'Data export request processed successfully',
                requestId: 'test-request-id',
                processedAt: mockResult.processedAt,
                completedWithinTimeframe: true,
                timeframeDays: 1
            });
        });

        it('should process data export request with custom parameters', async () => {
            mockRequest.body = {
                format: 'csv',
                includeDeleted: true,
                dataTypes: ['profile', 'weight_entries']
            };

            const mockResult = {
                success: true,
                requestId: 'test-request-id',
                processedAt: new Date(),
                completedWithinTimeframe: true,
                timeframeDays: 2
            };

            mockDataPortabilityService.processDataExportRequest.mockResolvedValue(mockResult);

            await controller.requestDataExport(mockRequest as Request, mockResponse as Response);

            expect(mockDataPortabilityService.processDataExportRequest).toHaveBeenCalledWith(
                expect.objectContaining({
                    userId: 'test-user-id',
                    format: 'csv',
                    includeDeleted: true,
                    dataTypes: ['profile', 'weight_entries'],
                    status: 'pending'
                })
            );

            expect(mockResponse.status).toHaveBeenCalledWith(200);
        });

        it('should return 401 when user is not authenticated', async () => {
            mockRequest.user = undefined;

            await controller.requestDataExport(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledWith({ error: 'User not authenticated' });
            expect(mockDataPortabilityService.processDataExportRequest).not.toHaveBeenCalled();
        });

        it('should return 400 for invalid format', async () => {
            mockRequest.body = { format: 'invalid' };

            await controller.requestDataExport(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: 'Invalid format. Must be json, csv, or xml'
            });
            expect(mockDataPortabilityService.processDataExportRequest).not.toHaveBeenCalled();
        });

        it('should return 400 for invalid data types', async () => {
            mockRequest.body = { dataTypes: ['invalid_type'] };

            await controller.requestDataExport(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: 'Invalid data types',
                validTypes: [
                    'profile', 'weight_entries', 'eating_plans', 'breach_events',
                    'safety_interventions', 'gamification_data', 'notification_settings', 'audit_logs'
                ]
            });
        });

        it('should handle service errors gracefully', async () => {
            const mockResult = {
                success: false,
                requestId: 'test-request-id',
                processedAt: new Date(),
                completedWithinTimeframe: false,
                timeframeDays: 0,
                errors: ['Database connection failed']
            };

            mockDataPortabilityService.processDataExportRequest.mockResolvedValue(mockResult);

            await controller.requestDataExport(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: 'Failed to process data export request',
                requestId: 'test-request-id',
                errors: ['Database connection failed']
            });
        });
    });

    describe('requestDataDeletion', () => {
        it('should successfully process soft deletion request', async () => {
            mockRequest.body = { deletionType: 'soft' };

            const mockResult = {
                success: true,
                requestId: 'test-request-id',
                processedAt: new Date(),
                completedWithinTimeframe: true,
                timeframeDays: 1
            };

            mockDataPortabilityService.processDataDeletionRequest.mockResolvedValue(mockResult);

            await controller.requestDataDeletion(mockRequest as Request, mockResponse as Response);

            expect(mockDataPortabilityService.processDataDeletionRequest).toHaveBeenCalledWith(
                expect.objectContaining({
                    userId: 'test-user-id',
                    deletionType: 'soft',
                    retainAuditLogs: true,
                    verificationRequired: false,
                    status: 'pending'
                })
            );

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: 'Data deletion request processed successfully',
                requestId: 'test-request-id',
                processedAt: mockResult.processedAt,
                completedWithinTimeframe: true,
                timeframeDays: 1,
                deletionType: 'soft'
            });
        });

        it('should successfully process hard deletion request with verification', async () => {
            mockRequest.body = {
                deletionType: 'hard',
                retainAuditLogs: false,
                verificationToken: 'valid-token'
            };

            const mockResult = {
                success: true,
                requestId: 'test-request-id',
                processedAt: new Date(),
                completedWithinTimeframe: true,
                timeframeDays: 2
            };

            mockDataPortabilityService.processDataDeletionRequest.mockResolvedValue(mockResult);

            await controller.requestDataDeletion(mockRequest as Request, mockResponse as Response);

            expect(mockDataPortabilityService.processDataDeletionRequest).toHaveBeenCalledWith(
                expect.objectContaining({
                    userId: 'test-user-id',
                    deletionType: 'hard',
                    retainAuditLogs: false,
                    verificationRequired: true,
                    verifiedAt: expect.any(Date),
                    status: 'pending'
                })
            );

            expect(mockResponse.status).toHaveBeenCalledWith(200);
        });

        it('should return 400 for hard deletion without verification token', async () => {
            mockRequest.body = { deletionType: 'hard' };

            await controller.requestDataDeletion(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: 'Verification token required for hard deletion',
                verificationRequired: true
            });
            expect(mockDataPortabilityService.processDataDeletionRequest).not.toHaveBeenCalled();
        });

        it('should return 400 for invalid deletion type', async () => {
            mockRequest.body = { deletionType: 'invalid' };

            await controller.requestDataDeletion(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: 'Invalid deletion type. Must be soft or hard'
            });
        });

        it('should return 401 when user is not authenticated', async () => {
            mockRequest.user = undefined;

            await controller.requestDataDeletion(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledWith({ error: 'User not authenticated' });
        });
    });

    describe('getPrivacySettings', () => {
        it('should return default privacy settings for authenticated user', async () => {
            await controller.getPrivacySettings(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    userId: 'test-user-id',
                    dataRetentionPeriod: 365,
                    allowAnalytics: true,
                    allowMarketing: false,
                    allowThirdPartySharing: false,
                    anonymizeData: false,
                    updatedAt: expect.any(Date)
                })
            );
        });

        it('should return 401 when user is not authenticated', async () => {
            mockRequest.user = undefined;

            await controller.getPrivacySettings(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledWith({ error: 'User not authenticated' });
        });
    });

    describe('updatePrivacySettings', () => {
        it('should successfully update privacy settings', async () => {
            mockRequest.body = {
                dataRetentionPeriod: 180,
                allowAnalytics: false,
                allowMarketing: true
            };

            await controller.updatePrivacySettings(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: 'Privacy settings updated successfully',
                settings: expect.objectContaining({
                    userId: 'test-user-id',
                    dataRetentionPeriod: 180,
                    allowAnalytics: false,
                    allowMarketing: true,
                    allowThirdPartySharing: false,
                    anonymizeData: false,
                    updatedAt: expect.any(Date)
                })
            });
        });

        it('should return 400 for invalid data retention period', async () => {
            mockRequest.body = { dataRetentionPeriod: 15 };

            await controller.updatePrivacySettings(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: 'Data retention period must be at least 30 days'
            });
        });
    });

    describe('recordConsent', () => {
        beforeEach(() => {
            (mockRequest.get as jest.Mock).mockReturnValue('Mozilla/5.0 Test Browser');
        });

        it('should successfully record consent', async () => {
            mockRequest.body = {
                consentType: 'data_processing',
                granted: true,
                version: '1.0'
            };

            await controller.recordConsent(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: 'Consent recorded successfully',
                consent: expect.objectContaining({
                    userId: 'test-user-id',
                    consentType: 'data_processing',
                    granted: true,
                    grantedAt: expect.any(Date),
                    version: '1.0',
                    ipAddress: '127.0.0.1',
                    userAgent: 'Mozilla/5.0 Test Browser'
                })
            });
        });

        it('should record consent revocation', async () => {
            mockRequest.body = {
                consentType: 'marketing',
                granted: false,
                version: '1.0'
            };

            await controller.recordConsent(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: 'Consent recorded successfully',
                consent: expect.objectContaining({
                    granted: false,
                    revokedAt: expect.any(Date),
                    grantedAt: undefined
                })
            });
        });

        it('should return 400 for invalid consent type', async () => {
            mockRequest.body = {
                consentType: 'invalid',
                granted: true,
                version: '1.0'
            };

            await controller.recordConsent(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: 'Invalid consent type',
                validTypes: ['data_processing', 'marketing', 'analytics', 'third_party_sharing']
            });
        });

        it('should return 400 for missing version', async () => {
            mockRequest.body = {
                consentType: 'data_processing',
                granted: true
            };

            await controller.recordConsent(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: 'Version is required and must be a string'
            });
        });
    });

    describe('getGDPRInfo', () => {
        it('should return GDPR compliance information', async () => {
            await controller.getGDPRInfo(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    dataController: expect.objectContaining({
                        name: 'Vitracka Health Technologies',
                        email: 'privacy@vitracka.com'
                    }),
                    userRights: expect.arrayContaining([
                        'Right to access (Article 15)',
                        'Right to erasure (Article 17)',
                        'Right to data portability (Article 20)'
                    ]),
                    processingTimeframes: expect.objectContaining({
                        dataExport: '30 days maximum',
                        dataDeletion: '30 days maximum'
                    })
                })
            );
        });
    });
});