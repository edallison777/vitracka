/**
 * Coach Companion Service
 * Implements the Coach Companion agent with adaptive coaching and tone customization
 * Provides supportive, shame-free coaching with GLP-1 medication awareness
 */

import { UserSupportProfile, CoachingStyle, GoalType } from '../types';

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

export class CoachCompanionService {
    // Coaching style templates and language patterns
    private readonly styleTemplates = {
        gentle: {
            encouragement: [
                "I'm here to support you gently through this journey",
                "Take your time, there's no rush",
                "You're doing the best you can, and that's enough",
                "Be kind to yourself as you learn and grow",
                "Every small step matters, no matter how gentle"
            ],
            language: {
                positive: ['gently', 'softly', 'kindly', 'compassionately', 'understanding', 'patient', 'nurturing'],
                avoid: ['must', 'should', 'need to', 'have to', 'required', 'demand', 'force']
            },
            setbackReframe: "This is just part of your gentle journey of learning about yourself"
        },
        pragmatic: {
            encouragement: [
                "Let's focus on practical steps that work for you",
                "Progress is about finding realistic solutions",
                "What matters is what's achievable and sustainable",
                "Let's build on what's working and adjust what isn't",
                "Practical progress beats perfect plans every time"
            ],
            language: {
                positive: ['practical', 'realistic', 'achievable', 'step', 'plan', 'strategy', 'workable', 'effective'],
                avoid: ['perfect', 'ideal', 'flawless', 'impossible', 'unrealistic']
            },
            setbackReframe: "This gives us valuable information about what adjustments to make"
        },
        upbeat: {
            encouragement: [
                "You're doing amazing work on this journey!",
                "I'm so excited to see your progress!",
                "Every day brings new opportunities for success!",
                "You have so much strength and determination!",
                "Let's celebrate every victory, big and small!"
            ],
            language: {
                positive: ['great', 'awesome', 'fantastic', 'amazing', 'wonderful', 'excellent', 'celebrate', 'exciting'],
                avoid: ['boring', 'dull', 'disappointing', 'mediocre']
            },
            setbackReframe: "This is just a plot twist in your amazing success story!"
        },
        structured: {
            encouragement: [
                'Your systematic approach to health is commendable',
                'Following a structured plan leads to consistent results',
                'Organization and planning are your strengths',
                'Step-by-step progress creates lasting change',
                'Your methodical approach will serve you well'
            ],
            language: {
                positive: ['step', 'plan', 'organize', 'systematic', 'structure', 'framework', 'methodical', 'consistent'],
                avoid: ['chaotic', 'random', 'unplanned', 'disorganized']
            },
            setbackReframe: "This is valuable data to refine your systematic approach"
        }
    };

    private readonly glp1Adaptations = {
        nutritionalFocus: [
            "nourish your body well", "focus on nutritional adequacy", "fuel your body properly",
            "ensure balanced nutrition", "prioritize healthy eating over restriction",
            "eating well is the real success", "quality nutrition supports your goals"
        ],
        underEatingChecks: [
            "Are you eating enough to fuel your body?", "Remember, adequate nutrition is key",
            "Your body needs proper fuel to function well", "Eating enough is just as important as eating well"
        ],
        musclePreservation: [
            "protein helps preserve your muscle mass", "strength training supports your health",
            "maintaining muscle is important during weight loss", "focus on preserving your strength"
        ],
        medicationAwareness: [
            "work with your medication, not against it", "your medication is a tool, not a crutch",
            "combine medication benefits with healthy habits", "medication supports your healthy choices"
        ]
    };

    private readonly shameFreeLanguage = {
        reframingWords: {
            "failure": "learning experience",
            "failed": "learned something new",
            "bad": "challenging",
            "wrong": "different approach needed",
            "terrible": "difficult",
            "setback": "course correction",
            "mistake": "learning opportunity"
        },
        encouragingAlternatives: [
            "progress", "journey", "growth", "learning", "improvement", "success",
            "proud", "support", "strength", "resilient", "capable", "worthy"
        ]
    };

    /**
     * Generate a coaching response based on user profile and context
     */
    async generateCoachingResponse(
        userMessage: string,
        profile: UserSupportProfile,
        context: CoachingContext,
        recentProgress: RecentProgress
    ): Promise<CoachingResponse> {
        const style = profile.preferences.coachingStyle;
        const isGLP1User = profile.medicalContext.onGLP1Medication;
        const goalType = profile.goals.type;
        const intensity = this.determineIntensity(profile.preferences.gamificationLevel);

        // Generate base response content
        let content = await this.generateBaseContent(userMessage, style, context, recentProgress, goalType);

        // Apply GLP-1 adaptations if needed
        if (isGLP1User) {
            content = this.applyGLP1Adaptations(content, context);
        }

        // Apply gamification enhancements based on intensity
        content = this.applyGamificationEnhancements(content, intensity, context);

        // Ensure shame-free language
        content = this.ensureShameFreeLanguage(content);

        // Add style-specific encouragement
        content = this.addStyleSpecificEncouragement(content, style, recentProgress);

        return {
            content,
            tone: style,
            isEncouraging: true,
            isGLP1Aware: isGLP1User,
            includesUnderEatingCheck: isGLP1User && this.needsUnderEatingCheck(context, recentProgress),
            isReframingSetback: recentProgress.adherenceRate < 0.5,
            intensity,
            goalFocus: goalType
        };
    }

    /**
     * Generate base content based on context and style
     */
    private async generateBaseContent(
        userMessage: string,
        style: CoachingStyle,
        context: CoachingContext,
        progress: RecentProgress,
        goalType: GoalType
    ): Promise<string> {
        const template = this.styleTemplates[style];
        let content = '';

        // Context-specific responses
        switch (context) {
            case 'weight_logging':
                content = this.generateWeightLoggingResponse(style, progress, goalType);
                break;
            case 'goal_setting':
                content = this.generateGoalSettingResponse(style, goalType);
                break;
            case 'progress_check':
                content = this.generateProgressCheckResponse(style, progress, goalType);
                break;
            case 'setback_recovery':
                content = this.generateSetbackRecoveryResponse(style, progress);
                break;
            case 'meal_planning':
                content = this.generateMealPlanningResponse(style, goalType);
                break;
            case 'exercise_discussion':
                content = this.generateExerciseResponse(style, goalType);
                break;
            case 'motivation_request':
                content = this.generateMotivationResponse(style, progress, goalType);
                break;
            case 'general_support':
                content = this.generateGeneralSupportResponse(style, goalType);
                break;
        }

        return content;
    }

    /**
     * Apply gamification enhancements based on intensity
     */
    private applyGamificationEnhancements(content: string, intensity: 'low' | 'medium' | 'high', context: CoachingContext): string {
        if (intensity === 'high') {
            // Add gamification language for high intensity
            const gamificationWords = ['goal', 'achievement', 'milestone', 'challenge', 'reward', 'level up', 'unlock'];
            const randomWord = this.getRandomElement(gamificationWords);

            if (context === 'progress_check' || context === 'motivation_request') {
                content += ` You're working toward an important ${randomWord} in your health journey.`;
            }
        }

        return content;
    }

    /**
     * Apply GLP-1 specific adaptations to content
     */
    private applyGLP1Adaptations(content: string, context: CoachingContext): string {
        let adaptedContent = content;

        // Add nutritional focus
        if (context === "meal_planning" || context === "setback_recovery" || context === "progress_check") {
            const nutritionalPhrase = this.getRandomElement(this.glp1Adaptations.nutritionalFocus);
            adaptedContent += ` Remember to ${nutritionalPhrase}.`;
        }

        // Add muscle preservation focus for exercise
        if (context === "exercise_discussion" || context === "goal_setting") {
            const musclePhrase = this.getRandomElement(this.glp1Adaptations.musclePreservation);
            adaptedContent += ` Don't forget that ${musclePhrase}.`;
        }

        // Add medication awareness
        const medicationPhrase = this.getRandomElement(this.glp1Adaptations.medicationAwareness);
        adaptedContent += ` Your approach should ${medicationPhrase}.`;

        return adaptedContent;
    }

    /**
     * Ensure content uses shame-free language
     */
    private ensureShameFreeLanguage(content: string): string {
        let shameFreeContent = content;

        // Replace shame-based words with positive alternatives
        for (const [shamefulWord, alternative] of Object.entries(this.shameFreeLanguage.reframingWords)) {
            const regex = new RegExp(`\\b${shamefulWord}\\b`, 'gi');
            shameFreeContent = shameFreeContent.replace(regex, alternative);
        }

        return shameFreeContent;
    }

    /**
     * Add style-specific encouragement
     */
    private addStyleSpecificEncouragement(content: string, style: CoachingStyle, progress: RecentProgress): string {
        const template = this.styleTemplates[style];
        const encouragement = this.getRandomElement(template.encouragement);

        // Ensure style-specific language is included naturally
        const styleWord = this.getRandomElement(template.language.positive);
        let enhancedContent = content;

        // Add style-specific language naturally if not already present
        if (!content.toLowerCase().includes(styleWord.toLowerCase())) {
            // Add the style word naturally at the beginning
            enhancedContent = `${styleWord.charAt(0).toUpperCase() + styleWord.slice(1)}, ${content.toLowerCase()}`;
        }

        // Add setback reframing if needed
        if (progress.adherenceRate < 0.5) {
            enhancedContent += ` ${template.setbackReframe}. ${encouragement}`;
        } else {
            enhancedContent += ` ${encouragement}`;
        }

        return enhancedContent;
    }

    /**
     * Generate weight logging specific response
     */
    private generateWeightLoggingResponse(style: CoachingStyle, progress: RecentProgress, goalType: GoalType): string {
        const template = this.styleTemplates[style];

        if (goalType === "maintenance") {
            return "Tracking your weight helps you maintain your healthy balance. Consistency in logging shows your commitment to long-term success and stability.";
        } else if (goalType === "loss") {
            if (progress.weightTrend === "losing") {
                return "Your weight tracking shows sustainable progress. This steady approach is exactly what leads to lasting results and gradual healthy pace.";
            } else {
                return "Weight can fluctuate daily, but your consistent logging helps us see the bigger picture. Trends matter more than individual numbers, and progress continues.";
            }
        } else { // transition
            return "Tracking during your transition phase helps you understand how your body is adapting. This information is valuable for your evolving journey and transition success.";
        }
    }

    /**
     * Generate goal setting specific response
     */
    private generateGoalSettingResponse(style: CoachingStyle, goalType: GoalType): string {
        if (goalType === "maintenance") {
            return "Setting maintenance goals shows wisdom and self-awareness. Stability is a significant achievement worth celebrating and protecting.";
        } else if (goalType === "loss") {
            return "Thoughtful goal setting creates a roadmap for sustainable progress. Focus on goals that support your overall well-being and long-term success.";
        } else { // transition
            return "Transition goals help you navigate change with intention. This phase is about adapting and finding what works for your evolving needs.";
        }
    }

    /**
     * Generate progress check specific response
     */
    private generateProgressCheckResponse(style: CoachingStyle, progress: RecentProgress, goalType: GoalType): string {
        if (progress.adherenceRate > 0.8) {
            return "Your consistency is impressive and shows real commitment to your health journey. This kind of dedication builds lasting habits and great progress.";
        } else if (progress.adherenceRate > 0.5) {
            return "You're making solid progress with room to grow. Every day you engage with your health goals is a step forward.";
        } else {
            return "Progress isn't always linear, and that's completely normal. What matters is that you're here, engaged, and ready to move forward with fresh momentum.";
        }
    }

    /**
     * Generate setback recovery specific response
     */
    private generateSetbackRecoveryResponse(style: CoachingStyle, progress: RecentProgress): string {
        const template = this.styleTemplates[style];
        return `${template.setbackReframe}. Tomorrow is a fresh start, and you have everything you need to move forward with renewed focus.`;
    }

    /**
     * Generate meal planning specific response
     */
    private generateMealPlanningResponse(style: CoachingStyle, goalType: GoalType): string {
        return "Meal planning is an act of self-care that sets you up for success. Focus on nourishing your body with foods that make you feel energized and satisfied.";
    }

    /**
     * Generate exercise discussion response
     */
    private generateExerciseResponse(style: CoachingStyle, goalType: GoalType): string {
        return "Movement is a celebration of what your body can do. Find activities that bring you joy while supporting your strength and overall health.";
    }

    /**
     * Generate motivation request response
     */
    private generateMotivationResponse(style: CoachingStyle, progress: RecentProgress, goalType: GoalType): string {
        return "Your commitment to your health journey is inspiring. Every day you choose to prioritize your well-being is an act of self-respect and strength. I believe in your capability to achieve great progress.";
    }

    /**
     * Generate general support response
     */
    private generateGeneralSupportResponse(style: CoachingStyle, goalType: GoalType): string {
        return "I'm here to support you through every part of your health journey. You have the strength and wisdom to navigate whatever comes your way. I believe in your resilience and capability.";
    }

    /**
     * Determine coaching intensity based on gamification level
     */
    private determineIntensity(gamificationLevel: 'minimal' | 'moderate' | 'high'): 'low' | 'medium' | 'high' {
        switch (gamificationLevel) {
            case "minimal": return "low";
            case "moderate": return "medium";
            case "high": return "high";
            default: return "medium";
        }
    }

    /**
     * Check if under-eating check is needed for GLP-1 users
     */
    private needsUnderEatingCheck(context: CoachingContext, progress: RecentProgress): boolean {
        return context === "meal_planning" ||
            context === "setback_recovery" ||
            (context === "progress_check" && progress.adherenceRate < 0.3);
    }

    /**
     * Get random element from array
     */
    private getRandomElement<T>(array: T[]): T {
        return array[Math.floor(Math.random() * array.length)];
    }

    /**
     * Check if response maintains coaching style consistency
     */
    validateStyleConsistency(response: CoachingResponse, expectedStyle: CoachingStyle): boolean {
        const template = this.styleTemplates[expectedStyle];
        const content = response.content.toLowerCase();

        // Check for positive language patterns
        const hasPositiveLanguage = template.language.positive.some(word =>
            content.includes(word.toLowerCase())
        );

        // Check for avoided language patterns
        const hasAvoidedLanguage = template.language.avoid.some(word =>
            content.includes(word.toLowerCase())
        );

        return hasPositiveLanguage && !hasAvoidedLanguage && response.tone === expectedStyle;
    }

    /**
     * Validate shame-free language compliance
     */
    validateShameFreeLanguage(content: string): boolean {
        const shamefulWords = [
            "failure", "failed", "bad", "wrong", "terrible", "awful",
            "shame", "guilt", "disappointed", "pathetic", "weak",
            "lazy", "undisciplined", "hopeless", "useless"
        ];

        const lowerContent = content.toLowerCase();
        return !shamefulWords.some(word => lowerContent.includes(word));
    }

    /**
     * Validate GLP-1 awareness in response
     */
    validateGLP1Awareness(response: CoachingResponse, isGLP1User: boolean): boolean {
        if (!isGLP1User) {
            return !response.isGLP1Aware;
        }

        const content = response.content.toLowerCase();
        const hasNutritionalFocus = this.glp1Adaptations.nutritionalFocus.some(phrase =>
            content.includes(phrase.toLowerCase())
        );

        return response.isGLP1Aware && hasNutritionalFocus;
    }
}