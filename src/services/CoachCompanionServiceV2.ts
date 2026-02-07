/**
 * Coach Companion Service V2 - Strands Integration
 * Wraps the Python Strands agent with the existing service interface
 * Provides backward compatibility while using AI-powered coaching
 */

import { UserSupportProfile, CoachingStyle, GoalType } from '../types';
import { getCoachCompanionClient, UserContext } from '../clients/CoachCompanionClient';

export interface CoachingResponse {
    content: string;
    tone: CoachingStyle;
    isEncouraging: boolean;
    isGLP1Aware: boolean;
    includesUnderEatingCheck: boolean;
    isReframingSetback: boolean;
    intensity: 'low' | 'medium' | 'high';
    goalFocus: GoalType;
}

export interface RecentProgress {
    weightTrend: 'losing' | 'maintaining' | 'gaining' | 'fluctuating';
    adherenceRate: number; // 0-1 scale
    daysActive: number;
}

export type CoachingContext =
    | 'weight_logging'
    | 'goal_setting'
    | 'progress_check'
    | 'setback_recovery'
    | 'meal_planning'
    | 'exercise_discussion'
    | 'motivation_request'
    | 'general_support';

export class CoachCompanionServiceV2 {
    private client = getCoachCompanionClient();

    /**
     * Generate adaptive coaching response using Strands AI agent
     */
    async generateCoachingResponse(
        profile: UserSupportProfile,
        context: CoachingContext,
        userMessage?: string,
        recentProgress?: RecentProgress
    ): Promise<CoachingResponse> {
        // Build user context for the agent
        const userContext: UserContext = {
            coaching_style: profile.coachingStyle,
            on_glp1: profile.onGLP1Medication,
            goal_type: profile.goalType,
            gamification_preference: this.mapGamificationPreference(profile.gamificationIntensity)
        };

        // Build contextual message
        const contextualMessage = this.buildContextualMessage(
            context,
            userMessage,
            recentProgress,
            profile
        );

        // Call the Strands agent
        const response = await this.client.coach({
            message: contextualMessage,
            user_context: userContext,
            session_id: profile.userId
        });

        // Parse and structure the response
        return this.structureResponse(
            response.response,
            profile,
            context
        );
    }

    /**
     * Generate encouragement message
     */
    async generateEncouragement(
        profile: UserSupportProfile,
        recentProgress?: RecentProgress
    ): Promise<string> {
        const response = await this.generateCoachingResponse(
            profile,
            'motivation_request',
            'I could use some encouragement today',
            recentProgress
        );
        return response.content;
    }

    /**
     * Generate setback reframing message
     */
    async reframeSetback(
        profile: UserSupportProfile,
        setbackDescription: string
    ): Promise<string> {
        const response = await this.generateCoachingResponse(
            profile,
            'setback_recovery',
            `I'm struggling with: ${setbackDescription}`
        );
        return response.content;
    }

    /**
     * Generate GLP-1 aware coaching
     */
    async generateGLP1Coaching(
        profile: UserSupportProfile,
        topic: string
    ): Promise<string> {
        if (!profile.onGLP1Medication) {
            throw new Error('User is not on GLP-1 medication');
        }

        const response = await this.generateCoachingResponse(
            profile,
            'general_support',
            topic
        );
        return response.content;
    }

    /**
     * Check if agent service is available
     */
    async isAvailable(): Promise<boolean> {
        return await this.client.healthCheck();
    }

    /**
     * Reset conversation for a user
     */
    async resetConversation(userId: string): Promise<void> {
        await this.client.resetConversation(userId);
    }

    // Private helper methods

    private buildContextualMessage(
        context: CoachingContext,
        userMessage?: string,
        recentProgress?: RecentProgress,
        profile?: UserSupportProfile
    ): string {
        const parts: string[] = [];

        // Add context description
        const contextDescriptions: Record<CoachingContext, string> = {
            weight_logging: 'User is logging their weight',
            goal_setting: 'User is setting or reviewing their goals',
            progress_check: 'User wants to review their progress',
            setback_recovery: 'User experienced a setback and needs support',
            meal_planning: 'User is planning meals or discussing nutrition',
            exercise_discussion: 'User wants to discuss exercise or activity',
            motivation_request: 'User is seeking motivation and encouragement',
            general_support: 'User needs general coaching support'
        };

        parts.push(contextDescriptions[context]);

        // Add progress information if available
        if (recentProgress) {
            parts.push(`Recent progress: ${recentProgress.weightTrend} trend, ${Math.round(recentProgress.adherenceRate * 100)}% adherence, ${recentProgress.daysActive} days active`);
        }

        // Add user message if provided
        if (userMessage) {
            parts.push(`User says: "${userMessage}"`);
        }

        return parts.join('. ');
    }

    private structureResponse(
        aiResponse: string,
        profile: UserSupportProfile,
        context: CoachingContext
    ): CoachingResponse {
        // Analyze the AI response to populate metadata
        const lowerResponse = aiResponse.toLowerCase();

        return {
            content: aiResponse,
            tone: profile.coachingStyle,
            isEncouraging: this.detectEncouragement(lowerResponse),
            isGLP1Aware: profile.onGLP1Medication && this.detectGLP1Awareness(lowerResponse),
            includesUnderEatingCheck: this.detectUnderEatingCheck(lowerResponse),
            isReframingSetback: context === 'setback_recovery',
            intensity: this.detectIntensity(lowerResponse, profile.gamificationIntensity),
            goalFocus: profile.goalType
        };
    }

    private detectEncouragement(text: string): boolean {
        const encouragementWords = [
            'great', 'good', 'well done', 'proud', 'progress', 'success',
            'achievement', 'celebrate', 'amazing', 'fantastic', 'excellent'
        ];
        return encouragementWords.some(word => text.includes(word));
    }

    private detectGLP1Awareness(text: string): boolean {
        const glp1Keywords = [
            'nutrition', 'nutrient', 'protein', 'quality', 'nourish',
            'appetite', 'medication', 'smaller portions', 'hydration'
        ];
        return glp1Keywords.some(keyword => text.includes(keyword));
    }

    private detectUnderEatingCheck(text: string): boolean {
        const underEatingKeywords = [
            'enough', 'adequate', 'sufficient', 'nourish', 'fuel',
            'energy', 'nutrition', 'balanced'
        ];
        return underEatingKeywords.some(keyword => text.includes(keyword));
    }

    private detectIntensity(text: string, gamificationIntensity: number): 'low' | 'medium' | 'high' {
        const competitiveWords = [
            'challenge', 'compete', 'win', 'beat', 'achieve', 'conquer',
            'dominate', 'crush', 'smash', 'victory'
        ];

        const competitiveCount = competitiveWords.filter(word => text.includes(word)).length;

        if (gamificationIntensity >= 0.7 && competitiveCount >= 2) return 'high';
        if (gamificationIntensity >= 0.4 && competitiveCount >= 1) return 'medium';
        return 'low';
    }

    private mapGamificationPreference(intensity: number): 'high' | 'moderate' | 'low' {
        if (intensity >= 0.7) return 'high';
        if (intensity >= 0.4) return 'moderate';
        return 'low';
    }
}
