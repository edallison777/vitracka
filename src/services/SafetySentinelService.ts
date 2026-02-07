/**
 * Safety Sentinel Service
 * Implements the Safety Sentinel agent with veto power over all other agents
 * Continuously monitors for safety triggers and provides immediate intervention
 */

import { SafetyIntervention, TriggerType, EscalationLevel } from '../types';
import { SafetyInterventionRepository } from '../database/repositories/SafetyInterventionRepository';

export interface SafetyResponse {
    isIntervention: boolean;
    includesProfessionalHelp: boolean;
    overridesOtherAgents: boolean;
    response: string;
    escalationLevel?: EscalationLevel;
    triggerType?: TriggerType;
    adminNotificationRequired: boolean;
}

export interface SafetyTriggerDetection {
    detected: boolean;
    triggerType?: TriggerType;
    escalationLevel?: EscalationLevel;
    matchedTriggers: string[];
}

export class SafetySentinelService {
    private safetyRepository: SafetyInterventionRepository;

    // Safety trigger patterns organized by type and severity
    private readonly triggerPatterns = {
        eating_disorder: {
            high: [
                'purge', 'purging', 'throw up', 'vomit', 'bulimia', 'anorexia',
                'starve', 'starving', 'fasting', 'restrict', 'restricting',
                'binge', 'binging', 'laxative', 'diet pill'
            ],
            medium: [
                'skip meals', 'not eating', 'barely eating', 'obsessed with weight',
                'weigh myself constantly', 'afraid to eat', 'guilt about eating'
            ],
            low: [
                'feel fat', 'hate my body', 'disgusted with myself'
            ]
        },
        self_harm: {
            critical: [
                'kill myself', 'suicide', 'end it all', 'not worth living',
                'better off dead', 'want to die'
            ],
            high: [
                'hurt myself', 'cut myself', 'harm myself', 'self harm',
                'cutting', 'burning myself', 'hitting myself'
            ],
            medium: [
                'hate myself', 'worthless', 'useless', 'failure',
                'everyone would be better without me'
            ]
        },
        depression: {
            high: [
                'hopeless', 'can\'t go on', 'nothing matters', 'empty inside',
                'numb', 'can\'t feel anything', 'no point'
            ],
            medium: [
                'depressed', 'sad all the time', 'can\'t sleep', 'no energy',
                'don\'t care anymore', 'giving up'
            ],
            low: [
                'feeling down', 'unmotivated', 'tired all the time'
            ]
        },
        medical_emergency: {
            critical: [
                'chest pain', 'can\'t breathe', 'heart racing', 'dizzy and weak',
                'severe pain', 'emergency', 'call 911'
            ],
            high: [
                'medication side effects', 'allergic reaction', 'severe nausea',
                'fainting', 'blood pressure', 'heart palpitations'
            ]
        }
    };

    private readonly professionalHelpResources = {
        crisis: {
            message: "I'm concerned about what you've shared. Please reach out for immediate professional support:",
            resources: [
                "National Suicide Prevention Lifeline: 988 or 1-800-273-8255",
                "Crisis Text Line: Text HOME to 741741",
                "Emergency Services: 911",
                "Or go to your nearest emergency room"
            ]
        },
        eating_disorder: {
            message: "I want to support you, but what you're describing needs professional attention:",
            resources: [
                "National Eating Disorders Association: 1-800-931-2237",
                "NEDA Screening Tool: nationaleatingdisorders.org/screening-tool",
                "Please consider speaking with a healthcare provider or therapist"
            ]
        },
        mental_health: {
            message: "Your mental health is important. Please consider reaching out for professional support:",
            resources: [
                "National Alliance on Mental Illness: 1-800-950-6264",
                "Psychology Today therapist finder: psychologytoday.com",
                "Your primary care doctor can also provide referrals"
            ]
        },
        medical: {
            message: "What you're describing sounds like it needs medical attention:",
            resources: [
                "Contact your healthcare provider immediately",
                "If this is urgent, call 911 or go to the emergency room",
                "Don't delay seeking medical care"
            ]
        }
    };

    constructor() {
        this.safetyRepository = new SafetyInterventionRepository();
    }

    /**
     * Process a user message and detect safety triggers
     * Returns intervention response if triggers are detected
     */
    async processMessage(message: string, userId?: string): Promise<SafetyResponse> {
        const detection = this.detectSafetyTriggers(message);

        if (!detection.detected) {
            return {
                isIntervention: false,
                includesProfessionalHelp: false,
                overridesOtherAgents: false,
                response: '',
                adminNotificationRequired: false
            };
        }

        const response = this.generateInterventionResponse(detection);

        // Log the intervention if userId is provided
        if (userId && detection.triggerType && detection.escalationLevel) {
            await this.logSafetyIntervention({
                userId,
                triggerType: detection.triggerType,
                triggerContent: message,
                agentResponse: response.response,
                escalationLevel: detection.escalationLevel,
                adminNotified: response.adminNotificationRequired,
                followUpRequired: detection.escalationLevel === 'high' || detection.escalationLevel === 'critical'
            });
        }

        return response;
    }

    /**
     * Detect safety triggers in user input
     */
    private detectSafetyTriggers(message: string): SafetyTriggerDetection {
        const lowerMessage = message.toLowerCase();
        let highestEscalation: EscalationLevel | undefined;
        let detectedType: TriggerType | undefined;
        const matchedTriggers: string[] = [];

        // Store all matches with their types and levels for better prioritization
        const allMatches: Array<{
            trigger: string;
            type: TriggerType;
            level: EscalationLevel;
            priority: number;
        }> = [];

        // Process trigger types in priority order: medical_emergency first, then others
        const triggerTypeOrder: (keyof typeof this.triggerPatterns)[] = [
            'medical_emergency', 'self_harm', 'eating_disorder', 'depression'
        ];

        for (const triggerType of triggerTypeOrder) {
            const levels = this.triggerPatterns[triggerType];

            // Process escalation levels in priority order (critical > high > medium > low)
            const levelOrder = ['critical', 'high', 'medium', 'low'];

            for (const level of levelOrder) {
                if ((levels as any)[level]) {
                    const triggers = (levels as any)[level] as string[];
                    for (const trigger of triggers) {
                        if (lowerMessage.includes(trigger.toLowerCase())) {
                            matchedTriggers.push(trigger);

                            const currentLevel = level as EscalationLevel;
                            const typePriority = triggerTypeOrder.indexOf(triggerType);
                            const levelPriority = this.getEscalationPriority(currentLevel);

                            allMatches.push({
                                trigger,
                                type: triggerType as TriggerType,
                                level: currentLevel,
                                priority: typePriority * 100 + (5 - levelPriority) // Higher escalation = lower priority number
                            });
                        }
                    }
                }
            }
        }

        // Find the highest priority match
        if (allMatches.length > 0) {
            // Sort by priority (lower number = higher priority) and then by escalation level
            allMatches.sort((a, b) => {
                if (a.priority !== b.priority) {
                    return a.priority - b.priority;
                }
                return this.getEscalationPriority(b.level) - this.getEscalationPriority(a.level);
            });

            const bestMatch = allMatches[0];
            detectedType = bestMatch.type;
            highestEscalation = bestMatch.level;
        }

        return {
            detected: matchedTriggers.length > 0,
            triggerType: detectedType,
            escalationLevel: highestEscalation,
            matchedTriggers
        };
    }

    /**
     * Generate appropriate intervention response based on detection
     */
    private generateInterventionResponse(detection: SafetyTriggerDetection): SafetyResponse {
        if (!detection.detected || !detection.triggerType || !detection.escalationLevel) {
            return {
                isIntervention: false,
                includesProfessionalHelp: false,
                overridesOtherAgents: false,
                response: '',
                adminNotificationRequired: false
            };
        }

        let resourceKey: keyof typeof this.professionalHelpResources;
        let adminNotificationRequired = false;

        // Determine response type and admin notification requirement
        if (detection.triggerType === 'medical_emergency') {
            resourceKey = 'medical';
            adminNotificationRequired = true;
        } else if (detection.escalationLevel === 'critical' ||
            (detection.triggerType === 'self_harm' && detection.escalationLevel === 'high')) {
            resourceKey = 'crisis';
            adminNotificationRequired = true;
        } else if (detection.triggerType === 'eating_disorder') {
            resourceKey = 'eating_disorder';
            adminNotificationRequired = detection.escalationLevel === 'high';
        } else {
            resourceKey = 'mental_health';
            adminNotificationRequired = detection.escalationLevel === 'high';
        }

        const helpResource = this.professionalHelpResources[resourceKey];
        const response = `${helpResource.message}\n\n${helpResource.resources.join('\n')}\n\nI'm here to support you, but professional help is important for what you're experiencing.`;

        return {
            isIntervention: true,
            includesProfessionalHelp: true,
            overridesOtherAgents: true,
            response,
            escalationLevel: detection.escalationLevel,
            triggerType: detection.triggerType,
            adminNotificationRequired
        };
    }

    /**
     * Log safety intervention to database
     */
    private async logSafetyIntervention(intervention: Omit<SafetyIntervention, 'id' | 'timestamp'>): Promise<void> {
        try {
            await this.safetyRepository.create(intervention);
        } catch (error) {
            console.error('Failed to log safety intervention:', error);
            // Don't throw - logging failure shouldn't prevent intervention
        }
    }

    /**
     * Get numeric priority for escalation levels (higher = more severe)
     */
    private getEscalationPriority(level: EscalationLevel): number {
        const priorities = { low: 1, medium: 2, high: 3, critical: 4 };
        return priorities[level] || 0;
    }

    /**
     * Check if a response should be vetoed by safety concerns
     */
    async vetoResponse(response: string, originalMessage: string, userId?: string): Promise<{
        shouldVeto: boolean;
        vetoReason?: string;
        alternativeResponse?: string;
    }> {
        // Check if the original message had safety triggers
        const detection = this.detectSafetyTriggers(originalMessage);

        if (detection.detected) {
            const safetyResponse = await this.processMessage(originalMessage, userId);
            return {
                shouldVeto: true,
                vetoReason: `Safety intervention required for ${detection.triggerType} (${detection.escalationLevel} level)`,
                alternativeResponse: safetyResponse.response
            };
        }

        // Check if the response itself contains problematic content
        const responseDetection = this.detectSafetyTriggers(response);
        if (responseDetection.detected) {
            return {
                shouldVeto: true,
                vetoReason: `Response contains safety triggers: ${responseDetection.matchedTriggers.join(', ')}`,
                alternativeResponse: "I want to be helpful, but I need to be careful about the guidance I provide. Please consider speaking with a healthcare professional about your concerns."
            };
        }

        return { shouldVeto: false };
    }
}