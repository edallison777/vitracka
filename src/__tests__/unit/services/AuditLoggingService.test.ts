/**
 * Unit Tests for AuditLoggingService
 * Tests comprehensive audit logging functionality
 */

import { Pool } from 'pg';
import { AuditLoggingService } from '../../../services/AuditLoggingService';
import { AuditLogRepository } from '../../../database/repositories/AuditLogRepository';
import { AuditLogEntry, SafetyAuditEvent, AuditLogFilter } from '../../../types/audit';

// Mock the repository
jest.mock('../../../database/repositories/AuditLogRepository');

describe('AuditLoggingService', () => {
    let auditService: AuditLoggingService;
    let mockRepository: jest.Mocked<AuditLogRepository>;
    let mockPool: jest.Mocked<Pool>;

    beforeEach(() => {
        mockPool = {
            query: jest.fn().mockResolvedValue({ rows: [] })
        } as any;

        mockRepository = {
            createAuditEntry: jest.fn(),
            createSafetyAuditEntry: jest.fn(),
            getAuditEntries: jest.fn(),
            getAuditSummary: jest.fn(),
            getSafetyEntriesForReview: jest.fn(),
            markAsReviewed: jest.fn(),
            cleanupExpiredEntries: jest.fn()
        } as any;

        auditService = new AuditLoggingService(mockPool);
        (auditService as any).repository = mockRepository;
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('logEvent', () => {
        it('should log a general system event successfully', async () => {
            const mockEntry: AuditLogEntry = {
                id: 'test-id',
                timestamp: new Date(),
                eventType: 'user_authentication',
                severity: 'info',
                action: 'login_success',
                description: 'User logged in successfully',
                metadata: { method: 'email' },
                isSafetyRelated: false,
                requiresAdminReview: false,
                adminReviewed: false,
                dataClassification: 'confidential',
                retentionPeriod: 365
            };

            mockRepository.createAuditEntry.mockResolvedValue(mockEntry);

            const result = await auditService.logEvent({
                eventType: 'user_authentication',
                severity: 'info',
                action: 'login_success',
                description: 'User logged in successfully',
                userId: 'user-123',
                metadata: { method: 'email' }
            });

            expect(mockRepository.createAuditEntry).toHaveBeenCalledWith(
                expect.objectContaining({
                    eventType: 'user_authentication',
                    severity: 'info',
                    action: 'login_success',
                    description: 'User logged in successfully',
                    userId: 'user-123',
                    metadata: { method: 'email' }
                })
            );

            expect(result).toEqual(mockEntry);
        });

        it('should automatically set admin review for critical events', async () => {
            const mockEntry: AuditLogEntry = {
                id: 'test-id',
                timestamp: new Date(),
                eventType: 'system_decision',
                severity: 'critical',
                action: 'system_failure',
                description: 'Critical system failure occurred',
                metadata: {},
                isSafetyRelated: false,
                requiresAdminReview: true,
                adminReviewed: false,
                dataClassification: 'confidential',
                retentionPeriod: 365
            };

            mockRepository.createAuditEntry.mockResolvedValue(mockEntry);

            await auditService.logEvent({
                eventType: 'system_decision',
                severity: 'critical',
                action: 'system_failure',
                description: 'Critical system failure occurred'
            });

            expect(mockRepository.createAuditEntry).toHaveBeenCalledWith(
                expect.objectContaining({
                    severity: 'critical',
                    requiresAdminReview: true
                })
            );
        });

        it('should set appropriate data classification based on event type', async () => {
            const mockEntry: AuditLogEntry = {
                id: 'test-id',
                timestamp: new Date(),
                eventType: 'agent_interaction',
                severity: 'info',
                action: 'user_message',
                description: 'User sent message to agent',
                metadata: {},
                isSafetyRelated: false,
                requiresAdminReview: false,
                adminReviewed: false,
                dataClassification: 'confidential',
                retentionPeriod: 365
            };

            mockRepository.createAuditEntry.mockResolvedValue(mockEntry);

            await auditService.logEvent({
                eventType: 'agent_interaction',
                severity: 'info',
                action: 'user_message',
                description: 'User sent message to agent'
            });

            expect(mockRepository.createAuditEntry).toHaveBeenCalledWith(
                expect.objectContaining({
                    dataClassification: 'confidential'
                })
            );
        });
    });

    describe('logSafetyEvent', () => {
        it('should log safety events with enhanced tracking', async () => {
            const mockSafetyEvent: SafetyAuditEvent = {
                id: 'safety-id',
                timestamp: new Date(),
                eventType: 'safety_intervention',
                severity: 'critical',
                userId: 'user-123',
                agentId: 'safety_sentinel',
                action: 'safety_intervention',
                description: 'Safety intervention triggered',
                metadata: {},
                isSafetyRelated: true,
                requiresAdminReview: true,
                adminReviewed: false,
                dataClassification: 'restricted',
                retentionPeriod: 2555,
                triggerType: 'eating_disorder',
                triggerContent: 'I want to purge',
                interventionResponse: 'Please seek professional help',
                escalationLevel: 'high',
                followUpRequired: true,
                adminNotificationSent: true
            };

            mockRepository.createSafetyAuditEntry.mockResolvedValue(mockSafetyEvent);

            const result = await auditService.logSafetyEvent({
                eventType: 'safety_intervention',
                severity: 'critical',
                action: 'safety_intervention',
                description: 'Safety intervention triggered',
                userId: 'user-123',
                agentId: 'safety_sentinel',
                triggerType: 'eating_disorder',
                triggerContent: 'I want to purge',
                interventionResponse: 'Please seek professional help',
                escalationLevel: 'high',
                followUpRequired: true,
                adminNotificationSent: true
            });

            expect(mockRepository.createSafetyAuditEntry).toHaveBeenCalledWith(
                expect.objectContaining({
                    eventType: 'safety_intervention',
                    severity: 'critical',
                    isSafetyRelated: true,
                    requiresAdminReview: true,
                    dataClassification: 'restricted',
                    retentionPeriod: 2555,
                    triggerType: 'eating_disorder',
                    triggerContent: 'I want to purge',
                    interventionResponse: 'Please seek professional help',
                    escalationLevel: 'high',
                    followUpRequired: true,
                    adminNotificationSent: true
                })
            );

            expect(result).toEqual(mockSafetyEvent);
        });

        it('should always require admin review for safety events', async () => {
            const mockSafetyEvent: SafetyAuditEvent = {
                id: 'safety-id-2',
                timestamp: new Date(),
                eventType: 'safety_intervention',
                severity: 'info',
                userId: 'user-123',
                agentId: 'safety_sentinel',
                action: 'safety_check',
                description: 'Routine safety check',
                metadata: {},
                isSafetyRelated: true,
                requiresAdminReview: true,
                adminReviewed: false,
                dataClassification: 'restricted',
                retentionPeriod: 2555,
                triggerType: 'depression',
                triggerContent: 'feeling down',
                interventionResponse: 'gentle support',
                escalationLevel: 'low',
                followUpRequired: false,
                adminNotificationSent: false
            };

            mockRepository.createSafetyAuditEntry.mockResolvedValue(mockSafetyEvent);

            await auditService.logSafetyEvent({
                eventType: 'safety_intervention',
                severity: 'info', // Even low severity
                action: 'safety_check',
                description: 'Routine safety check',
                userId: 'user-123',
                agentId: 'safety_sentinel',
                triggerType: 'depression',
                triggerContent: 'feeling down',
                interventionResponse: 'gentle support',
                escalationLevel: 'low',
                followUpRequired: false,
                adminNotificationSent: false
            });

            expect(mockRepository.createSafetyAuditEntry).toHaveBeenCalledWith(
                expect.objectContaining({
                    requiresAdminReview: true,
                    dataClassification: 'restricted'
                })
            );
        });
    });

    describe('logAgentInteraction', () => {
        it('should log agent interactions with sanitized user input', async () => {
            const mockEntry: AuditLogEntry = {
                id: 'test-id',
                timestamp: new Date(),
                eventType: 'agent_interaction',
                severity: 'info',
                action: 'coaching_response',
                description: 'Agent interaction logged',
                metadata: {
                    userInput: 'My email is [EMAIL] and my card is [CARD_NUMBER]',
                    agentResponse: 'Thanks for sharing!',
                    processingTimeMs: 150
                },
                isSafetyRelated: false,
                requiresAdminReview: false,
                adminReviewed: false,
                dataClassification: 'confidential',
                retentionPeriod: 365,
                agentId: 'coach_companion',
                userId: 'user-123',
                sessionId: 'session-456'
            };

            mockRepository.createAuditEntry.mockResolvedValue(mockEntry);

            await auditService.logAgentInteraction({
                agentId: 'coach_companion',
                userId: 'user-123',
                sessionId: 'session-456',
                action: 'coaching_response',
                userInput: 'My email is test@example.com and my card is 1234-5678-9012-3456',
                agentResponse: 'Thanks for sharing!',
                processingTime: 150
            });

            expect(mockRepository.createAuditEntry).toHaveBeenCalledWith(
                expect.objectContaining({
                    eventType: 'agent_interaction',
                    agentId: 'coach_companion',
                    userId: 'user-123',
                    sessionId: 'session-456',
                    metadata: expect.objectContaining({
                        userInput: 'My email is [EMAIL] and my card is [CARD_NUMBER]',
                        agentResponse: 'Thanks for sharing!',
                        processingTimeMs: 150
                    }),
                    dataClassification: 'confidential'
                })
            );
        });
    });

    describe('logSystemDecision', () => {
        it('should log system decisions with reasoning', async () => {
            const mockEntry: AuditLogEntry = {
                id: 'test-id',
                timestamp: new Date(),
                eventType: 'system_decision',
                severity: 'info',
                action: 'system_decision',
                description: 'System decision: reject_weight_goal',
                metadata: {
                    decision: 'reject_weight_goal',
                    reasoning: 'Target weight is below healthy BMI range',
                    targetBMI: 16.5
                },
                isSafetyRelated: false,
                requiresAdminReview: false,
                adminReviewed: false,
                dataClassification: 'confidential',
                retentionPeriod: 365,
                agentId: 'health_boundaries',
                userId: 'user-123'
            };

            mockRepository.createAuditEntry.mockResolvedValue(mockEntry);

            await auditService.logSystemDecision({
                decision: 'reject_weight_goal',
                reasoning: 'Target weight is below healthy BMI range',
                agentId: 'health_boundaries',
                userId: 'user-123',
                metadata: { targetBMI: 16.5 }
            });

            expect(mockRepository.createAuditEntry).toHaveBeenCalledWith(
                expect.objectContaining({
                    eventType: 'system_decision',
                    action: 'system_decision',
                    description: 'System decision: reject_weight_goal',
                    agentId: 'health_boundaries',
                    userId: 'user-123',
                    metadata: {
                        decision: 'reject_weight_goal',
                        reasoning: 'Target weight is below healthy BMI range',
                        targetBMI: 16.5
                    }
                })
            );
        });
    });

    describe('logError', () => {
        it('should log errors with stack traces', async () => {
            const mockEntry: AuditLogEntry = {
                id: 'test-id',
                timestamp: new Date(),
                eventType: 'system_decision',
                severity: 'error',
                action: 'error_occurred',
                description: 'Error in TestService.testMethod: Test error message',
                metadata: {
                    errorName: 'Error',
                    errorMessage: 'Test error message',
                    context: 'TestService.testMethod',
                    stackTrace: 'Error: Test error message\n    at test.js:1:1'
                },
                isSafetyRelated: false,
                requiresAdminReview: false,
                adminReviewed: false,
                dataClassification: 'confidential',
                retentionPeriod: 365,
                userId: 'user-123'
            };

            mockRepository.createAuditEntry.mockResolvedValue(mockEntry);

            const testError = new Error('Test error message');
            testError.stack = 'Error: Test error message\n    at test.js:1:1';

            await auditService.logError({
                error: testError,
                context: 'TestService.testMethod',
                userId: 'user-123',
                severity: 'error'
            });

            expect(mockRepository.createAuditEntry).toHaveBeenCalledWith(
                expect.objectContaining({
                    eventType: 'system_decision',
                    severity: 'error',
                    action: 'error_occurred',
                    description: 'Error in TestService.testMethod: Test error message',
                    userId: 'user-123',
                    metadata: {
                        errorName: 'Error',
                        errorMessage: 'Test error message',
                        context: 'TestService.testMethod',
                        stackTrace: 'Error: Test error message\n    at test.js:1:1'
                    }
                })
            );
        });
    });

    describe('getAuditEntries', () => {
        it('should retrieve audit entries with filtering', async () => {
            const mockEntries: AuditLogEntry[] = [
                {
                    id: 'entry-1',
                    timestamp: new Date(),
                    eventType: 'user_authentication',
                    severity: 'info',
                    action: 'login',
                    description: 'User login',
                    metadata: {},
                    isSafetyRelated: false,
                    requiresAdminReview: false,
                    adminReviewed: false,
                    dataClassification: 'confidential',
                    retentionPeriod: 365
                }
            ];

            mockRepository.getAuditEntries.mockResolvedValue(mockEntries);

            const filter: AuditLogFilter = {
                eventTypes: ['user_authentication'],
                severity: ['info'],
                userId: 'user-123'
            };

            const result = await auditService.getAuditEntries(filter, 50, 0);

            expect(mockRepository.getAuditEntries).toHaveBeenCalledWith(filter, 50, 0);
            expect(result).toEqual(mockEntries);
        });
    });

    describe('markAsReviewed', () => {
        it('should mark entries as reviewed and log the action', async () => {
            const mockEntry: AuditLogEntry = {
                id: 'test-id',
                timestamp: new Date(),
                eventType: 'admin_action',
                severity: 'info',
                action: 'audit_review',
                description: 'Admin admin@example.com reviewed 2 audit entries',
                metadata: {
                    reviewedEntries: 2,
                    reviewedBy: 'admin@example.com',
                    reviewedAt: expect.any(Date)
                },
                isSafetyRelated: false,
                requiresAdminReview: false,
                adminReviewed: false,
                dataClassification: 'confidential',
                retentionPeriod: 365
            };

            mockRepository.markAsReviewed.mockResolvedValue();
            mockRepository.createAuditEntry.mockResolvedValue(mockEntry);

            const entryIds = ['entry-1', 'entry-2'];
            const reviewedBy = 'admin@example.com';

            await auditService.markAsReviewed(entryIds, reviewedBy);

            expect(mockRepository.markAsReviewed).toHaveBeenCalledWith(entryIds, reviewedBy);
            expect(mockRepository.createAuditEntry).toHaveBeenCalledWith(
                expect.objectContaining({
                    eventType: 'admin_action',
                    action: 'audit_review',
                    description: 'Admin admin@example.com reviewed 2 audit entries',
                    metadata: {
                        reviewedEntries: 2,
                        reviewedBy: 'admin@example.com',
                        reviewedAt: expect.any(Date)
                    }
                })
            );
        });
    });

    describe('cleanupExpiredEntries', () => {
        it('should cleanup expired entries and log the operation', async () => {
            const mockEntry: AuditLogEntry = {
                id: 'test-id',
                timestamp: new Date(),
                eventType: 'system_decision',
                severity: 'info',
                action: 'audit_cleanup',
                description: 'Cleaned up 25 expired audit entries',
                metadata: {
                    deletedCount: 25,
                    cleanupDate: expect.any(Date)
                },
                isSafetyRelated: false,
                requiresAdminReview: false,
                adminReviewed: false,
                dataClassification: 'confidential',
                retentionPeriod: 365,
                agentId: 'system'
            };

            mockRepository.cleanupExpiredEntries.mockResolvedValue(25);
            mockRepository.createAuditEntry.mockResolvedValue(mockEntry);

            const result = await auditService.cleanupExpiredEntries();

            expect(mockRepository.cleanupExpiredEntries).toHaveBeenCalled();
            expect(result).toBe(25);
            expect(mockRepository.createAuditEntry).toHaveBeenCalledWith(
                expect.objectContaining({
                    eventType: 'system_decision',
                    action: 'audit_cleanup',
                    description: 'Cleaned up 25 expired audit entries',
                    agentId: 'system',
                    metadata: {
                        deletedCount: 25,
                        cleanupDate: expect.any(Date)
                    }
                })
            );
        });
    });

    describe('input sanitization', () => {
        it('should sanitize sensitive information from user input', async () => {
            const mockEntry: AuditLogEntry = {
                id: 'test-id',
                timestamp: new Date(),
                eventType: 'agent_interaction',
                severity: 'info',
                action: 'test',
                description: 'Agent interaction logged',
                metadata: {
                    userInput: 'My SSN is [SSN], email [EMAIL], phone [PHONE], card [CARD_NUMBER]',
                    agentResponse: 'Response',
                    processingTimeMs: 100
                },
                isSafetyRelated: false,
                requiresAdminReview: false,
                adminReviewed: false,
                dataClassification: 'confidential',
                retentionPeriod: 365,
                agentId: 'test_agent',
                userId: 'user-123',
                sessionId: 'session-456'
            };

            mockRepository.createAuditEntry.mockResolvedValue(mockEntry);

            const sensitiveInput = 'My SSN is 123-45-6789, email test@example.com, phone 1234567890, card 4532-1234-5678-9012';

            await auditService.logAgentInteraction({
                agentId: 'test_agent',
                userId: 'user-123',
                sessionId: 'session-456',
                action: 'test',
                userInput: sensitiveInput,
                agentResponse: 'Response',
                processingTime: 100
            });

            expect(mockRepository.createAuditEntry).toHaveBeenCalledWith(
                expect.objectContaining({
                    metadata: expect.objectContaining({
                        userInput: 'My SSN is [SSN], email [EMAIL], phone [PHONE], card [CARD_NUMBER]'
                    })
                })
            );
        });
    });

    describe('safety detection', () => {
        it('should detect safety-related events from metadata', async () => {
            const mockEntry: AuditLogEntry = {
                id: 'test-id',
                timestamp: new Date(),
                eventType: 'agent_interaction',
                severity: 'warning',
                action: 'response_generated',
                description: 'Agent generated response',
                metadata: {
                    triggerDetected: true,
                    interventionRequired: true
                },
                isSafetyRelated: true,
                requiresAdminReview: false,
                adminReviewed: false,
                dataClassification: 'confidential',
                retentionPeriod: 365
            };

            mockRepository.createAuditEntry.mockResolvedValue(mockEntry);

            await auditService.logEvent({
                eventType: 'agent_interaction',
                severity: 'warning',
                action: 'response_generated',
                description: 'Agent generated response',
                metadata: {
                    triggerDetected: true,
                    interventionRequired: true
                }
            });

            expect(mockRepository.createAuditEntry).toHaveBeenCalledWith(
                expect.objectContaining({
                    isSafetyRelated: true,
                    requiresAdminReview: false // Not critical severity
                })
            );
        });
    });
});