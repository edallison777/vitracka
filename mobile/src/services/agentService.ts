import { websocketService } from './websocketService';
import { offlineService } from './offlineService';
import { apiClient } from './apiClient';

interface AgentRequest {
    type: 'coaching' | 'weight_analysis' | 'nutrition_search' | 'plan_support' | 'safety_check';
    data: any;
    userId: string;
    sessionContext?: any;
}

interface AgentResponse {
    type: string;
    data: any;
    agentType: string;
    timestamp: number;
    interactionId: string;
}

interface CoachingRequest {
    message: string;
    context?: {
        recentWeight?: number;
        mood?: string;
        adherence?: number;
        glp1Medication?: boolean;
    };
}

interface WeightAnalysisRequest {
    weightEntries: Array<{
        weight: number;
        timestamp: number;
        mood?: string;
        confidence?: number;
    }>;
    timeframe: 'week' | 'month' | 'quarter';
}

interface NutritionSearchRequest {
    query: string;
    preferences?: {
        budget?: 'low' | 'medium' | 'high';
        dietary?: string[];
        healthGoals?: string[];
    };
}

class AgentService {
    private responseHandlers: Map<string, (response: AgentResponse) => void> = new Map();
    private isInitialized = false;

    constructor() {
        this.initialize();
    }

    private async initialize(): Promise<void> {
        if (this.isInitialized) return;

        // Set up WebSocket event handlers
        websocketService.on('agent_response', this.handleAgentResponse);
        websocketService.on('safety_alert', this.handleSafetyAlert);
        websocketService.on('coaching_message', this.handleCoachingMessage);

        // Connect WebSocket if not already connected
        if (!websocketService.isConnected()) {
            await websocketService.connect();
        }

        this.isInitialized = true;
    }

    private handleAgentResponse = (message: any): void => {
        const response: AgentResponse = message.payload;
        const handler = this.responseHandlers.get(response.interactionId);

        if (handler) {
            handler(response);
            this.responseHandlers.delete(response.interactionId);
        }
    };

    private handleSafetyAlert = (message: any): void => {
        // Handle safety alerts from Safety Sentinel
        console.warn('Safety alert received:', message.payload);
        // In a real app, you'd show a safety intervention UI
    };

    private handleCoachingMessage = (message: any): void => {
        // Handle proactive coaching messages
        console.log('Coaching message received:', message.payload);
        // In a real app, you'd show a notification or update the UI
    };

    // Coaching interactions
    async requestCoaching(request: CoachingRequest): Promise<AgentResponse> {
        await this.initialize();

        const agentRequest: AgentRequest = {
            type: 'coaching',
            data: request,
            userId: await this.getCurrentUserId(),
            sessionContext: {
                sessionId: websocketService.getSessionId(),
                timestamp: Date.now()
            }
        };

        if (websocketService.isConnected()) {
            // Real-time interaction via WebSocket
            return this.sendRealtimeRequest('coach', agentRequest);
        } else {
            // Fallback to HTTP API when WebSocket unavailable
            return this.sendHttpRequest('/agents/coaching', agentRequest);
        }
    }

    // Weight analysis interactions
    async requestWeightAnalysis(request: WeightAnalysisRequest): Promise<AgentResponse> {
        await this.initialize();

        const agentRequest: AgentRequest = {
            type: 'weight_analysis',
            data: request,
            userId: await this.getCurrentUserId()
        };

        if (websocketService.isConnected()) {
            return this.sendRealtimeRequest('progress', agentRequest);
        } else {
            return this.sendHttpRequest('/agents/weight-analysis', agentRequest);
        }
    }

    // Nutrition search interactions
    async searchNutrition(request: NutritionSearchRequest): Promise<AgentResponse> {
        await this.initialize();

        const agentRequest: AgentRequest = {
            type: 'nutrition_search',
            data: request,
            userId: await this.getCurrentUserId()
        };

        if (websocketService.isConnected()) {
            return this.sendRealtimeRequest('nutrition', agentRequest);
        } else {
            return this.sendHttpRequest('/agents/nutrition-search', agentRequest);
        }
    }

    // Plan support interactions
    async requestPlanSupport(planData: any): Promise<AgentResponse> {
        await this.initialize();

        const agentRequest: AgentRequest = {
            type: 'plan_support',
            data: planData,
            userId: await this.getCurrentUserId()
        };

        if (websocketService.isConnected()) {
            return this.sendRealtimeRequest('concierge', agentRequest);
        } else {
            return this.sendHttpRequest('/agents/plan-support', agentRequest);
        }
    }

    // Safety check interactions
    async performSafetyCheck(userMessage: string): Promise<AgentResponse> {
        await this.initialize();

        const agentRequest: AgentRequest = {
            type: 'safety_check',
            data: { message: userMessage },
            userId: await this.getCurrentUserId()
        };

        // Safety checks always go through real-time if possible for immediate response
        if (websocketService.isConnected()) {
            return this.sendRealtimeRequest('safety', agentRequest);
        } else {
            return this.sendHttpRequest('/agents/safety-check', agentRequest);
        }
    }

    private async sendRealtimeRequest(
        agentType: 'concierge' | 'coach' | 'safety' | 'medical' | 'progress' | 'nutrition' | 'gamification',
        request: AgentRequest
    ): Promise<AgentResponse> {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                this.responseHandlers.delete(interactionId);
                reject(new Error('Agent request timeout'));
            }, 30000); // 30 second timeout

            const interactionId = websocketService.sendAgentRequest(agentType, request);

            this.responseHandlers.set(interactionId, (response: AgentResponse) => {
                clearTimeout(timeout);
                resolve(response);
            });
        });
    }

    private async sendHttpRequest(endpoint: string, request: AgentRequest): Promise<AgentResponse> {
        try {
            const response = await apiClient.post(endpoint, request);
            return {
                type: request.type,
                data: response.data,
                agentType: 'http_fallback',
                timestamp: Date.now(),
                interactionId: `http_${Date.now()}`
            };
        } catch (error) {
            // If HTTP also fails and we're offline, cache the request
            const isOnline = await offlineService.isNetworkAvailable();
            if (!isOnline) {
                await offlineService.queueOfflineAction('CREATE', endpoint, request);
                return {
                    type: request.type,
                    data: { queued: true, message: 'Request queued for when online' },
                    agentType: 'offline_queue',
                    timestamp: Date.now(),
                    interactionId: `offline_${Date.now()}`
                };
            }
            throw error;
        }
    }

    private async getCurrentUserId(): Promise<string> {
        // In a real app, get this from auth state or storage
        try {
            const userId = await import('../store/slices/authSlice').then(module => {
                // This would access the current user ID from Redux store
                return 'current_user_id'; // Placeholder
            });
            return userId;
        } catch {
            return 'anonymous_user';
        }
    }

    // Utility methods
    async getConnectionStatus(): Promise<'connected' | 'disconnected' | 'connecting' | 'error'> {
        if (websocketService.isConnected()) {
            return 'connected';
        }
        return 'disconnected';
    }

    async reconnect(): Promise<void> {
        await websocketService.connect();
    }

    disconnect(): void {
        websocketService.disconnect();
    }

    // Event subscription for UI components
    onConnectionStatusChange(handler: (status: string) => void): void {
        websocketService.onConnectionStatus(handler);
    }

    offConnectionStatusChange(handler: (status: string) => void): void {
        websocketService.offConnectionStatus(handler);
    }
}

export const agentService = new AgentService();
export type { AgentRequest, AgentResponse, CoachingRequest, WeightAnalysisRequest, NutritionSearchRequest };