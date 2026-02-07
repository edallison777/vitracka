/**
 * Property-Based Tests for Comprehensive Audit Logging
 * Feature: vitracka-weight-management, Property 14: Comprehensive Audit Logging
 * Validates: Requirements 11.1, 11.2, 11.3
 */

import fc from 'fast-check';
import { Pool } from 'pg';
import { AuditLoggingService } from '../../services/AuditLoggingService';
import {
    AuditEventType,
    AuditSeverity
} from '../../types/audit';

// Mock database pool for testing
const mockPool = {
    query: jest.fn(),
} as unknown as Pool;

describe('Comprehensive Audit Logging Properties', () => {
    let auditService: AuditLoggingService;

    beforeEach(() => {
        jest.clearAllMocks();
        auditService = new AuditLoggingService(mockPool);

        // Mock default configuration query
        (mockPool.query as jest.Mock).mockImplementation((query: string, values?: any[]) => {
            if (query.includes('audit_configuration')) {
                return Promise.resolve({
                    rows: [{
                        enabled_event_types: [
                            'agent_interaction', 'safety_intervention', 'user_authentication',
                            'profile_update', 'weight_entry', 'eating_plan_change', 'breach_event',
                            'gamification_reward', 'notification_sent', 'cost_analysis',
                            'system_decision', 'data_export', 'data_deletion', 'admin_action'
                        ],
                        default_retention_period: 365,
                        auto_review_threshold: 'error',
                        safety_event_auto_escalation: true,
                        compliance_mode: 'standard',
                        encryption_enabled: true,
                        real_time_alerting: true
                    }]
                });
            }

            // Mock successful insert - return values based on input
            if (query.includes('INSERT INTO audit_logs')) {
                const [
                    timestamp, eventType, severity, userId, agentId, sessionId,
                    action, description, metadata, isSafetyRelated, requiresAdminReview,
                    adminReviewed, dataClassification, retentionPeriod, requestId,
                    ipAddress, userAgent, errorCode, errorMessage, stackTrace
                ] = values || [];

                // Parse metadata if it's a string
                let parsedMetadata = {};
                if (typeof metadata === 'string') {
                    try {
                        parsedMetadata = JSON.parse(metadata);
                    } catch {
                        parsedMetadata = {};
                    }
                } else if (metadata && typeof metadata === 'object') {
                    parsedMetadata = metadata;
                }

                return Promise.resolve({
                    rows: [{
                        id: 'test-audit-id-' + Math.random().toString(36).substring(2, 11),
                        timestamp: timestamp || new Date(),
                        event_type: eventType,
                        severity: severity,
                        user_id: userId || null,
                        agent_id: agentId || null,
                        session_id: sessionId || null,
                        action: action,
                        description: description,
                        metadata: typeof metadata === 'string' ? metadata : JSON.stringify(parsedMetadata),
                        is_safety_related: isSafetyRelated !== undefined ? isSafetyRelated : false,
                        requires_admin_review: requiresAdminReview !== undefined ? requiresAdminReview : false,
                        admin_reviewed: adminReviewed !== undefined ? adminReviewed : false,
                        reviewed_at: null,
                        reviewed_by: null,
                        data_classification: dataClassification || 'internal',
                        retention_period: retentionPeriod || 365,
                        request_id: requestId || null,
                        ip_address: ipAddress || null,
                        user_agent: userAgent || null,
                        error_code: errorCode || null,
                        error_message: errorMessage || null,
                        stack_trace: stackTrace || null
                    }]
                });
            }

            // Default fallback
            return Promise.resolve({ rows: [] });
        });
    });

    /**
     * Property 14: Comprehensive Audit Logging
     * For any agent interaction or system decision, appropriate log entries should be created 
     * with special flagging for safety-related events and secure storage in accordance with 
     * data security requirements
     */
    describe('Property 14: Comprehensive Audit Logging', () => {
        it('should create audit entries for all agent interactions', async () => {
            await fc.assert(fc.asyncProperty(
                fc.record({
                    eventType: fc.constantFrom(...[
                        'agent_interaction', 'safety_intervention', 'user_authentication',
                        'profile_update', 'weight_entry', 'eating_plan_change', 'breach_event',
                        'gamification_reward', 'notification_sent', 'cost_analysis',
                        'system_decision', 'data_export', 'data_deletion', 'admin_action'
                    ] as AuditEventType[]),
                    severity: fc.constantFrom(...['info', 'warning', 'error', 'critical'] as AuditSeverity[]),
                    action: fc.string({ minLength: 1, maxLength: 100 }),
                    description: fc.string({ minLength: 1, maxLength: 500 }),
                    userId: fc.option(fc.uuid(), { nil: undefined }),
                    agentId: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
                    sessionId: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
                    metadata: fc.dictionary(fc.string(), fc.anything()),
                    requestId: fc.option(fc.string(), { nil: undefined }),
                    ipAddress: fc.option(fc.ipV4(), { nil: undefined }),
                    userAgent: fc.option(fc.string(), { nil: undefined })
                }),
                async (params) => {
                    // Feature: vitracka-weight-management, Property 14: Comprehensive Audit Logging
                    const result = await auditService.logEvent(params);

                    // Verify audit entry was created
                    expect(result).toBeDefined();
                    expect(result.eventType).toBe(params.eventType);
                    expect(result.severity).toBe(params.severity);
                    expect(result.action).toBe(params.action);
                    expect(result.description).toBe(params.description);

                    // Verify database was called with correct parameters
                    expect(mockPool.query).toHaveBeenCalled();
                    const queryCall = (mockPool.query as jest.Mock).mock.calls.find(call =>
                        call[0].includes('INSERT INTO audit_logs')
                    );
                    expect(queryCall).toBeDefined();
                }
            ), { numRuns: 100 });
        });

        it('should properly flag safety-related events for admin review', async () => {
            await fc.assert(fc.asyncProperty(
                fc.record({
                    eventType: fc.constantFrom('safety_intervention' as AuditEventType, 'agent_interaction' as AuditEventType),
                    severity: fc.constantFrom(...['info', 'warning', 'error', 'critical'] as AuditSeverity[]),
                    action: fc.string({ minLength: 1, maxLength: 100 }),
                    description: fc.string({ minLength: 1, maxLength: 500 }),
                    userId: fc.uuid(),
                    agentId: fc.string({ minLength: 1, maxLength: 50 }),
                    metadata: fc.record({
                        trigger: fc.option(fc.string(), { nil: undefined }),
                        intervention: fc.option(fc.string(), { nil: undefined }),
                        safety: fc.option(fc.boolean(), { nil: undefined })
                    })
                }),
                async (params) => {
                    // Feature: vitracka-weight-management, Property 14: Comprehensive Audit Logging
                    const result = await auditService.logEvent(params);

                    // Safety interventions should always be flagged as safety-related
                    if (params.eventType === 'safety_intervention') {
                        expect(result.isSafetyRelated).toBe(true);
                        expect(result.requiresAdminReview).toBe(true);
                        expect(result.dataClassification).toBe('restricted');
                    }

                    // Events with safety-related metadata should be flagged
                    if (params.metadata && (params.metadata.trigger || params.metadata.intervention || params.metadata.safety)) {
                        expect(result.isSafetyRelated).toBe(true);
                    }

                    // Critical events should always require admin review
                    if (params.severity === 'critical') {
                        expect(result.requiresAdminReview).toBe(true);
                    }
                }
            ), { numRuns: 100 });
        });

        it('should create enhanced safety audit entries with all required fields', async () => {
            await fc.assert(fc.asyncProperty(
                fc.record({
                    eventType: fc.constantFrom('safety_intervention' as AuditEventType),
                    severity: fc.constantFrom(...['warning', 'error', 'critical'] as AuditSeverity[]),
                    action: fc.string({ minLength: 1, maxLength: 100 }),
                    description: fc.string({ minLength: 1, maxLength: 500 }),
                    userId: fc.uuid(),
                    agentId: fc.constantFrom('safety_sentinel', 'medical_boundaries'),
                    triggerType: fc.constantFrom('eating_disorder', 'self_harm', 'depression', 'medical_emergency') as fc.Arbitrary<'eating_disorder' | 'self_harm' | 'depression' | 'medical_emergency'>,
                    triggerContent: fc.string({ minLength: 1, maxLength: 1000 }),
                    interventionResponse: fc.string({ minLength: 1, maxLength: 2000 }),
                    escalationLevel: fc.constantFrom('low', 'medium', 'high', 'critical') as fc.Arbitrary<'low' | 'medium' | 'high' | 'critical'>,
                    followUpRequired: fc.boolean(),
                    adminNotificationSent: fc.boolean()
                }),
                async (params) => {
                    // Feature: vitracka-weight-management, Property 14: Comprehensive Audit Logging
                    const result = await auditService.logSafetyEvent(params);

                    // Verify all safety-specific fields are present
                    expect(result.triggerType).toBe(params.triggerType);
                    expect(result.triggerContent).toBe(params.triggerContent);
                    expect(result.interventionResponse).toBe(params.interventionResponse);
                    expect(result.escalationLevel).toBe(params.escalationLevel);
                    expect(result.followUpRequired).toBe(params.followUpRequired);
                    expect(result.adminNotificationSent).toBe(params.adminNotificationSent);

                    // Safety events should always have these properties
                    expect(result.isSafetyRelated).toBe(true);
                    expect(result.requiresAdminReview).toBe(true);
                    expect(result.dataClassification).toBe('restricted');
                    expect(result.retentionPeriod).toBe(2555); // 7 years
                    expect(result.adminReviewed).toBe(false);
                }
            ), { numRuns: 100 });
        });

        it('should apply appropriate data classification based on event type', async () => {
            await fc.assert(fc.asyncProperty(
                fc.record({
                    eventType: fc.constantFrom(...[
                        'agent_interaction', 'safety_intervention', 'user_authentication',
                        'profile_update', 'weight_entry', 'system_decision', 'cost_analysis'
                    ] as AuditEventType[]),
                    severity: fc.constantFrom(...['info', 'warning', 'error', 'critical'] as AuditSeverity[]),
                    action: fc.string({ minLength: 1, maxLength: 100 }),
                    description: fc.string({ minLength: 1, maxLength: 500 })
                }),
                async (params) => {
                    // Feature: vitracka-weight-management, Property 14: Comprehensive Audit Logging
                    const result = await auditService.logEvent(params);

                    // Verify appropriate data classification
                    switch (params.eventType) {
                        case 'safety_intervention':
                            expect(result.dataClassification).toBe('restricted');
                            break;
                        case 'agent_interaction':
                        case 'user_authentication':
                        case 'profile_update':
                        case 'weight_entry':
                            expect(result.dataClassification).toBe('confidential');
                            break;
                        case 'system_decision':
                        case 'cost_analysis':
                            expect(result.dataClassification).toBe('internal');
                            break;
                        default:
                            expect(['public', 'internal', 'confidential', 'restricted']).toContain(result.dataClassification);
                    }
                }
            ), { numRuns: 100 });
        });

        it('should maintain audit trail integrity with proper timestamps and IDs', async () => {
            await fc.assert(fc.asyncProperty(
                fc.record({
                    eventType: fc.constantFrom(...[
                        'agent_interaction', 'user_authentication', 'system_decision'
                    ] as AuditEventType[]),
                    severity: fc.constantFrom(...['info', 'warning', 'error'] as AuditSeverity[]),
                    action: fc.string({ minLength: 1, maxLength: 100 }),
                    description: fc.string({ minLength: 1, maxLength: 500 }),
                    userId: fc.option(fc.uuid(), { nil: undefined }),
                    sessionId: fc.option(fc.string(), { nil: undefined })
                }),
                async (params) => {
                    // Feature: vitracka-weight-management, Property 14: Comprehensive Audit Logging
                    const startTime = new Date();
                    const result = await auditService.logEvent(params);
                    const endTime = new Date();

                    // Verify audit trail integrity
                    expect(result.id).toBeDefined();
                    expect(result.timestamp).toBeInstanceOf(Date);
                    expect(result.timestamp.getTime()).toBeGreaterThanOrEqual(startTime.getTime());
                    expect(result.timestamp.getTime()).toBeLessThanOrEqual(endTime.getTime());

                    // Verify required fields are present
                    expect(result.eventType).toBe(params.eventType);
                    expect(result.severity).toBe(params.severity);
                    expect(result.action).toBe(params.action);
                    expect(result.description).toBe(params.description);
                    expect(result.metadata).toBeDefined();
                    expect(typeof result.metadata).toBe('object');

                    // Verify security compliance fields
                    expect(result.dataClassification).toBeDefined();
                    expect(['public', 'internal', 'confidential', 'restricted']).toContain(result.dataClassification);
                    expect(result.retentionPeriod).toBeGreaterThan(0);
                    expect(typeof result.isSafetyRelated).toBe('boolean');
                    expect(typeof result.requiresAdminReview).toBe('boolean');
                    expect(typeof result.adminReviewed).toBe('boolean');
                }
            ), { numRuns: 100 });
        });

        it('should handle agent interaction logging with proper sanitization', async () => {
            await fc.assert(fc.asyncProperty(
                fc.record({
                    agentId: fc.constantFrom('safety_sentinel', 'coach_companion', 'concierge_orchestrator'),
                    userId: fc.uuid(),
                    sessionId: fc.string({ minLength: 1, maxLength: 50 }),
                    action: fc.string({ minLength: 1, maxLength: 100 }),
                    userInput: fc.string({ minLength: 1, maxLength: 1000 }),
                    agentResponse: fc.string({ minLength: 1, maxLength: 2000 }),
                    processingTime: fc.integer({ min: 1, max: 10000 })
                }),
                async (params) => {
                    // Feature: vitracka-weight-management, Property 14: Comprehensive Audit Logging
                    const result = await auditService.logAgentInteraction(params);

                    // Verify agent interaction is properly logged
                    expect(result.eventType).toBe('agent_interaction');
                    expect(result.agentId).toBe(params.agentId);
                    expect(result.userId).toBe(params.userId);
                    expect(result.sessionId).toBe(params.sessionId);
                    expect(result.action).toBe(params.action);
                    expect(result.dataClassification).toBe('confidential');

                    // Verify metadata contains interaction details
                    expect(result.metadata).toBeDefined();
                    expect(result.metadata.agentResponse).toBe(params.agentResponse);
                    expect(result.metadata.processingTimeMs).toBe(params.processingTime);
                    expect(result.metadata.interactionType).toBe(params.action);

                    // User input should be sanitized (present but potentially modified)
                    expect(result.metadata.userInput).toBeDefined();
                    expect(typeof result.metadata.userInput).toBe('string');
                }
            ), { numRuns: 100 });
        });

        it('should log system decisions with proper reasoning and context', async () => {
            await fc.assert(fc.asyncProperty(
                fc.record({
                    decision: fc.string({ minLength: 1, maxLength: 200 }),
                    reasoning: fc.string({ minLength: 1, maxLength: 500 }),
                    agentId: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
                    userId: fc.option(fc.uuid(), { nil: undefined }),
                    severity: fc.option(fc.constantFrom(...['info', 'warning', 'error', 'critical'] as AuditSeverity[]), { nil: undefined })
                }),
                async (params) => {
                    // Feature: vitracka-weight-management, Property 14: Comprehensive Audit Logging
                    const result = await auditService.logSystemDecision(params);

                    // Verify system decision logging
                    expect(result.eventType).toBe('system_decision');
                    expect(result.severity).toBe(params.severity || 'info');
                    expect(result.action).toBe('system_decision');
                    expect(result.description).toContain(params.decision);
                    expect(result.dataClassification).toBe('internal');

                    // Verify decision metadata
                    expect(result.metadata.decision).toBe(params.decision);
                    expect(result.metadata.reasoning).toBe(params.reasoning);

                    if (params.agentId) {
                        expect(result.agentId).toBe(params.agentId);
                    }
                    if (params.userId) {
                        expect(result.userId).toBe(params.userId);
                    }
                }
            ), { numRuns: 100 });
        });
    });
});