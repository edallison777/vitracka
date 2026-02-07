/**
 * Unit Tests for Regional Compliance Service
 * Tests data residency, cross-border transfers, and regional compliance
 */

import { RegionalComplianceService } from '../../../services/RegionalComplianceService';
import { InternationalizationService } from '../../../services/InternationalizationService';
import {
    ComplianceAuditEvent,
    DataResidencyRule,
    ComplianceRequirement
} from '../../../types/internationalization';

// Mock dependencies
jest.mock('../../../services/InternationalizationService');

describe('RegionalComplianceService', () => {
    let service: RegionalComplianceService;
    let mockInternationalizationService: jest.Mocked<InternationalizationService>;

    beforeEach(() => {
        mockInternationalizationService = new InternationalizationService() as jest.Mocked<InternationalizationService>;
        service = new RegionalComplianceService(mockInternationalizationService);
        jest.clearAllMocks();
    });

    describe('validateDataResidency', () => {
        it('should validate data residency for GDPR regions', async () => {
            const userId = 'eu-user-123';
            const userRegion = 'DE';
            const dataTypes = ['personal_data', 'health_data'];

            mockInternationalizationService.getDataResidencyRegion.mockReturnValue('eu-west-2');
            mockInternationalizationService.getComplianceRequirements.mockReturnValue([
                {
                    code: 'GDPR',
                    name: 'General Data Protection Regulation',
                    description: 'EU data protection regulation',
                    applicableRegions: ['DE', 'FR', 'ES', 'IT'],
                    dataRetentionPeriod: 2555,
                    requiresExplicitConsent: true,
                    allowsDataPortability: true,
                    requiresDataDeletion: true,
                    auditLogRetention: 2555,
                    encryptionRequired: true,
                    crossBorderTransferRestrictions: true,
                    enabled: true
                }
            ]);

            const result = await service.validateDataResidency(userId, userRegion, dataTypes);

            expect(result).toMatchObject({
                isCompliant: true,
                requiredRegion: 'eu-west-2',
                complianceRequirements: ['GDPR'],
                encryptionRequired: true,
                auditRequired: true
            });
        });

        it('should identify non-compliant data residency', async () => {
            const userId = 'eu-user-123';
            const userRegion = 'DE';
            const dataTypes = ['personal_data'];
            const currentStorageRegion = 'us-east-1'; // Non-compliant for GDPR

            mockInternationalizationService.getDataResidencyRegion.mockReturnValue('eu-west-2');
            mockInternationalizationService.getComplianceRequirements.mockReturnValue([
                {
                    code: 'GDPR',
                    name: 'General Data Protection Regulation',
                    description: 'EU data protection regulation',
                    applicableRegions: ['DE'],
                    dataRetentionPeriod: 2555,
                    requiresExplicitConsent: true,
                    allowsDataPortability: true,
                    requiresDataDeletion: true,
                    auditLogRetention: 2555,
                    encryptionRequired: true,
                    crossBorderTransferRestrictions: true,
                    enabled: true
                }
            ]);

            // Mock current storage region as non-compliant
            jest.spyOn(service, 'getCurrentStorageRegion').mockResolvedValue(currentStorageRegion);

            const result = await service.validateDataResidency(userId, userRegion, dataTypes);

            expect(result).toMatchObject({
                isCompliant: false,
                requiredRegion: 'eu-west-2',
                currentRegion: currentStorageRegion,
                violations: expect.arrayContaining(['Data stored outside required region'])
            });
        });
    });

    describe('validateCrossBorderTransfer', () => {
        it('should allow transfers between GDPR regions', async () => {
            const fromRegion = 'DE';
            const toRegion = 'FR';
            const dataTypes = ['personal_data'];

            mockInternationalizationService.isDataTransferAllowed.mockReturnValue(true);
            mockInternationalizationService.getComplianceRequirements
                .mockReturnValueOnce([
                    {
                        code: 'GDPR',
                        name: 'General Data Protection Regulation',
                        description: 'EU data protection regulation',
                        applicableRegions: ['DE'],
                        dataRetentionPeriod: 2555,
                        requiresExplicitConsent: true,
                        allowsDataPortability: true,
                        requiresDataDeletion: true,
                        auditLogRetention: 2555,
                        encryptionRequired: true,
                        crossBorderTransferRestrictions: true,
                        enabled: true
                    }
                ])
                .mockReturnValueOnce([
                    {
                        code: 'GDPR',
                        name: 'General Data Protection Regulation',
                        description: 'EU data protection regulation',
                        applicableRegions: ['FR'],
                        dataRetentionPeriod: 2555,
                        requiresExplicitConsent: true,
                        allowsDataPortability: true,
                        requiresDataDeletion: true,
                        auditLogRetention: 2555,
                        encryptionRequired: true,
                        crossBorderTransferRestrictions: true,
                        enabled: true
                    }
                ]);

            const result = await service.validateCrossBorderTransfer(fromRegion, toRegion, dataTypes);

            expect(result).toMatchObject({
                isAllowed: true,
                requiresAdditionalSafeguards: false,
                compatibleCompliance: ['GDPR']
            });
        });

        it('should restrict transfers from GDPR to non-GDPR regions', async () => {
            const fromRegion = 'DE';
            const toRegion = 'US';
            const dataTypes = ['personal_data'];

            mockInternationalizationService.isDataTransferAllowed.mockReturnValue(false);
            mockInternationalizationService.getComplianceRequirements
                .mockReturnValueOnce([
                    {
                        code: 'GDPR',
                        name: 'General Data Protection Regulation',
                        description: 'EU data protection regulation',
                        applicableRegions: ['DE'],
                        dataRetentionPeriod: 2555,
                        requiresExplicitConsent: true,
                        allowsDataPortability: true,
                        requiresDataDeletion: true,
                        auditLogRetention: 2555,
                        encryptionRequired: true,
                        crossBorderTransferRestrictions: true,
                        enabled: true
                    }
                ])
                .mockReturnValueOnce([
                    {
                        code: 'CCPA',
                        name: 'California Consumer Privacy Act',
                        description: 'California state privacy law',
                        applicableRegions: ['US'],
                        dataRetentionPeriod: 1825,
                        requiresExplicitConsent: false,
                        allowsDataPortability: true,
                        requiresDataDeletion: true,
                        auditLogRetention: 1825,
                        encryptionRequired: true,
                        crossBorderTransferRestrictions: false,
                        enabled: true
                    }
                ]);

            const result = await service.validateCrossBorderTransfer(fromRegion, toRegion, dataTypes);

            expect(result).toMatchObject({
                isAllowed: false,
                restrictions: expect.arrayContaining(['GDPR cross-border transfer restrictions']),
                requiresAdditionalSafeguards: true
            });
        });
    });

    describe('createComplianceAuditEvent', () => {
        it('should create audit event with proper regional context', async () => {
            const eventData = {
                userId: 'user-123',
                eventType: 'data_export',
                region: 'GB',
                complianceRequirement: 'GDPR',
                dataTypes: ['personal_data', 'health_data'],
                action: 'export' as const,
                metadata: {
                    encryptionUsed: true,
                    userConsent: true,
                    legalBasis: 'user_request'
                },
                auditTrail: 'User requested data export via settings page'
            };

            mockInternationalizationService.createComplianceAuditEvent.mockResolvedValue({
                ...eventData,
                id: 'audit-123',
                timestamp: new Date('2024-01-01')
            });

            const result = await service.createComplianceAuditEvent(eventData);

            expect(result).toMatchObject({
                ...eventData,
                id: 'audit-123',
                timestamp: expect.any(Date)
            });

            expect(mockInternationalizationService.createComplianceAuditEvent).toHaveBeenCalledWith(eventData);
        });

        it('should include additional metadata for high-risk operations', async () => {
            const eventData = {
                userId: 'user-123',
                eventType: 'data_deletion',
                region: 'DE',
                complianceRequirement: 'GDPR',
                dataTypes: ['personal_data', 'health_data', 'financial_data'],
                action: 'delete' as const,
                metadata: {
                    encryptionUsed: true,
                    userConsent: true,
                    legalBasis: 'right_to_erasure',
                    dataSize: 1024000, // 1MB
                    sourceRegion: 'DE',
                    targetRegion: 'DE'
                },
                auditTrail: 'User exercised right to erasure under GDPR Article 17'
            };

            const result = await service.createComplianceAuditEvent(eventData);

            expect(result.metadata).toMatchObject({
                encryptionUsed: true,
                userConsent: true,
                legalBasis: 'right_to_erasure',
                dataSize: 1024000
            });
        });
    });

    describe('validateUserConsent', () => {
        it('should validate explicit consent for GDPR regions', async () => {
            const userId = 'eu-user-123';
            const region = 'DE';
            const dataTypes = ['personal_data'];
            const processingPurpose = 'weight_tracking';

            jest.spyOn(service, 'getUserConsentRecord').mockResolvedValue({
                userId,
                consentGiven: true,
                consentDate: new Date('2024-01-01'),
                consentVersion: '1.0',
                dataTypes,
                processingPurposes: [processingPurpose],
                withdrawalDate: null,
                legalBasis: 'consent'
            });

            const result = await service.validateUserConsent(userId, region, dataTypes, processingPurpose);

            expect(result).toMatchObject({
                hasValidConsent: true,
                consentDate: expect.any(Date),
                legalBasis: 'consent',
                canProcess: true
            });
        });

        it('should handle withdrawn consent', async () => {
            const userId = 'eu-user-123';
            const region = 'DE';
            const dataTypes = ['personal_data'];
            const processingPurpose = 'marketing';

            jest.spyOn(service, 'getUserConsentRecord').mockResolvedValue({
                userId,
                consentGiven: false,
                consentDate: new Date('2024-01-01'),
                consentVersion: '1.0',
                dataTypes,
                processingPurposes: [processingPurpose],
                withdrawalDate: new Date('2024-02-01'),
                legalBasis: 'consent'
            });

            const result = await service.validateUserConsent(userId, region, dataTypes, processingPurpose);

            expect(result).toMatchObject({
                hasValidConsent: false,
                withdrawalDate: expect.any(Date),
                canProcess: false,
                requiresAction: 'stop_processing'
            });
        });
    });

    describe('handleDataPortabilityRequest', () => {
        it('should process data export request for GDPR user', async () => {
            const userId = 'eu-user-123';
            const region = 'DE';
            const requestedFormats = ['json', 'csv'];

            jest.spyOn(service, 'validateDataPortabilityRights').mockResolvedValue({
                hasRight: true,
                supportedFormats: ['json', 'csv', 'xml'],
                estimatedSize: 1024000,
                processingTime: '24-48 hours'
            });

            const result = await service.handleDataPortabilityRequest(userId, region, requestedFormats);

            expect(result).toMatchObject({
                requestId: expect.any(String),
                status: 'processing',
                estimatedCompletion: expect.any(Date),
                supportedFormats: ['json', 'csv'],
                complianceRequirement: 'GDPR'
            });
        });

        it('should reject data portability request for regions without rights', async () => {
            const userId = 'us-user-123';
            const region = 'US';
            const requestedFormats = ['json'];

            // CCPA allows data portability, but with different requirements
            jest.spyOn(service, 'validateDataPortabilityRights').mockResolvedValue({
                hasRight: true,
                supportedFormats: ['json'],
                estimatedSize: 512000,
                processingTime: '30 days',
                additionalRequirements: ['identity_verification']
            });

            const result = await service.handleDataPortabilityRequest(userId, region, requestedFormats);

            expect(result).toMatchObject({
                requestId: expect.any(String),
                status: 'pending_verification',
                additionalRequirements: ['identity_verification'],
                complianceRequirement: 'CCPA'
            });
        });
    });

    describe('handleDataDeletionRequest', () => {
        it('should process right to erasure for GDPR user', async () => {
            const userId = 'eu-user-123';
            const region = 'DE';
            const deletionScope = ['personal_data', 'health_data'];

            jest.spyOn(service, 'validateDeletionRights').mockResolvedValue({
                hasRight: true,
                deletableData: deletionScope,
                retentionExceptions: [],
                processingTime: '30 days'
            });

            const result = await service.handleDataDeletionRequest(userId, region, deletionScope);

            expect(result).toMatchObject({
                requestId: expect.any(String),
                status: 'processing',
                deletionScope,
                estimatedCompletion: expect.any(Date),
                complianceRequirement: 'GDPR'
            });
        });

        it('should handle retention exceptions', async () => {
            const userId = 'eu-user-123';
            const region = 'DE';
            const deletionScope = ['personal_data', 'financial_data'];

            jest.spyOn(service, 'validateDeletionRights').mockResolvedValue({
                hasRight: true,
                deletableData: ['personal_data'],
                retentionExceptions: [
                    {
                        dataType: 'financial_data',
                        reason: 'legal_obligation',
                        retentionPeriod: 2555, // 7 years
                        legalBasis: 'Tax compliance requirements'
                    }
                ],
                processingTime: '30 days'
            });

            const result = await service.handleDataDeletionRequest(userId, region, deletionScope);

            expect(result).toMatchObject({
                requestId: expect.any(String),
                status: 'partial_processing',
                deletionScope: ['personal_data'],
                retentionExceptions: expect.arrayContaining([
                    expect.objectContaining({
                        dataType: 'financial_data',
                        reason: 'legal_obligation'
                    })
                ])
            });
        });
    });

    describe('monitorComplianceViolations', () => {
        it('should detect and report compliance violations', async () => {
            const violations = [
                {
                    type: 'data_residency_violation',
                    userId: 'eu-user-123',
                    region: 'DE',
                    description: 'Personal data stored in non-compliant region',
                    severity: 'high',
                    detectedAt: new Date(),
                    complianceRequirement: 'GDPR'
                },
                {
                    type: 'consent_expiry',
                    userId: 'eu-user-456',
                    region: 'FR',
                    description: 'User consent expired without renewal',
                    severity: 'medium',
                    detectedAt: new Date(),
                    complianceRequirement: 'GDPR'
                }
            ];

            jest.spyOn(service, 'scanForViolations').mockResolvedValue(violations);

            const result = await service.monitorComplianceViolations();

            expect(result).toMatchObject({
                totalViolations: 2,
                highSeverityCount: 1,
                mediumSeverityCount: 1,
                lowSeverityCount: 0,
                violations: expect.arrayContaining(violations)
            });
        });

        it('should trigger automated remediation for certain violations', async () => {
            const violations = [
                {
                    type: 'data_residency_violation',
                    userId: 'eu-user-123',
                    region: 'DE',
                    description: 'Personal data stored in non-compliant region',
                    severity: 'high',
                    detectedAt: new Date(),
                    complianceRequirement: 'GDPR',
                    autoRemediable: true
                }
            ];

            jest.spyOn(service, 'scanForViolations').mockResolvedValue(violations);
            jest.spyOn(service, 'triggerAutomatedRemediation').mockResolvedValue({
                remediationId: 'remediation-123',
                status: 'initiated',
                estimatedCompletion: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
            });

            const result = await service.monitorComplianceViolations();

            expect(service.triggerAutomatedRemediation).toHaveBeenCalledWith(violations[0]);
            expect(result.remediationActions).toHaveLength(1);
        });
    });

    describe('generateComplianceReport', () => {
        it('should generate comprehensive compliance report', async () => {
            const reportPeriod = {
                startDate: new Date('2024-01-01'),
                endDate: new Date('2024-01-31')
            };

            const mockReportData = {
                totalUsers: 1000,
                usersByRegion: {
                    'GB': 300,
                    'DE': 250,
                    'FR': 200,
                    'US': 150,
                    'CA': 100
                },
                complianceEvents: {
                    'data_export': 25,
                    'data_deletion': 10,
                    'consent_withdrawal': 5
                },
                violations: {
                    'high': 0,
                    'medium': 2,
                    'low': 5
                },
                dataResidencyCompliance: 99.8
            };

            jest.spyOn(service, 'generateReportData').mockResolvedValue(mockReportData);

            const result = await service.generateComplianceReport(reportPeriod);

            expect(result).toMatchObject({
                reportId: expect.any(String),
                period: reportPeriod,
                generatedAt: expect.any(Date),
                summary: mockReportData,
                recommendations: expect.any(Array)
            });
        });
    });
});