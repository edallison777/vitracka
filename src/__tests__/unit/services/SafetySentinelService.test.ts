/**
 * Unit Tests for Safety Sentinel Service
 * Tests specific trigger phrases and expected responses
 * Tests escalation levels and admin notifications
 * Tests veto power over other agent responses
 * Validates: Requirements 2.4, 2.5, 2.6
 */

import { SafetySentinelService } from '../../../services/SafetySentinelService';
import { SafetyInterventionRepository } from '../../../database/repositories/SafetyInterventionRepository';
import { TriggerType, EscalationLevel } from '../../../types';

// Mock the database connection
jest.mock('../../../database/connection', () => ({
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
jest.mock('../../../database/repositories/SafetyInterventionRepository');

describe('SafetySentinelService Unit Tests', () => {
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

    describe('Eating Disorder Trigger Detection', () => {
        it('should immediately intervene on purging language', async () => {
            const message = "I've been purging after every meal";
            const response = await safetySentinel.processMessage(message, 'user-123');

            expect(response.isIntervention).toBe(true);
            expect(response.triggerType).toBe('eating_disorder');
            expect(response.escalationLevel).toBe('high');
            expect(response.includesProfessionalHelp).toBe(true);
            expect(response.overridesOtherAgents).toBe(true);
            expect(response.response).toContain('National Eating Disorders Association');
            expect(response.adminNotificationRequired).toBe(true);

            expect(mockSafetyRepository.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    userId: 'user-123',
                    triggerType: 'eating_disorder',
                    escalationLevel: 'high',
                    followUpRequired: true
                })
            );
        });

        it('should detect bulimia and anorexia mentions', async () => {
            const bulimiaMessage = "I think I have bulimia";
            const anorexiaMessage = "My friend says I have anorexia";

            const bulimiaResponse = await safetySentinel.processMessage(bulimiaMessage, 'user-456');
            const anorexiaResponse = await safetySentinel.processMessage(anorexiaMessage, 'user-789');

            expect(bulimiaResponse.isIntervention).toBe(true);
            expect(bulimiaResponse.triggerType).toBe('eating_disorder');
            expect(anorexiaResponse.isIntervention).toBe(true);
            expect(anorexiaResponse.triggerType).toBe('eating_disorder');

            expect(mockSafetyRepository.create).toHaveBeenCalledTimes(2);
        });

        it('should handle medium-level eating disorder triggers', async () => {
            const message = "I've been skipping meals and barely eating";
            const response = await safetySentinel.processMessage(message, 'user-medium');

            expect(response.isIntervention).toBe(true);
            expect(response.triggerType).toBe('eating_disorder');
            expect(response.escalationLevel).toBe('medium');
            expect(response.adminNotificationRequired).toBe(false); // Medium level doesn't require admin notification
        });

        it('should handle low-level eating disorder triggers', async () => {
            const message = "I feel fat and hate my body";
            const response = await safetySentinel.processMessage(message, 'user-low');

            expect(response.isIntervention).toBe(true);
            expect(response.triggerType).toBe('eating_disorder');
            expect(response.escalationLevel).toBe('low');
            expect(response.adminNotificationRequired).toBe(false);
        });
    });

    describe('Self-Harm Trigger Detection', () => {
        it('should immediately intervene on suicide language with critical escalation', async () => {
            const message = "I want to kill myself";
            const response = await safetySentinel.processMessage(message, 'user-critical');

            expect(response.isIntervention).toBe(true);
            expect(response.triggerType).toBe('self_harm');
            expect(response.escalationLevel).toBe('critical');
            expect(response.includesProfessionalHelp).toBe(true);
            expect(response.overridesOtherAgents).toBe(true);
            expect(response.response).toContain('988'); // Crisis hotline
            expect(response.response).toContain('National Suicide Prevention Lifeline');
            expect(response.adminNotificationRequired).toBe(true);

            expect(mockSafetyRepository.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    userId: 'user-critical',
                    triggerType: 'self_harm',
                    escalationLevel: 'critical',
                    followUpRequired: true
                })
            );
        });

        it('should detect various suicide-related phrases', async () => {
            const phrases = [
                "I want to end it all",
                "I'm not worth living",
                "Everyone would be better off dead",
                "I want to die"
            ];

            for (const phrase of phrases) {
                const response = await safetySentinel.processMessage(phrase, 'user-test');
                expect(response.isIntervention).toBe(true);
                expect(response.triggerType).toBe('self_harm');
                expect(response.escalationLevel).toBe('critical');
                expect(response.adminNotificationRequired).toBe(true);
            }
        });

        it('should handle high-level self-harm triggers', async () => {
            const message = "I've been cutting myself";
            const response = await safetySentinel.processMessage(message, 'user-high');

            expect(response.isIntervention).toBe(true);
            expect(response.triggerType).toBe('self_harm');
            expect(response.escalationLevel).toBe('high');
            expect(response.adminNotificationRequired).toBe(true); // High self-harm requires admin notification
        });

        it('should handle medium-level self-harm triggers', async () => {
            const message = "I hate myself and feel worthless";
            const response = await safetySentinel.processMessage(message, 'user-medium');

            expect(response.isIntervention).toBe(true);
            expect(response.triggerType).toBe('self_harm');
            expect(response.escalationLevel).toBe('medium');
            expect(response.adminNotificationRequired).toBe(false);
        });
    });

    describe('Depression Trigger Detection', () => {
        it('should detect high-level depression triggers', async () => {
            const message = "I feel hopeless and can't go on";
            const response = await safetySentinel.processMessage(message, 'user-depression');

            expect(response.isIntervention).toBe(true);
            expect(response.triggerType).toBe('depression');
            expect(response.escalationLevel).toBe('high');
            expect(response.includesProfessionalHelp).toBe(true);
            expect(response.response).toContain('National Alliance on Mental Illness');
            expect(response.adminNotificationRequired).toBe(true);
        });

        it('should handle medium-level depression triggers', async () => {
            const message = "I'm depressed and sad all the time";
            const response = await safetySentinel.processMessage(message, 'user-medium-dep');

            expect(response.isIntervention).toBe(true);
            expect(response.triggerType).toBe('depression');
            expect(response.escalationLevel).toBe('medium');
            expect(response.adminNotificationRequired).toBe(false);
        });

        it('should handle low-level depression triggers', async () => {
            const message = "I'm feeling down and unmotivated";
            const response = await safetySentinel.processMessage(message, 'user-low-dep');

            expect(response.isIntervention).toBe(true);
            expect(response.triggerType).toBe('depression');
            expect(response.escalationLevel).toBe('low');
            expect(response.adminNotificationRequired).toBe(false);
        });
    });

    describe('Medical Emergency Trigger Detection', () => {
        it('should immediately intervene on medical emergency language', async () => {
            const message = "I'm having chest pain and can't breathe";
            const response = await safetySentinel.processMessage(message, 'user-emergency');

            expect(response.isIntervention).toBe(true);
            expect(response.triggerType).toBe('medical_emergency');
            expect(response.includesProfessionalHelp).toBe(true);
            expect(response.overridesOtherAgents).toBe(true);
            expect(response.response).toContain('911');
            expect(response.response).toContain('emergency room');
            expect(response.adminNotificationRequired).toBe(true);
        });

        it('should detect various medical emergency phrases', async () => {
            const phrases = [
                "severe pain in my chest",
                "heart racing and dizzy",
                "allergic reaction to medication",
                "severe nausea and fainting"
            ];

            for (const phrase of phrases) {
                const response = await safetySentinel.processMessage(phrase, 'user-medical');
                expect(response.isIntervention).toBe(true);
                expect(response.triggerType).toBe('medical_emergency');
                expect(response.adminNotificationRequired).toBe(true);
            }
        });
    });

    describe('Trigger Priority and Escalation', () => {
        it('should prioritize medical emergencies over other triggers', async () => {
            const message = "I'm having chest pain and feel depressed";
            const response = await safetySentinel.processMessage(message, 'user-priority');

            expect(response.triggerType).toBe('medical_emergency');
            expect(response.response).toContain('911');
        });

        it('should prioritize self-harm over eating disorder triggers', async () => {
            const message = "I want to hurt myself and have been purging";
            const response = await safetySentinel.processMessage(message, 'user-priority2');

            expect(response.triggerType).toBe('self_harm');
        });

        it('should prioritize higher escalation levels within same trigger type', async () => {
            const message = "I want to kill myself and hate myself";
            const response = await safetySentinel.processMessage(message, 'user-escalation');

            expect(response.triggerType).toBe('self_harm');
            expect(response.escalationLevel).toBe('critical'); // Should pick the highest level
        });
    });

    describe('Veto Power Over Other Agents', () => {
        it('should veto responses when original message contains safety triggers', async () => {
            const originalMessage = "I've been purging after meals";
            const coachResponse = "Great job on your progress! Keep up the good work!";

            const vetoResult = await safetySentinel.vetoResponse(
                coachResponse,
                originalMessage,
                'user-veto'
            );

            expect(vetoResult.shouldVeto).toBe(true);
            expect(vetoResult.vetoReason).toContain('Safety intervention required');
            expect(vetoResult.vetoReason).toContain('eating_disorder');
            expect(vetoResult.alternativeResponse).toContain('professional');
        });

        it('should veto responses that contain safety triggers themselves', async () => {
            const originalMessage = "How can I lose weight faster?";
            const unsafeResponse = "You should try starving yourself for a few days";

            const vetoResult = await safetySentinel.vetoResponse(
                unsafeResponse,
                originalMessage,
                'user-unsafe'
            );

            expect(vetoResult.shouldVeto).toBe(true);
            expect(vetoResult.vetoReason).toContain('Response contains safety triggers');
            expect(vetoResult.alternativeResponse).toContain('healthcare professional');
        });

        it('should not veto safe responses to safe messages', async () => {
            const originalMessage = "I'm feeling motivated about my weight loss journey";
            const safeResponse = "That's wonderful! Motivation is key to sustainable progress.";

            const vetoResult = await safetySentinel.vetoResponse(
                safeResponse,
                originalMessage,
                'user-safe'
            );

            expect(vetoResult.shouldVeto).toBe(false);
        });
    });

    describe('Case Sensitivity and Edge Cases', () => {
        it('should detect triggers regardless of case', async () => {
            const messages = [
                "I've been PURGING after meals",
                "i want to kill myself",
                "I Feel Hopeless",
                "CHEST PAIN and can't breathe"
            ];

            for (const message of messages) {
                const response = await safetySentinel.processMessage(message, 'user-case');
                expect(response.isIntervention).toBe(true);
            }
        });

        it('should handle empty or whitespace messages', async () => {
            const emptyResponse = await safetySentinel.processMessage('', 'user-empty');
            const whitespaceResponse = await safetySentinel.processMessage('   ', 'user-whitespace');

            expect(emptyResponse.isIntervention).toBe(false);
            expect(whitespaceResponse.isIntervention).toBe(false);
        });

        it('should handle messages without userId', async () => {
            const message = "I want to hurt myself";
            const response = await safetySentinel.processMessage(message);

            expect(response.isIntervention).toBe(true);
            expect(response.triggerType).toBe('self_harm');
            // Should not attempt to log without userId
            expect(mockSafetyRepository.create).not.toHaveBeenCalled();
        });

        it('should handle database logging failures gracefully', async () => {
            mockSafetyRepository.create.mockRejectedValue(new Error('Database error'));

            const message = "I've been purging";
            const response = await safetySentinel.processMessage(message, 'user-db-error');

            // Should still return intervention response even if logging fails
            expect(response.isIntervention).toBe(true);
            expect(response.triggerType).toBe('eating_disorder');
        });
    });

    describe('Safe Messages', () => {
        it('should not intervene on normal weight management discussions', async () => {
            const safeMessages = [
                "I'm trying to eat healthier",
                "I want to lose weight gradually",
                "I'm tracking my calories",
                "I feel good about my progress",
                "I'm working with a nutritionist"
            ];

            for (const message of safeMessages) {
                const response = await safetySentinel.processMessage(message, 'user-safe');
                expect(response.isIntervention).toBe(false);
                expect(response.overridesOtherAgents).toBe(false);
                expect(response.response).toBe('');
            }

            expect(mockSafetyRepository.create).not.toHaveBeenCalled();
        });

        it('should not intervene on positive emotional expressions', async () => {
            const positiveMessages = [
                "I'm feeling great today",
                "I'm motivated and excited",
                "I love my new healthy habits",
                "I'm proud of my progress"
            ];

            for (const message of positiveMessages) {
                const response = await safetySentinel.processMessage(message, 'user-positive');
                expect(response.isIntervention).toBe(false);
            }
        });
    });

    describe('Response Content Validation', () => {
        it('should include appropriate resources for eating disorder interventions', async () => {
            const message = "I've been binging and purging";
            const response = await safetySentinel.processMessage(message, 'user-resources');

            expect(response.response).toContain('National Eating Disorders Association');
            expect(response.response).toContain('1-800-931-2237');
            expect(response.response).toContain('nationaleatingdisorders.org');
            expect(response.response).toContain('healthcare provider');
        });

        it('should include crisis resources for critical self-harm interventions', async () => {
            const message = "I want to end it all";
            const response = await safetySentinel.processMessage(message, 'user-crisis');

            expect(response.response).toContain('National Suicide Prevention Lifeline');
            expect(response.response).toContain('988');
            expect(response.response).toContain('Crisis Text Line');
            expect(response.response).toContain('741741');
            expect(response.response).toContain('911');
            expect(response.response).toContain('emergency room');
        });

        it('should include mental health resources for depression interventions', async () => {
            const message = "I feel hopeless and empty inside";
            const response = await safetySentinel.processMessage(message, 'user-mental-health');

            expect(response.response).toContain('National Alliance on Mental Illness');
            expect(response.response).toContain('1-800-950-6264');
            expect(response.response).toContain('Psychology Today');
            expect(response.response).toContain('primary care doctor');
        });

        it('should include medical resources for medical emergency interventions', async () => {
            const message = "I'm having severe chest pain";
            const response = await safetySentinel.processMessage(message, 'user-medical-emergency');

            expect(response.response).toContain('healthcare provider immediately');
            expect(response.response).toContain('911');
            expect(response.response).toContain('emergency room');
            expect(response.response).toContain('Don\'t delay seeking medical care');
        });
    });
});
