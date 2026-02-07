/**
 * Property-Based Tests for Safety Intervention Authority
 * Tests Property 3: Safety Intervention Authority
 * Validates: Requirements 2.4, 2.5, 2.6, 11.3
 */

import * as fc from 'fast-check';
import { SafetySentinelService } from '../../services/SafetySentinelService';
import { SafetyInterventionRepository } from '../../database/repositories/SafetyInterventionRepository';
import { TriggerType, EscalationLevel } from '../../types';

// Mock the database connection
jest.mock('../../database/connection', () => ({
    default: {
        getInstance: jest.fn(() => ({
            query: jest.fn(),
            getPool: jest.fn(),
            close: jest.fn(),
            testConnection: jest.fn()
        }))
    }
}));

// Mock the SafetyInterventionRepository
jest.mock('../../database/repositories/SafetyInterventionRepository');

describe('Safety Intervention Authority Properties', () => {
    let safetySentinel: SafetySentinelService;
    let mockSafetyRepository: jest.Mocked<SafetyInterventionRepository>;

    beforeEach(() => {
        jest.clearAllMocks();

        // Create mock repository
        mockSafetyRepository = new SafetyInterventionRepository() as jest.Mocked<SafetyInterventionRepository>;

        // Create service
        safetySentinel = new SafetySentinelService();

        // Inject mock repository
        (safetySentinel as any).safetyRepository = mockSafetyRepository;

        // Mock successful intervention logging
        mockSafetyRepository.create.mockResolvedValue({
            id: 'test-intervention-id',
            userId: 'test-user-id',
            triggerType: 'eating_disorder',
            triggerContent: 'test message',
            agentResponse: 'test response',
            escalationLevel: 'high',
            adminNotified: true,
            followUpRequired: true,
            timestamp: new Date()
        });
    });

    /**
     * Property 3: Safety Intervention Authority
     * For any user input containing safety trigger words (eating disorder, self-harm, 
     * depression indicators), the Safety_Sentinel should detect the signal, generate 
     * an appropriate intervention response, override any conflicting agent responses, 
     * and create a mandatory audit log entry
     * **Validates: Requirements 2.4, 2.5, 2.6, 11.3**
     */
    describe('Property 3: Safety Intervention Authority', () => {
        // Custom arbitraries for generating safety trigger content
        const eatingDisorderTriggers = fc.constantFrom(
            'purge', 'purging', 'throw up', 'vomit', 'bulimia', 'anorexia',
            'starve', 'starving', 'fasting', 'restrict', 'restricting',
            'binge', 'binging', 'laxative', 'diet pill', 'skip meals',
            'not eating', 'barely eating', 'obsessed with weight'
        );

        const selfHarmTriggers = fc.constantFrom(
            'kill myself', 'suicide', 'end it all', 'not worth living',
            'better off dead', 'want to die', 'hurt myself', 'cut myself',
            'harm myself', 'self harm', 'cutting', 'burning myself',
            'hate myself', 'worthless', 'useless', 'failure'
        );

        const depressionTriggers = fc.constantFrom(
            'hopeless', 'can\'t go on', 'nothing matters', 'empty inside',
            'numb', 'can\'t feel anything', 'no point', 'depressed',
            'sad all the time', 'can\'t sleep', 'no energy', 'giving up'
        );

        const medicalEmergencyTriggers = fc.constantFrom(
            'chest pain', 'can\'t breathe', 'heart racing', 'dizzy and weak',
            'severe pain', 'emergency', 'call 911', 'medication side effects',
            'allergic reaction', 'severe nausea', 'fainting'
        );

        const allSafetyTriggers = fc.oneof(
            eatingDisorderTriggers,
            selfHarmTriggers,
            depressionTriggers,
            medicalEmergencyTriggers
        );

        it('should detect and intervene on eating disorder triggers', () => {
            return fc.assert(
                fc.asyncProperty(
                    fc.record({
                        triggerWord: eatingDisorderTriggers,
                        contextBefore: fc.string({ minLength: 0, maxLength: 50 }),
                        contextAfter: fc.string({ minLength: 0, maxLength: 50 }),
                        userId: fc.uuid()
                    }),
                    async (testData) => {
                        // Feature: vitracka-weight-management, Property 3: Safety Intervention Authority

                        const message = `${testData.contextBefore} ${testData.triggerWord} ${testData.contextAfter}`.trim();
                        const response = await safetySentinel.processMessage(message, testData.userId);

                        // Should detect intervention is needed
                        expect(response.isIntervention).toBe(true);

                        // Should include professional help resources
                        expect(response.includesProfessionalHelp).toBe(true);
                        expect(response.response).toContain('professional');

                        // Should override other agents
                        expect(response.overridesOtherAgents).toBe(true);

                        // Should have appropriate escalation level
                        expect(response.escalationLevel).toBeDefined();
                        expect(['low', 'medium', 'high', 'critical']).toContain(response.escalationLevel);

                        // Should identify correct trigger type
                        expect(response.triggerType).toBe('eating_disorder');

                        // Should create audit log entry (verify repository was called)
                        expect(mockSafetyRepository.create).toHaveBeenCalledWith(
                            expect.objectContaining({
                                userId: testData.userId,
                                triggerType: 'eating_disorder',
                                triggerContent: message,
                                agentResponse: response.response
                            })
                        );
                    }
                ),
                { numRuns: 25 }
            );
        });

        it('should detect and intervene on self-harm triggers with appropriate escalation', () => {
            return fc.assert(
                fc.asyncProperty(
                    fc.record({
                        triggerWord: selfHarmTriggers,
                        contextBefore: fc.string({ minLength: 0, maxLength: 50 }),
                        contextAfter: fc.string({ minLength: 0, maxLength: 50 }),
                        userId: fc.uuid()
                    }),
                    async (testData) => {
                        // Feature: vitracka-weight-management, Property 3: Safety Intervention Authority

                        const message = `${testData.contextBefore} ${testData.triggerWord} ${testData.contextAfter}`.trim();
                        const response = await safetySentinel.processMessage(message, testData.userId);

                        // Should detect intervention is needed
                        expect(response.isIntervention).toBe(true);

                        // Should include professional help resources
                        expect(response.includesProfessionalHelp).toBe(true);

                        // Should override other agents
                        expect(response.overridesOtherAgents).toBe(true);

                        // Should identify correct trigger type
                        expect(response.triggerType).toBe('self_harm');

                        // Critical self-harm triggers should require admin notification
                        const criticalTriggers = ['kill myself', 'suicide', 'end it all', 'not worth living', 'better off dead', 'want to die'];
                        if (criticalTriggers.includes(testData.triggerWord)) {
                            expect(response.escalationLevel).toBe('critical');
                            expect(response.adminNotificationRequired).toBe(true);
                            expect(response.response).toContain('988'); // Crisis hotline
                        }

                        // Should create audit log entry
                        expect(mockSafetyRepository.create).toHaveBeenCalledWith(
                            expect.objectContaining({
                                userId: testData.userId,
                                triggerType: 'self_harm',
                                triggerContent: message,
                                agentResponse: response.response
                            })
                        );
                    }
                ),
                { numRuns: 25 }
            );
        });

        it('should detect and intervene on depression triggers', () => {
            return fc.assert(
                fc.asyncProperty(
                    fc.record({
                        triggerWord: depressionTriggers,
                        contextBefore: fc.string({ minLength: 0, maxLength: 50 }),
                        contextAfter: fc.string({ minLength: 0, maxLength: 50 }),
                        userId: fc.uuid()
                    }),
                    async (testData) => {
                        // Feature: vitracka-weight-management, Property 3: Safety Intervention Authority

                        const message = `${testData.contextBefore} ${testData.triggerWord} ${testData.contextAfter}`.trim();
                        const response = await safetySentinel.processMessage(message, testData.userId);

                        // Should detect intervention is needed
                        expect(response.isIntervention).toBe(true);

                        // Should include professional help resources
                        expect(response.includesProfessionalHelp).toBe(true);
                        expect(response.response).toContain('mental health');

                        // Should override other agents
                        expect(response.overridesOtherAgents).toBe(true);

                        // Should identify correct trigger type
                        expect(response.triggerType).toBe('depression');

                        // Should create audit log entry
                        expect(mockSafetyRepository.create).toHaveBeenCalledWith(
                            expect.objectContaining({
                                userId: testData.userId,
                                triggerType: 'depression',
                                triggerContent: message,
                                agentResponse: response.response
                            })
                        );
                    }
                ),
                { numRuns: 25 }
            );
        });

        it('should detect and intervene on medical emergency triggers', () => {
            return fc.assert(
                fc.asyncProperty(
                    fc.record({
                        triggerWord: medicalEmergencyTriggers,
                        contextBefore: fc.string({ minLength: 0, maxLength: 50 }),
                        contextAfter: fc.string({ minLength: 0, maxLength: 50 }),
                        userId: fc.uuid()
                    }),
                    async (testData) => {
                        // Feature: vitracka-weight-management, Property 3: Safety Intervention Authority

                        const message = `${testData.contextBefore} ${testData.triggerWord} ${testData.contextAfter}`.trim();
                        const response = await safetySentinel.processMessage(message, testData.userId);

                        // Should detect intervention is needed
                        expect(response.isIntervention).toBe(true);

                        // Should include professional help resources
                        expect(response.includesProfessionalHelp).toBe(true);
                        expect(response.response).toContain('medical');

                        // Should override other agents
                        expect(response.overridesOtherAgents).toBe(true);

                        // Should identify correct trigger type
                        expect(response.triggerType).toBe('medical_emergency');

                        // Medical emergencies should require admin notification
                        expect(response.adminNotificationRequired).toBe(true);

                        // Should create audit log entry
                        expect(mockSafetyRepository.create).toHaveBeenCalledWith(
                            expect.objectContaining({
                                userId: testData.userId,
                                triggerType: 'medical_emergency',
                                triggerContent: message,
                                agentResponse: response.response
                            })
                        );
                    }
                ),
                { numRuns: 25 }
            );
        });

        it('should not intervene on safe messages without triggers', () => {
            return fc.assert(
                fc.asyncProperty(
                    fc.record({
                        message: fc.string({ minLength: 1, maxLength: 200 })
                            .filter(msg => {
                                const lowerMsg = msg.toLowerCase();
                                // Filter out messages that contain any safety triggers
                                const allTriggers = [
                                    'purge', 'starve', 'binge', 'suicide', 'kill myself', 'hurt myself',
                                    'hopeless', 'depressed', 'chest pain', 'emergency', 'worthless',
                                    'cut myself', 'harm myself', 'end it all', 'not worth living'
                                ];
                                return !allTriggers.some(trigger => lowerMsg.includes(trigger));
                            }),
                        userId: fc.uuid()
                    }),
                    async (testData) => {
                        // Feature: vitracka-weight-management, Property 3: Safety Intervention Authority

                        const response = await safetySentinel.processMessage(testData.message, testData.userId);

                        // Should not detect intervention needed
                        expect(response.isIntervention).toBe(false);

                        // Should not include professional help
                        expect(response.includesProfessionalHelp).toBe(false);

                        // Should not override other agents
                        expect(response.overridesOtherAgents).toBe(false);

                        // Should have empty response
                        expect(response.response).toBe('');

                        // Should not require admin notification
                        expect(response.adminNotificationRequired).toBe(false);

                        // Should not create audit log entry
                        expect(mockSafetyRepository.create).not.toHaveBeenCalled();
                    }
                ),
                { numRuns: 50 }
            );
        });

        it('should properly veto unsafe agent responses', () => {
            return fc.assert(
                fc.asyncProperty(
                    fc.record({
                        originalMessage: fc.oneof(
                            fc.constant("I've been purging after meals"),
                            fc.constant("I want to hurt myself"),
                            fc.constant("I feel hopeless and can't go on")
                        ),
                        unsafeResponse: fc.string({ minLength: 10, maxLength: 100 }),
                        userId: fc.uuid()
                    }),
                    async (testData) => {
                        // Feature: vitracka-weight-management, Property 3: Safety Intervention Authority

                        const vetoResult = await safetySentinel.vetoResponse(
                            testData.unsafeResponse,
                            testData.originalMessage,
                            testData.userId
                        );

                        // Should veto the response due to safety triggers in original message
                        expect(vetoResult.shouldVeto).toBe(true);

                        // Should provide veto reason
                        expect(vetoResult.vetoReason).toBeDefined();
                        expect(vetoResult.vetoReason).toContain('Safety intervention required');

                        // Should provide alternative response
                        expect(vetoResult.alternativeResponse).toBeDefined();
                        expect(vetoResult.alternativeResponse).toContain('professional');
                    }
                ),
                { numRuns: 25 }
            );
        });

        it('should handle case-insensitive trigger detection', () => {
            return fc.assert(
                fc.asyncProperty(
                    fc.record({
                        triggerWord: allSafetyTriggers,
                        caseVariation: fc.constantFrom('upper', 'lower', 'mixed', 'title'),
                        userId: fc.uuid()
                    }),
                    async (testData) => {
                        // Feature: vitracka-weight-management, Property 3: Safety Intervention Authority

                        let modifiedTrigger: string;
                        switch (testData.caseVariation) {
                            case 'upper':
                                modifiedTrigger = testData.triggerWord.toUpperCase();
                                break;
                            case 'lower':
                                modifiedTrigger = testData.triggerWord.toLowerCase();
                                break;
                            case 'title':
                                modifiedTrigger = testData.triggerWord.charAt(0).toUpperCase() + testData.triggerWord.slice(1);
                                break;
                            case 'mixed':
                                modifiedTrigger = testData.triggerWord
                                    .split('')
                                    .map((char, i) => i % 2 === 0 ? char.toUpperCase() : char.toLowerCase())
                                    .join('');
                                break;
                            default:
                                modifiedTrigger = testData.triggerWord;
                        }

                        const message = `I have been ${modifiedTrigger} lately`;
                        const response = await safetySentinel.processMessage(message, testData.userId);

                        // Should detect intervention regardless of case
                        expect(response.isIntervention).toBe(true);
                        expect(response.overridesOtherAgents).toBe(true);
                        expect(response.includesProfessionalHelp).toBe(true);
                    }
                ),
                { numRuns: 50 }
            );
        });

        it('should maintain audit trail integrity for all interventions', () => {
            return fc.assert(
                fc.asyncProperty(
                    fc.record({
                        triggerWord: allSafetyTriggers,
                        message: fc.string({ minLength: 0, maxLength: 100 }),
                        userId: fc.uuid()
                    }),
                    async (testData) => {
                        // Feature: vitracka-weight-management, Property 3: Safety Intervention Authority

                        // Clear mock calls before each test
                        mockSafetyRepository.create.mockClear();

                        const fullMessage = `${testData.message} ${testData.triggerWord}`.trim();
                        const response = await safetySentinel.processMessage(fullMessage, testData.userId);

                        if (response.isIntervention) {
                            // Should create audit log entry with all required fields
                            expect(mockSafetyRepository.create).toHaveBeenCalledWith(
                                expect.objectContaining({
                                    userId: testData.userId,
                                    triggerType: expect.any(String),
                                    triggerContent: fullMessage,
                                    agentResponse: expect.any(String),
                                    escalationLevel: expect.any(String),
                                    adminNotified: expect.any(Boolean),
                                    followUpRequired: expect.any(Boolean)
                                })
                            );

                            // Verify the logged data matches the response
                            const loggedIntervention = mockSafetyRepository.create.mock.calls[0][0];
                            expect(loggedIntervention.triggerType).toBe(response.triggerType);
                            expect(loggedIntervention.escalationLevel).toBe(response.escalationLevel);
                            expect(loggedIntervention.agentResponse).toBe(response.response);
                            expect(loggedIntervention.adminNotified).toBe(response.adminNotificationRequired);
                        }
                    }
                ),
                { numRuns: 50 }
            );
        });
    });
});