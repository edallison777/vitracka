/**
 * Client for Coach Companion Agent Python Service
 * Bridges Node.js backend with Python Strands agent
 */

import axios, { AxiosInstance } from 'axios';

export interface UserContext {
    coaching_style?: 'gentle' | 'pragmatic' | 'upbeat' | 'structured';
    on_glp1?: boolean;
    goal_type?: 'loss' | 'maintenance' | 'transition';
    gamification_preference?: 'high' | 'moderate' | 'low';
}

export interface CoachingRequest {
    message: string;
    user_context?: UserContext;
    session_id?: string;
}

export interface CoachingResponse {
    response: string;
    session_id?: string;
}

export class CoachCompanionClient {
    private client: AxiosInstance;
    private baseUrl: string;

    constructor(baseUrl?: string) {
        this.baseUrl = baseUrl || process.env.COACH_AGENT_URL || 'http://localhost:8001';

        this.client = axios.create({
            baseURL: this.baseUrl,
            timeout: 30000, // 30 second timeout for LLM responses
            headers: {
                'Content-Type': 'application/json',
            },
        });
    }

    /**
     * Generate a coaching response from the AI agent
     */
    async coach(request: CoachingRequest): Promise<CoachingResponse> {
        try {
            const response = await this.client.post<CoachingResponse>('/coach', request);
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                throw new Error(
                    `Coach agent request failed: ${error.response?.data?.detail || error.message}`
                );
            }
            throw error;
        }
    }

    /**
     * Reset conversation history for a new session
     */
    async resetConversation(sessionId?: string): Promise<void> {
        try {
            await this.client.post('/reset', { session_id: sessionId });
        } catch (error) {
            if (axios.isAxiosError(error)) {
                throw new Error(
                    `Failed to reset conversation: ${error.response?.data?.detail || error.message}`
                );
            }
            throw error;
        }
    }

    /**
     * Check if the agent service is healthy
     */
    async healthCheck(): Promise<boolean> {
        try {
            const response = await this.client.get('/health');
            return response.data.status === 'healthy';
        } catch (error) {
            return false;
        }
    }
}

// Singleton instance
let clientInstance: CoachCompanionClient | null = null;

export function getCoachCompanionClient(): CoachCompanionClient {
    if (!clientInstance) {
        clientInstance = new CoachCompanionClient();
    }
    return clientInstance;
}
