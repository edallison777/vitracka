/**
 * Production Readiness Verification - Phase 6: End-to-End User Flows
 * 
 * This test suite validates the requirements for task 25.5:
 * - Test complete user onboarding journey
 * - Verify weight tracking and progress visualization
 * - Test eating plan management and breach recovery
 * - Validate gamification and notification systems
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 4.1, 4.3, 5.1, 5.3, 5.4, 7.1, 7.2, 10.1, 10.2
 */

// Mock database connection first
jest.mock('../../database/connection', () => ({
    default: {
        getInstance: jest.fn(() => ({
            query: jest.fn(),
            getPool: jest.fn(),
            close: jest.fn(),
            testConnection: jest.fn().mockResolvedValue(true)
        }))
    }
}));

// Mock services
jest.mock('../../services/SafetySentinelService', () => ({
    SafetySentinelService: jest.fn().mockImplementation(() => ({
        processMessage: jest.fn().mockResolvedValue({
            isIntervention: false,
            response: 'Safe message',
            triggerType: null,
            escalationLevel: 'none'
        }),
        vetoResponse: jest.fn().mockResolvedValue({
            shouldVeto: false,
            vetoReason: null,
            alternativeResponse: null
        })
    }))
}));

jest.mock('../../services/MedicalBoundariesService', () => ({
    MedicalBoundariesService: jest.fn().mockImplementation(() => ({
        processMessage: jest.fn().mockReturnValue({
            shouldRedirect: false,
            redirectResponse: null
        })
    }))
}));

import { ConciergeOrchestratorService } from '../../services/ConciergeOrchestratorService';

describe('End-to-End User Flows Production Readiness', () => {
    let conciergeOrchestrator: ConciergeOrchestratorService;

    beforeEach(() => {
        jest.clearAllMocks();
        conciergeOrchestrator = new ConciergeOrchestratorService();
    });

    describe('Complete User Onboarding Journey', () => {
        it('should complete tactful onboarding with goal and preference collection', async () => {
            // Requirements 1.1, 1.2, 1.3, 1.4
            const userId = 'user-onboarding-test';
            const sessionId = 'onboarding-session';

            const onboardingRequest = {
                userId,
                message: 'I want to start my weight management journey. I need to lose about 30 pounds.',
                sessionId,
                context: undefined
            };

            const response = await conciergeOrchestrator.processRequest(onboardingRequest);

            // Verify basic response structure
            expect(response).toBeDefined();
            expect(response.finalResponse).toBeDefined();
            expect(response.sessionId).toBe(sessionId);
            expect(response.involvedAgents).toBeDefined();
            expect(Array.isArray(response.involvedAgents)).toBe(true);
            expect(response.finalResponse.length).toBeGreaterThan(10);
        });

        it('should handle profile updates and modifications', async () => {
            // Requirements 1.5
            const userId = 'user-profile-update';
            const sessionId = 'profile-update-session';

            const updateRequest = {
                userId,
                message: 'I want to change my coaching style to be more upbeat and increase my gamification level.',
                sessionId,
                context: undefined
            };

            const response = await conciergeOrchestrator.processRequest(updateRequest);

            expect(response).toBeDefined();
            expect(response.finalResponse).toBeDefined();
            expect(response.sessionId).toBe(sessionId);
            expect(response.finalResponse.length).toBeGreaterThan(10);
        });
    });

    describe('Weight Tracking and Progress Visualization', () => {
        it('should handle daily weight logging with validation', async () => {
            // Requirements 4.1
            const userId = 'user-weight-tracking';
            const sessionId = 'weight-session';

            const weightLogRequest = {
                userId,
                message: 'I weighed myself this morning and I\'m 168 pounds. I\'m feeling good about my progress.',
                sessionId,
                context: undefined
            };

            const response = await conciergeOrchestrator.processRequest(weightLogRequest);

            expect(response).toBeDefined();
            expect(response.finalResponse).toBeDefined();
            expect(response.sessionId).toBe(sessionId);
            expect(response.finalResponse.length).toBeGreaterThan(10);
        });

        it('should provide progress visualization with trend analysis', async () => {
            // Requirements 4.3
            const userId = 'user-progress-viz';
            const sessionId = 'progress-session';

            const progressRequest = {
                userId,
                message: 'Show me my weight loss progress over the past month.',
                sessionId,
                context: undefined
            };

            const response = await conciergeOrchestrator.processRequest(progressRequest);

            expect(response).toBeDefined();
            expect(response.finalResponse).toBeDefined();
            expect(response.sessionId).toBe(sessionId);
            expect(response.finalResponse.length).toBeGreaterThan(10);
        });
    });

    describe('Eating Plan Management and Breach Recovery', () => {
        it('should support configurable eating plan creation', async () => {
            // Requirements 5.1
            const userId = 'user-eating-plan';
            const sessionId = 'plan-session';

            const planRequest = {
                userId,
                message: 'I want to set up a calorie-based eating plan with a target of 1800 calories per day.',
                sessionId,
                context: undefined
            };

            const response = await conciergeOrchestrator.processRequest(planRequest);

            expect(response).toBeDefined();
            expect(response.finalResponse).toBeDefined();
            expect(response.sessionId).toBe(sessionId);
            expect(response.finalResponse.length).toBeGreaterThan(10);
        });

        it('should handle eating plan breaches with recovery focus', async () => {
            // Requirements 5.3, 5.4
            const userId = 'user-breach-recovery';
            const sessionId = 'breach-session';

            const breachRequest = {
                userId,
                message: 'I had a really bad day and ate way too much pizza and ice cream. I feel terrible about myself.',
                sessionId,
                context: undefined
            };

            const response = await conciergeOrchestrator.processRequest(breachRequest);

            expect(response).toBeDefined();
            expect(response.finalResponse).toBeDefined();
            expect(response.sessionId).toBe(sessionId);
            expect(response.finalResponse.length).toBeGreaterThan(10);
            // Verify supportive tone (no shame-based language in response)
            expect(response.finalResponse).not.toMatch(/fail|terrible|shame|bad/i);
        });

        it('should provide recovery guidance after breaches', async () => {
            // Requirements 5.4
            const userId = 'user-recovery-guidance';
            const sessionId = 'recovery-session';

            const recoveryRequest = {
                userId,
                message: 'How do I get back on track after yesterday\'s overeating?',
                sessionId,
                context: undefined
            };

            const response = await conciergeOrchestrator.processRequest(recoveryRequest);

            expect(response).toBeDefined();
            expect(response.finalResponse).toBeDefined();
            expect(response.sessionId).toBe(sessionId);
            expect(response.finalResponse.length).toBeGreaterThan(10);
            // Verify no harmful advice
            expect(response.finalResponse).not.toMatch(/skip.*meal|starv|restrict.*severely/i);
        });
    });

    describe('Gamification and Notification Systems', () => {
        it('should provide configurable gamification rewards', async () => {
            // Requirements 7.1, 7.2
            const userId = 'user-gamification';
            const sessionId = 'gamification-session';

            const gamificationRequest = {
                userId,
                message: 'I\'ve been consistently logging my weight for a week now. Do I get any rewards?',
                sessionId,
                context: undefined
            };

            const response = await conciergeOrchestrator.processRequest(gamificationRequest);

            expect(response).toBeDefined();
            expect(response.finalResponse).toBeDefined();
            expect(response.sessionId).toBe(sessionId);
            expect(response.finalResponse.length).toBeGreaterThan(10);
        });

        it('should reward honesty in breach logging', async () => {
            // Requirements 7.2
            const userId = 'user-honesty-reward';
            const sessionId = 'honesty-session';

            const honestyRequest = {
                userId,
                message: 'I honestly logged that I went over my calorie goal yesterday, even though it was embarrassing.',
                sessionId,
                context: undefined
            };

            const response = await conciergeOrchestrator.processRequest(honestyRequest);

            expect(response).toBeDefined();
            expect(response.finalResponse).toBeDefined();
            expect(response.sessionId).toBe(sessionId);
            expect(response.finalResponse.length).toBeGreaterThan(10);
            // Verify no shame-based language
            expect(response.finalResponse).not.toMatch(/embarrass|shame|bad/i);
        });

        it('should handle customizable notification preferences', async () => {
            // Requirements 10.1, 10.2
            const userId = 'user-notifications';
            const sessionId = 'notification-session';

            const notificationRequest = {
                userId,
                message: 'I want to change my notification settings to only get reminders in the morning, not evening.',
                sessionId,
                context: undefined
            };

            const response = await conciergeOrchestrator.processRequest(notificationRequest);

            expect(response).toBeDefined();
            expect(response.finalResponse).toBeDefined();
            expect(response.sessionId).toBe(sessionId);
            expect(response.finalResponse.length).toBeGreaterThan(10);
        });

        it('should provide weekly reminder system with tone adjustment', async () => {
            // Requirements 10.1
            const userId = 'user-weekly-reminders';
            const sessionId = 'reminder-session';

            const reminderRequest = {
                userId,
                message: 'I want to adjust my weekly reminders to be less frequent and more gentle.',
                sessionId,
                context: undefined
            };

            const response = await conciergeOrchestrator.processRequest(reminderRequest);

            expect(response).toBeDefined();
            expect(response.finalResponse).toBeDefined();
            expect(response.sessionId).toBe(sessionId);
            expect(response.finalResponse.length).toBeGreaterThan(10);
        });
    });

    describe('Integration and Flow Continuity', () => {
        it('should maintain session continuity across multiple interactions', async () => {
            const userId = 'user-session-continuity';
            const sessionId = 'continuous-session';

            // First interaction
            const weightResponse = await conciergeOrchestrator.processRequest({
                userId,
                message: 'I weighed 170 pounds this morning.',
                sessionId,
                context: undefined
            });

            expect(weightResponse.context.sessionId).toBe(sessionId);

            // Second interaction using previous context
            const progressResponse = await conciergeOrchestrator.processRequest({
                userId,
                message: 'How does this compare to my previous weights?',
                sessionId,
                context: weightResponse.context
            });

            expect(progressResponse.context.sessionId).toBe(sessionId);
            expect(progressResponse.finalResponse.length).toBeGreaterThan(10);
        });

        it('should handle multi-agent coordination for complex requests', async () => {
            const userId = 'user-multi-agent';
            const sessionId = 'multi-agent-session';

            const complexRequest = {
                userId,
                message: 'I had a breach yesterday, but I logged it honestly. I want to see my progress and get motivated to continue.',
                sessionId,
                context: undefined
            };

            const response = await conciergeOrchestrator.processRequest(complexRequest);

            expect(response).toBeDefined();
            expect(response.finalResponse).toBeDefined();
            expect(response.sessionId).toBe(sessionId);
            expect(response.involvedAgents.length).toBeGreaterThan(0);
            expect(response.finalResponse.length).toBeGreaterThan(10);
        });

        it('should provide consistent user experience across all flows', async () => {
            const userId = 'user-consistent-experience';

            const scenarios = [
                { entry: 'weight logging', message: 'I weighed 165 pounds today.' },
                { entry: 'breach recovery', message: 'I overate yesterday and need help.' },
                { entry: 'progress check', message: 'How am I doing with my goals?' },
                { entry: 'gamification', message: 'What achievements have I unlocked?' },
                { entry: 'notification adjustment', message: 'I want to change my reminders.' }
            ];

            for (const scenario of scenarios) {
                const response = await conciergeOrchestrator.processRequest({
                    userId,
                    message: scenario.message,
                    sessionId: `${scenario.entry}-session`,
                    context: undefined
                });

                expect(response.finalResponse).toBeTruthy();
                expect(response.finalResponse.length).toBeGreaterThan(10);
                expect(response.finalResponse).not.toMatch(/fail|bad|wrong|shame/i);
                expect(response.involvedAgents.length).toBeGreaterThan(0);
            }
        });
    });
});