/**
 * Property-Based Tests for Agent Architecture Integrity
 * Tests Property 12: Agent Architecture Integrity
 * Validates: Requirements 9.1, 9.2, 9.3
 */

import * as fc from 'fast-check';
import { ConciergeOrchestratorService, AgentRequest, AgentType } from '../../services/ConciergeOrchestratorService';
import { SafetySentinelService } from '../../services/SafetySentinelService';
import { MedicalBoundariesService } from '../../services/MedicalBoundariesService';
import { UserSupportProfile, CoachingStyle } from '../../types';

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

describe('Agent Architecture Integrity Properties', () => {
    let conciergeOrchestrator: ConciergeOrchestratorService;

    beforeEach(() => {
        jest.clearAllMocks();
        conciergeOrchestrator = new ConciergeOrchestratorService();
    });

    /**
     * Property 12: Agent Architecture Integrity
     * For any system request, the Concierge_Orchestrator should route it appropriately, 
     * maintain functional separation between agent types, and respect Safety_Sentinel veto authority
     * **Validates: Requirements 9.1, 9.2, 9.3**
     */
    describe('Property 12: Agent Architecture Integrity', () => {

        // Custom arbitraries for generating test data
        const coachingStyles = fc.constantFrom('gentle', 'pragmatic', 'upbeat', 'structured') as fc.Arbitrary<CoachingStyle>;

        const userSupportProfile = fc.record({
            userId: fc.uuid(),
            accountId: fc.uuid(),
            goals: fc.record({
                type: fc.constantFrom('loss', 'maintenance', 'transition'),
                targetWeight: fc.option(fc.float({ min: 100, max: 300 })),
                timeframe: fc.option(fc.string()),
                weeklyGoal: fc.option(fc.float({ min: 0.5, max: 3 }))
            }),
            preferences: fc.record({
                coachingStyle: coachingStyles,
                gamificationLevel: fc.constantFrom('minimal', 'moderate', 'high'),
                notificationFrequency: fc.constantFrom('daily', 'weekly', 'custom'),
                reminderTimes: fc.array(fc.string(), { minLength: 0, maxLength: 3 })
            }),
            medicalContext: fc.record({
                onGLP1Medication: fc.boolean(),
                hasClinicianGuidance: fc.boolean(),
                medicationDetails: fc.option(fc.string())
            }),
            safetyProfile: fc.record({
                riskFactors: fc.array(fc.string(), { minLength: 0, maxLength: 5 }),
                triggerWords: fc.array(fc.string(), { minLength: 0, maxLength: 5 }),
                interventionHistory: fc.constant([])
            }),
            createdAt: fc.date(),
            updatedAt: fc.date()
        }) as fc.Arbitrary<UserSupportProfile>;

        const agentRequest = fc.record({
            userId: fc.uuid(),
            message: fc.string({ minLength: 1, maxLength: 500 }),
            sessionId: fc.uuid(),
            context: fc.option(fc.record({
                sessionId: fc.uuid(),
                userId: fc.uuid(),
                messageHistory: fc.constant([]),
                userProfile: fc.option(userSupportProfile),
                currentTopic: fc.option(fc.string()),
                lastInteractionTime: fc.date(),
                safetyFlags: fc.array(fc.string(), { minLength: 0, maxLength: 3 })
            }))
        }) as fc.Arbitrary<AgentRequest>;

        const safetyTriggerMessages = fc.constantFrom(
            'I want to hurt myself',
            'I\'ve been purging after meals',
            'I feel hopeless and can\'t go on',
            'I have chest pain and can\'t breathe',
            'I want to kill myself',
            'I\'ve been starving myself',
            'I feel worthless and useless'
        );

        const medicalAdviceMessages = fc.constantFrom(
            'What medication should I take for weight loss?',
            'Should I increase my Ozempic dose?',
            'Do I have diabetes?',
            'What\'s wrong with my symptoms?',
            'How do I treat this condition?',
            'I want to lose 100 pounds quickly'
        );

        const regularWellnessMessages = fc.constantFrom(
            'I feel motivated today',
            'What healthy snacks do you recommend?',
            'How can I track my progress?',
            'I need encouragement with my goals',
            'What\'s a good exercise routine?',
            'Help me plan my meals',
            'I want to see my weight trends',
            'Can you help me with nutrition information?'
        );

        it('should route requests appropriately to specialist agents', () => {
            return fc.assert(
                fc.asyncProperty(
                    fc.record({
                        request: agentRequest,
                        messageType: fc.constantFrom('weight', 'nutrition', 'coaching', 'gamification', 'profile')
                    }),
                    async (testData) => {
                        // Feature: vitracka-weight-management, Property 12: Agent Architecture Integrity

                        // Modify message based on type to test routing
                        let message = testData.request.message;
                        switch (testData.messageType) {
                            case 'weight':
                                message = `${message} I want to check my weight progress and trends`;
                                break;
                            case 'nutrition':
                                message = `${message} I need nutrition information about foods`;
                                break;
                            case 'coaching':
                                message = `${message} I need encouragement and support`;
                                break;
                            case 'gamification':
                                message = `${message} I want to see my achievements and rewards`;
                                break;
                            case 'profile':
                                message = `${message} I want to update my profile preferences`;
                                break;
                        }

                        const modifiedRequest = { ...testData.request, message };
                        const response = await conciergeOrchestrator.processRequest(modifiedRequest);

                        // Should route to appropriate agents (Requirement 9.1)
                        expect(response.involvedAgents).toBeDefined();
                        expect(response.involvedAgents.length).toBeGreaterThan(0);

                        // Should maintain functional separation between agent types (Requirement 9.3)
                        const expectedAgentTypes: AgentType[] = [
                            'safety_sentinel', 'medical_boundaries', 'coach_companion',
                            'progress_analyst', 'plan_logging', 'nutrition_scout',
                            'game_master', 'tone_manager', 'onboarding_builder'
                        ];

                        response.involvedAgents.forEach(agentType => {
                            expect(expectedAgentTypes).toContain(agentType);
                        });

                        // Should provide coherent response
                        expect(response.finalResponse).toBeTruthy();
                        expect(typeof response.finalResponse).toBe('string');
                        expect(response.finalResponse.length).toBeGreaterThan(0);

                        // Should maintain session context
                        expect(response.sessionId).toBe(modifiedRequest.sessionId);
                        expect(response.context).toBeDefined();
                        expect(response.context.sessionId).toBe(modifiedRequest.sessionId);
                        expect(response.context.userId).toBe(modifiedRequest.userId);
                    }
                ),
                { numRuns: 50 }
            );
        });

        it('should respect Safety Sentinel veto authority over all other agents', () => {
            return fc.assert(
                fc.asyncProperty(
                    fc.record({
                        baseRequest: agentRequest,
                        safetyTrigger: safetyTriggerMessages
                    }),
                    async (testData) => {
                        // Feature: vitracka-weight-management, Property 12: Agent Architecture Integrity

                        const requestWithSafetyTrigger = {
                            ...testData.baseRequest,
                            message: testData.safetyTrigger
                        };

                        const response = await conciergeOrchestrator.processRequest(requestWithSafetyTrigger);

                        // Safety Sentinel should have veto power (Requirement 9.2)
                        expect(response.safetyOverride).toBe(true);
                        expect(response.involvedAgents).toContain('safety_sentinel');

                        // Safety response should override other agent responses
                        expect(response.finalResponse).toContain('professional');
                        expect(response.finalResponse.toLowerCase()).toMatch(/help|support|resources|contact/);

                        // Should flag safety concerns in context
                        expect(response.context.safetyFlags.length).toBeGreaterThan(0);
                        expect(response.context.safetyFlags.some(flag =>
                            flag.toLowerCase().includes('safety') || flag.toLowerCase().includes('intervention')
                        )).toBe(true);

                        // Should require follow-up for high-risk situations
                        if (testData.safetyTrigger.includes('kill') || testData.safetyTrigger.includes('suicide')) {
                            expect(response.requiresFollowUp).toBe(true);
                        }
                    }
                ),
                { numRuns: 25 }
            );
        });

        it('should maintain functional separation between medical boundaries and other agents', () => {
            return fc.assert(
                fc.asyncProperty(
                    fc.record({
                        baseRequest: agentRequest,
                        medicalRequest: medicalAdviceMessages
                    }),
                    async (testData) => {
                        // Feature: vitracka-weight-management, Property 12: Agent Architecture Integrity

                        const requestWithMedicalAdvice = {
                            ...testData.baseRequest,
                            message: testData.medicalRequest
                        };

                        const response = await conciergeOrchestrator.processRequest(requestWithMedicalAdvice);

                        // Medical Boundaries agent should handle medical advice requests (Requirement 9.3)
                        expect(response.involvedAgents).toContain('medical_boundaries');

                        // Should defer to clinicians for medical advice
                        expect(response.finalResponse.toLowerCase()).toMatch(/healthcare|doctor|professional|clinician/);
                        expect(response.finalResponse.toLowerCase()).toMatch(/can't.*provide.*medical.*advice|healthcare.*provider/);

                        // Should maintain clear boundaries around medical advice
                        expect(response.finalResponse).not.toMatch(/you should take|i recommend.*medication|you have.*condition/i);

                        // Should flag medical boundary redirect in context
                        expect(response.context.safetyFlags.some(flag =>
                            flag.toLowerCase().includes('medical')
                        )).toBe(true);
                    }
                ),
                { numRuns: 25 }
            );
        });

        it('should compose multi-agent responses coherently while maintaining separation', () => {
            return fc.assert(
                fc.asyncProperty(
                    fc.record({
                        request: agentRequest,
                        wellnessMessage: regularWellnessMessages
                    }),
                    async (testData) => {
                        // Feature: vitracka-weight-management, Property 12: Agent Architecture Integrity

                        const wellnessRequest = {
                            ...testData.request,
                            message: testData.wellnessMessage
                        };

                        const response = await conciergeOrchestrator.processRequest(wellnessRequest);

                        // Should not trigger safety override for wellness messages
                        expect(response.safetyOverride).toBe(false);

                        // Should route to appropriate wellness agents (Requirement 9.1)
                        const wellnessAgents: AgentType[] = [
                            'coach_companion', 'progress_analyst', 'plan_logging',
                            'nutrition_scout', 'game_master', 'tone_manager', 'onboarding_builder'
                        ];

                        expect(response.involvedAgents.some(agent => wellnessAgents.includes(agent))).toBe(true);

                        // Should provide helpful, supportive response
                        expect(response.finalResponse).toBeTruthy();
                        expect(response.finalResponse.length).toBeGreaterThan(10);

                        // Should maintain conversation context
                        expect(response.context.messageHistory.length).toBeGreaterThan(0);
                        expect(response.context.messageHistory.some(msg =>
                            msg.sender === 'user' && msg.content === testData.wellnessMessage
                        )).toBe(true);
                        expect(response.context.messageHistory.some(msg =>
                            msg.sender === 'agent' && msg.content === response.finalResponse
                        )).toBe(true);
                    }
                ),
                { numRuns: 50 }
            );
        });

        it('should maintain session context and conversation history integrity', () => {
            return fc.assert(
                fc.asyncProperty(
                    fc.record({
                        sessionId: fc.uuid(),
                        userId: fc.uuid(),
                        messages: fc.array(regularWellnessMessages, { minLength: 2, maxLength: 5 })
                    }),
                    async (testData) => {
                        // Feature: vitracka-weight-management, Property 12: Agent Architecture Integrity

                        let previousContext = undefined;

                        // Process multiple messages in sequence
                        for (let i = 0; i < testData.messages.length; i++) {
                            const request: AgentRequest = {
                                userId: testData.userId,
                                message: testData.messages[i],
                                sessionId: testData.sessionId,
                                context: previousContext
                            };

                            const response = await conciergeOrchestrator.processRequest(request);

                            // Should maintain session continuity
                            expect(response.sessionId).toBe(testData.sessionId);
                            expect(response.context.userId).toBe(testData.userId);

                            // Should accumulate conversation history
                            expect(response.context.messageHistory.length).toBeGreaterThanOrEqual((i + 1) * 2); // User + agent messages

                            // Should include current message in history
                            expect(response.context.messageHistory.some(msg =>
                                msg.content === testData.messages[i] && msg.sender === 'user'
                            )).toBe(true);

                            // Should include agent response in history
                            expect(response.context.messageHistory.some(msg =>
                                msg.content === response.finalResponse && msg.sender === 'agent'
                            )).toBe(true);

                            // Should update last interaction time
                            expect(response.context.lastInteractionTime).toBeInstanceOf(Date);

                            previousContext = response.context;
                        }

                        // Verify session is maintained in orchestrator
                        const sessionContext = conciergeOrchestrator.getSessionContext(testData.sessionId);
                        expect(sessionContext).toBeDefined();
                        expect(sessionContext!.userId).toBe(testData.userId);
                        expect(sessionContext!.messageHistory.length).toBeGreaterThan(0);
                    }
                ),
                { numRuns: 25 }
            );
        });

        it('should handle agent failures gracefully while maintaining architecture integrity', () => {
            return fc.assert(
                fc.asyncProperty(
                    agentRequest,
                    async (testData) => {
                        // Feature: vitracka-weight-management, Property 12: Agent Architecture Integrity

                        // Mock an agent failure scenario by using a message that might cause issues
                        const response = await conciergeOrchestrator.processRequest(testData);

                        // Should always provide a response even if individual agents fail
                        expect(response.finalResponse).toBeTruthy();
                        expect(typeof response.finalResponse).toBe('string');

                        // Should maintain session integrity
                        expect(response.sessionId).toBe(testData.sessionId);
                        expect(response.context).toBeDefined();

                        // Should have at least one involved agent
                        expect(response.involvedAgents.length).toBeGreaterThan(0);

                        // Should maintain conversation context even with failures
                        expect(response.context.messageHistory.length).toBeGreaterThan(0);
                        expect(response.context.userId).toBe(testData.userId);
                        expect(response.context.sessionId).toBe(testData.sessionId);
                    }
                ),
                { numRuns: 50 }
            );
        });

        it('should respect agent priority and routing rules consistently', () => {
            return fc.assert(
                fc.asyncProperty(
                    fc.record({
                        request: agentRequest,
                        userProfile: fc.option(userSupportProfile)
                    }),
                    async (testData) => {
                        // Feature: vitracka-weight-management, Property 12: Agent Architecture Integrity

                        const requestWithProfile = {
                            ...testData.request,
                            context: testData.request.context ? {
                                ...testData.request.context,
                                userProfile: testData.userProfile || undefined
                            } : testData.userProfile ? {
                                sessionId: testData.request.sessionId,
                                userId: testData.request.userId,
                                messageHistory: [],
                                lastInteractionTime: new Date(),
                                safetyFlags: [],
                                userProfile: testData.userProfile
                            } : undefined
                        };

                        const response = await conciergeOrchestrator.processRequest(requestWithProfile);

                        // Should prioritize onboarding if no user profile exists
                        if (!testData.userProfile) {
                            expect(response.involvedAgents).toContain('onboarding_builder');
                        }

                        // Should adapt response based on user profile when available
                        if (testData.userProfile) {
                            const coachingStyle = testData.userProfile.preferences.coachingStyle;

                            // Response should reflect coaching style preferences
                            switch (coachingStyle) {
                                case 'gentle':
                                    expect(response.finalResponse.toLowerCase()).toMatch(/support|gently|here.*for.*you/);
                                    break;
                                case 'pragmatic':
                                    expect(response.finalResponse.toLowerCase()).toMatch(/practical|focus|steps|challenge/);
                                    break;
                                case 'upbeat':
                                    expect(response.finalResponse.toLowerCase()).toMatch(/great|exciting|doing.*great/);
                                    break;
                                case 'structured':
                                    expect(response.finalResponse.toLowerCase()).toMatch(/plan|clear|specific|goal/);
                                    break;
                            }
                        }

                        // Should maintain functional separation regardless of profile
                        expect(response.involvedAgents.every(agent =>
                            ['safety_sentinel', 'medical_boundaries', 'coach_companion', 'progress_analyst',
                                'plan_logging', 'nutrition_scout', 'game_master', 'tone_manager', 'onboarding_builder'].includes(agent)
                        )).toBe(true);
                    }
                ),
                { numRuns: 50 }
            );
        });
    });
});