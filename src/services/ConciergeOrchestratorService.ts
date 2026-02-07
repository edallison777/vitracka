/**
 * Concierge Orchestrator Service
 * Implements the primary interface agent for request routing and multi-agent response composition
 * Manages conversation context and session management while respecting Safety Sentinel authority
 */

import { SafetySentinelService, SafetyResponse } from './SafetySentinelService';
import { MedicalBoundariesService, MedicalBoundaryResponse } from './MedicalBoundariesService';
import { UserSupportProfile, CoachingStyle } from '../types';

export interface AgentRequest {
    userId: string;
    message: string;
    sessionId: string;
    context?: ConversationContext;
}

export interface AgentResponse {
    response: string;
    agentType: AgentType;
    confidence: number;
    requiresFollowUp: boolean;
    metadata?: Record<string, any>;
}

export interface ConversationContext {
    sessionId: string;
    userId: string;
    messageHistory: ConversationMessage[];
    userProfile?: UserSupportProfile;
    currentTopic?: string;
    lastInteractionTime: Date;
    safetyFlags: string[];
}

export interface ConversationMessage {
    id: string;
    content: string;
    timestamp: Date;
    sender: 'user' | 'agent';
    agentType?: AgentType;
    safetyChecked: boolean;
}

export interface OrchestratorResponse {
    finalResponse: string;
    involvedAgents: AgentType[];
    safetyOverride: boolean;
    sessionId: string;
    requiresFollowUp: boolean;
    context: ConversationContext;
}

export type AgentType =
    | 'safety_sentinel'
    | 'medical_boundaries'
    | 'coach_companion'
    | 'progress_analyst'
    | 'plan_logging'
    | 'nutrition_scout'
    | 'game_master'
    | 'tone_manager'
    | 'onboarding_builder';

export interface SpecialistAgent {
    agentType: AgentType;
    canHandle: (message: string, context: ConversationContext) => boolean;
    processRequest: (request: AgentRequest) => Promise<AgentResponse>;
    priority: number; // Lower number = higher priority
}

export class ConciergeOrchestratorService {
    private safetySentinel: SafetySentinelService;
    private medicalBoundaries: MedicalBoundariesService;
    private specialistAgents: Map<AgentType, SpecialistAgent>;
    private activeSessions: Map<string, ConversationContext>;

    constructor() {
        this.safetySentinel = new SafetySentinelService();
        this.medicalBoundaries = new MedicalBoundariesService();
        this.specialistAgents = new Map();
        this.activeSessions = new Map();

        this.initializeSpecialistAgents();
    }

    /**
     * Main entry point for processing user requests
     * Routes requests to appropriate agents and composes responses
     */
    async processRequest(request: AgentRequest): Promise<OrchestratorResponse> {
        // Get or create conversation context
        let context = this.activeSessions.get(request.sessionId) || this.createNewContext(request);

        // Update context with new message
        context = this.updateContext(context, request.message);

        // CRITICAL: Safety Sentinel check first (has veto power)
        const safetyResponse = await this.safetySentinel.processMessage(request.message, request.userId);

        if (safetyResponse.isIntervention) {
            // Safety Sentinel overrides all other agents
            context.safetyFlags.push(`Safety intervention: ${safetyResponse.triggerType}`);

            const finalContext = this.updateContextWithResponse(context, safetyResponse.response, 'safety_sentinel');
            this.activeSessions.set(request.sessionId, finalContext);

            return {
                finalResponse: safetyResponse.response,
                involvedAgents: ['safety_sentinel'],
                safetyOverride: true,
                sessionId: request.sessionId,
                requiresFollowUp: safetyResponse.escalationLevel === 'high' || safetyResponse.escalationLevel === 'critical',
                context: finalContext
            };
        }

        // Medical Boundaries check
        const medicalResponse = this.medicalBoundaries.processMessage(request.message);

        if (medicalResponse.shouldRedirect) {
            context.safetyFlags.push('Medical boundary redirect');

            const finalContext = this.updateContextWithResponse(context, medicalResponse.redirectResponse, 'medical_boundaries');
            this.activeSessions.set(request.sessionId, finalContext);

            return {
                finalResponse: medicalResponse.redirectResponse,
                involvedAgents: ['medical_boundaries'],
                safetyOverride: false,
                sessionId: request.sessionId,
                requiresFollowUp: false,
                context: finalContext
            };
        }

        // Route to appropriate specialist agents
        const routedAgents = this.routeToSpecialistAgents(request.message, context);
        const agentResponses: AgentResponse[] = [];

        // Process with each routed agent
        for (const agentType of routedAgents) {
            const agent = this.specialistAgents.get(agentType);
            if (agent) {
                try {
                    const response = await agent.processRequest({ ...request, context });
                    agentResponses.push(response);
                } catch (error) {
                    console.error(`Error processing request with ${agentType}:`, error);
                    // Continue with other agents if one fails
                }
            }
        }

        // Compose multi-agent response
        const composedResponse = this.composeMultiAgentResponse(agentResponses, context);

        // Final safety check on composed response
        const responseVeto = await this.safetySentinel.vetoResponse(
            composedResponse.response,
            request.message,
            request.userId
        );

        let finalResponse = composedResponse.response;
        let safetyOverride = false;
        let involvedAgents = composedResponse.involvedAgents;

        if (responseVeto.shouldVeto) {
            finalResponse = responseVeto.alternativeResponse || "I want to be helpful, but I need to be careful about the guidance I provide. Please consider speaking with a healthcare professional.";
            safetyOverride = true;
            involvedAgents = ['safety_sentinel', ...involvedAgents];
            context.safetyFlags.push(`Response vetoed: ${responseVeto.vetoReason}`);
        }

        // Update context and session
        const finalContext = this.updateContextWithResponse(context, finalResponse, involvedAgents[0]);
        this.activeSessions.set(request.sessionId, finalContext);

        return {
            finalResponse,
            involvedAgents,
            safetyOverride,
            sessionId: request.sessionId,
            requiresFollowUp: composedResponse.requiresFollowUp,
            context: finalContext
        };
    }

    /**
     * Route message to appropriate specialist agents based on content and context
     */
    private routeToSpecialistAgents(message: string, context: ConversationContext): AgentType[] {
        const routedAgents: AgentType[] = [];
        const lowerMessage = message.toLowerCase();

        // Determine routing based on message content and context
        // This is a simplified routing logic - in production would be more sophisticated

        // Onboarding-related
        if (lowerMessage.includes('profile') || lowerMessage.includes('preferences') ||
            lowerMessage.includes('goals') || !context.userProfile) {
            routedAgents.push('onboarding_builder');
        }

        // Weight and progress-related
        if (lowerMessage.includes('weight') || lowerMessage.includes('progress') ||
            lowerMessage.includes('trend') || lowerMessage.includes('goal')) {
            routedAgents.push('progress_analyst');
        }

        // Eating and meal-related
        if (lowerMessage.includes('eat') || lowerMessage.includes('meal') ||
            lowerMessage.includes('food') || lowerMessage.includes('plan')) {
            routedAgents.push('plan_logging');
        }

        // Nutrition search
        if (lowerMessage.includes('nutrition') || lowerMessage.includes('calories') ||
            lowerMessage.includes('search food') || lowerMessage.includes('ingredients')) {
            routedAgents.push('nutrition_scout');
        }

        // Gamification and achievements
        if (lowerMessage.includes('achievement') || lowerMessage.includes('reward') ||
            lowerMessage.includes('points') || lowerMessage.includes('badge')) {
            routedAgents.push('game_master');
        }

        // Tone and relationship management
        if (lowerMessage.includes('tone') || lowerMessage.includes('style') ||
            lowerMessage.includes('notification') || lowerMessage.includes('reminder')) {
            routedAgents.push('tone_manager');
        }

        // Default to coach companion for general support
        if (routedAgents.length === 0) {
            routedAgents.push('coach_companion');
        }

        return routedAgents;
    }

    /**
     * Compose responses from multiple agents into coherent user interaction
     */
    private composeMultiAgentResponse(responses: AgentResponse[], context: ConversationContext): {
        response: string;
        involvedAgents: AgentType[];
        requiresFollowUp: boolean;
    } {
        if (responses.length === 0) {
            return {
                response: "I'm here to help! Could you tell me more about what you'd like to work on?",
                involvedAgents: ['coach_companion'],
                requiresFollowUp: false
            };
        }

        if (responses.length === 1) {
            return {
                response: responses[0].response,
                involvedAgents: [responses[0].agentType],
                requiresFollowUp: responses[0].requiresFollowUp
            };
        }

        // Sort responses by confidence and priority
        const sortedResponses = responses.sort((a, b) => {
            const agentA = this.specialistAgents.get(a.agentType);
            const agentB = this.specialistAgents.get(b.agentType);

            // First by confidence, then by agent priority
            if (a.confidence !== b.confidence) {
                return b.confidence - a.confidence;
            }

            return (agentA?.priority || 10) - (agentB?.priority || 10);
        });

        // Compose response from top agents
        const primaryResponse = sortedResponses[0];
        const secondaryResponses = sortedResponses.slice(1, 3); // Max 2 additional responses

        let composedResponse = primaryResponse.response;

        // Add relevant secondary information if it adds value
        for (const secondary of secondaryResponses) {
            if (secondary.confidence > 0.7 && secondary.response.length < 200) {
                composedResponse += `\n\n${secondary.response}`;
            }
        }

        return {
            response: composedResponse,
            involvedAgents: [primaryResponse.agentType, ...secondaryResponses.map(r => r.agentType)],
            requiresFollowUp: sortedResponses.some(r => r.requiresFollowUp)
        };
    }

    /**
     * Create new conversation context for a session
     */
    private createNewContext(request: AgentRequest): ConversationContext {
        return {
            sessionId: request.sessionId,
            userId: request.userId,
            messageHistory: [],
            userProfile: request.context?.userProfile,
            currentTopic: undefined,
            lastInteractionTime: new Date(),
            safetyFlags: []
        };
    }

    /**
     * Update conversation context with new user message
     */
    private updateContext(context: ConversationContext, message: string): ConversationContext {
        const newMessage: ConversationMessage = {
            id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            content: message,
            timestamp: new Date(),
            sender: 'user',
            safetyChecked: true
        };

        return {
            ...context,
            messageHistory: [...context.messageHistory, newMessage].slice(-20), // Keep last 20 messages
            lastInteractionTime: new Date()
        };
    }

    /**
     * Update conversation context with agent response
     */
    private updateContextWithResponse(
        context: ConversationContext,
        response: string,
        agentType: AgentType
    ): ConversationContext {
        const responseMessage: ConversationMessage = {
            id: `resp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            content: response,
            timestamp: new Date(),
            sender: 'agent',
            agentType,
            safetyChecked: true
        };

        return {
            ...context,
            messageHistory: [...context.messageHistory, responseMessage].slice(-20),
            lastInteractionTime: new Date()
        };
    }

    /**
     * Initialize specialist agents (placeholder implementations)
     * In production, these would be actual agent implementations
     */
    private initializeSpecialistAgents(): void {
        // Placeholder agent implementations for testing
        // In production, these would be actual specialized agents

        this.specialistAgents.set('coach_companion', {
            agentType: 'coach_companion',
            priority: 5,
            canHandle: (message: string, context: ConversationContext) => true, // Default handler
            processRequest: async (request: AgentRequest): Promise<AgentResponse> => {
                const style = request.context?.userProfile?.preferences.coachingStyle || 'gentle';
                let response = '';

                switch (style) {
                    case 'gentle':
                        response = "I'm here to support you gently on your journey. What would you like to work on today?";
                        break;
                    case 'pragmatic':
                        response = "Let's focus on practical steps you can take. What's your main challenge right now?";
                        break;
                    case 'upbeat':
                        response = "You're doing great! What exciting progress can we make today?";
                        break;
                    case 'structured':
                        response = "Let's create a clear plan. What specific goal would you like to work toward?";
                        break;
                    default:
                        response = "I'm here to help you succeed. What can we work on together?";
                }

                return {
                    response,
                    agentType: 'coach_companion',
                    confidence: 0.8,
                    requiresFollowUp: false
                };
            }
        });

        this.specialistAgents.set('progress_analyst', {
            agentType: 'progress_analyst',
            priority: 3,
            canHandle: (message: string) => {
                const lowerMessage = message.toLowerCase();
                return lowerMessage.includes('weight') || lowerMessage.includes('progress') ||
                    lowerMessage.includes('trend') || lowerMessage.includes('goal');
            },
            processRequest: async (request: AgentRequest): Promise<AgentResponse> => {
                return {
                    response: "I can help you analyze your progress trends and weight data. Would you like to see your recent progress?",
                    agentType: 'progress_analyst',
                    confidence: 0.9,
                    requiresFollowUp: true
                };
            }
        });

        this.specialistAgents.set('plan_logging', {
            agentType: 'plan_logging',
            priority: 4,
            canHandle: (message: string) => {
                const lowerMessage = message.toLowerCase();
                return lowerMessage.includes('eat') || lowerMessage.includes('meal') ||
                    lowerMessage.includes('food') || lowerMessage.includes('plan');
            },
            processRequest: async (request: AgentRequest): Promise<AgentResponse> => {
                return {
                    response: "I can help you with your eating plan and meal logging. What would you like to track or plan?",
                    agentType: 'plan_logging',
                    confidence: 0.85,
                    requiresFollowUp: true
                };
            }
        });

        this.specialistAgents.set('onboarding_builder', {
            agentType: 'onboarding_builder',
            priority: 1,
            canHandle: (message: string, context: ConversationContext) => {
                return !context.userProfile || message.toLowerCase().includes('profile') ||
                    message.toLowerCase().includes('preferences');
            },
            processRequest: async (request: AgentRequest): Promise<AgentResponse> => {
                return {
                    response: "Let's set up your profile so I can provide personalized support. What are your wellness goals?",
                    agentType: 'onboarding_builder',
                    confidence: 0.95,
                    requiresFollowUp: true
                };
            }
        });

        this.specialistAgents.set('nutrition_scout', {
            agentType: 'nutrition_scout',
            priority: 6,
            canHandle: (message: string) => {
                const lowerMessage = message.toLowerCase();
                return lowerMessage.includes('nutrition') || lowerMessage.includes('calories') ||
                    lowerMessage.includes('search food') || lowerMessage.includes('ingredients') ||
                    lowerMessage.includes('food') || lowerMessage.includes('price');
            },
            processRequest: async (request: AgentRequest): Promise<AgentResponse> => {
                try {
                    // Import NutritionScoutService dynamically to avoid circular dependencies
                    const { NutritionScoutService } = await import('./NutritionScoutService');
                    const nutritionScout = new NutritionScoutService();

                    // Extract search terms from the message
                    const searchTerm = this.extractSearchTerm(request.message);

                    if (!searchTerm) {
                        return {
                            response: "I can help you search for nutritional information and find healthy alternatives. What specific food are you curious about?",
                            agentType: 'nutrition_scout',
                            confidence: 0.7,
                            requiresFollowUp: true
                        };
                    }

                    // Perform nutrition search
                    const results = await nutritionScout.searchNutrition({
                        searchTerm,
                        includeAlternatives: true
                    });

                    if (results.length === 0) {
                        return {
                            response: `I couldn't find nutritional information for "${searchTerm}". Try searching for a more specific food item or check the spelling.`,
                            agentType: 'nutrition_scout',
                            confidence: 0.6,
                            requiresFollowUp: false
                        };
                    }

                    // Format response with nutrition information
                    const response = this.formatNutritionResponse(results.slice(0, 3), searchTerm);

                    return {
                        response,
                        agentType: 'nutrition_scout',
                        confidence: 0.9,
                        requiresFollowUp: false
                    };
                } catch (error) {
                    console.error('Nutrition search error:', error);
                    return {
                        response: "I'm having trouble accessing nutrition information right now. Please try again in a moment.",
                        agentType: 'nutrition_scout',
                        confidence: 0.3,
                        requiresFollowUp: false
                    };
                }
            }
        });

        this.specialistAgents.set('game_master', {
            agentType: 'game_master',
            priority: 7,
            canHandle: (message: string) => {
                const lowerMessage = message.toLowerCase();
                return lowerMessage.includes('achievement') || lowerMessage.includes('reward') ||
                    lowerMessage.includes('points');
            },
            processRequest: async (request: AgentRequest): Promise<AgentResponse> => {
                return {
                    response: "Great job on your consistency! You've earned points for honest logging. Keep up the excellent work!",
                    agentType: 'game_master',
                    confidence: 0.7,
                    requiresFollowUp: false
                };
            }
        });

        this.specialistAgents.set('tone_manager', {
            agentType: 'tone_manager',
            priority: 8,
            canHandle: (message: string) => {
                const lowerMessage = message.toLowerCase();
                return lowerMessage.includes('tone') || lowerMessage.includes('style') ||
                    lowerMessage.includes('notification');
            },
            processRequest: async (request: AgentRequest): Promise<AgentResponse> => {
                return {
                    response: "I can help you adjust your notification preferences and coaching style. What changes would you like to make?",
                    agentType: 'tone_manager',
                    confidence: 0.8,
                    requiresFollowUp: true
                };
            }
        });
    }

    /**
     * Get current session context
     */
    getSessionContext(sessionId: string): ConversationContext | undefined {
        return this.activeSessions.get(sessionId);
    }

    /**
     * Clear session context (for cleanup)
     */
    clearSession(sessionId: string): void {
        this.activeSessions.delete(sessionId);
    }

    /**
     * Get active session count (for monitoring)
     */
    getActiveSessionCount(): number {
        return this.activeSessions.size;
    }

    /**
     * Extract search term from user message for nutrition search
     */
    private extractSearchTerm(message: string): string | null {
        const lowerMessage = message.toLowerCase();

        // Common patterns for food searches
        const patterns = [
            /(?:nutrition|calories|search|find|about|info|information)\s+(?:for\s+)?(.+)/,
            /(?:what|how)\s+(?:about|many|much)\s+(.+)/,
            /(.+)\s+(?:nutrition|calories|nutritional)/,
            /food\s+(.+)/,
            /(.+)\s+(?:price|cost|pricing)/
        ];

        for (const pattern of patterns) {
            const match = lowerMessage.match(pattern);
            if (match && match[1]) {
                return match[1].trim();
            }
        }

        // If no pattern matches, look for food-related keywords
        const foodKeywords = ['apple', 'banana', 'chicken', 'beef', 'bread', 'milk', 'cheese', 'rice', 'pasta'];
        for (const keyword of foodKeywords) {
            if (lowerMessage.includes(keyword)) {
                return keyword;
            }
        }

        return null;
    }

    /**
     * Format nutrition search results into user-friendly response
     */
    private formatNutritionResponse(results: any[], searchTerm: string): string {
        if (results.length === 0) {
            return `I couldn't find nutritional information for "${searchTerm}".`;
        }

        let response = `Here's what I found for "${searchTerm}":\n\n`;

        results.forEach((result, index) => {
            const item = result.item;
            const nutrition = item.nutritionPer100g;
            const pricing = result.pricing[0]; // Use first pricing option

            response += `**${item.name}**\n`;
            response += `• Calories: ${nutrition.calories} per 100g\n`;
            response += `• Protein: ${nutrition.protein}g\n`;
            response += `• Carbs: ${nutrition.carbohydrates}g\n`;
            response += `• Fat: ${nutrition.fat}g\n`;

            if (pricing) {
                response += `• Price: ${pricing.currency} ${pricing.price} ${pricing.unit} at ${pricing.retailer}\n`;
            }

            // Add alternatives if available
            if (result.alternatives.healthier.length > 0) {
                response += `• Healthier alternatives: ${result.alternatives.healthier.map((alt: any) => alt.name).join(', ')}\n`;
            }

            if (result.alternatives.cheaper.length > 0) {
                response += `• Cheaper alternatives: ${result.alternatives.cheaper.map((alt: any) => alt.name).join(', ')}\n`;
            }

            response += '\n';
        });

        response += 'Would you like more details about any of these options or search for something else?';

        return response;
    }
}