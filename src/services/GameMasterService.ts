/**
 * Game Master Service
 * Implements safe gamification mechanics that reward consistency and honesty
 * while avoiding reinforcement of unhealthy behaviors
 */

import {
    UserSupportProfile,
    WeightEntry,
    BreachEvent,
    Achievement,
    Reward,
    GamificationResponse,
    ConsistencyMetrics,
    BreachRecoveryMetrics,
    AchievementType,
    RewardType
} from '../types';

export class GameMasterService {
    private readonly safeRewards = {
        consistency: [
            {
                id: 'daily_logger_reward',
                type: 'consistency_reward' as RewardType,
                title: 'Daily Logger',
                description: 'Logged weight consistently for 7 days',
                points: 50,
                isHealthy: true,
                category: 'daily' as const
            },
            {
                id: 'commitment_champion_reward',
                type: 'consistency_reward' as RewardType,
                title: 'Commitment Champion',
                description: 'Maintained logging streak for 30 days',
                points: 200,
                isHealthy: true,
                category: 'monthly' as const
            }
        ],
        honesty: [
            {
                id: 'honest_logger_reward',
                type: 'honesty_reward' as RewardType,
                title: 'Honest Logger',
                description: 'Recorded eating plan breach honestly',
                points: 30,
                isHealthy: true,
                category: 'daily' as const
            },
            {
                id: 'truth_teller_reward',
                type: 'honesty_reward' as RewardType,
                title: 'Truth Teller',
                description: 'Consistently honest in logging for 2 weeks',
                points: 100,
                isHealthy: true,
                category: 'weekly' as const
            }
        ],
        recovery: [
            {
                id: 'bounce_back_reward',
                type: 'recovery_incentive' as RewardType,
                title: 'Bounce Back',
                description: 'Successfully returned to eating plan after breach',
                points: 40,
                isHealthy: true,
                category: 'recovery' as const
            },
            {
                id: 'resilience_master_reward',
                type: 'recovery_incentive' as RewardType,
                title: 'Resilience Master',
                description: 'Recovered from multiple breaches with positive attitude',
                points: 80,
                isHealthy: true,
                category: 'recovery' as const
            }
        ],
        milestone: [
            {
                id: 'health_milestone_reward',
                type: 'milestone_celebration' as RewardType,
                title: 'Health Journey Milestone',
                description: 'Reached healthy weight loss milestone safely',
                points: 150,
                isHealthy: true,
                category: 'milestone' as const
            },
            {
                id: 'maintenance_master_reward',
                type: 'milestone_celebration' as RewardType,
                title: 'Maintenance Master',
                description: 'Successfully maintained healthy weight for 3 months',
                points: 250,
                isHealthy: true,
                category: 'milestone' as const
            }
        ]
    };

    private readonly unsafePatterns = [
        'starvation', 'extreme restriction', 'unhealthy low weight',
        'skipping meals', 'purging', 'excessive exercise',
        'rapid weight loss', 'under-eating pride'
    ];

    /**
     * Process gamification for weight logging
     */
    async processWeightLogging(
        userId: string,
        weightEntry: WeightEntry,
        profile: UserSupportProfile,
        consistencyMetrics: ConsistencyMetrics
    ): Promise<GamificationResponse> {
        const gamificationLevel = profile.preferences.gamificationLevel;

        // Always perform safety checks regardless of gamification level
        const safetyChecks = this.performWeightLoggingSafetyChecks(weightEntry, profile);

        if (gamificationLevel === 'minimal') {
            return {
                ...this.generateMinimalResponse(consistencyMetrics),
                safetyChecks
            };
        }

        const rewards: Reward[] = [];
        const achievements: Achievement[] = [];
        let pointsEarned = 0;

        // Check for consistency rewards
        const consistencyReward = this.evaluateConsistencyReward(consistencyMetrics);
        if (consistencyReward) {
            rewards.push(consistencyReward);
            pointsEarned += consistencyReward.points;
        }

        // Generate achievement if applicable
        const achievement = this.evaluateWeightLoggingAchievement(consistencyMetrics, userId);
        if (achievement) {
            achievements.push(achievement);
            pointsEarned += achievement.points;
        }

        return {
            message: this.generateWeightLoggingMessage(gamificationLevel, consistencyMetrics),
            rewards,
            achievements,
            pointsEarned,
            streakUpdate: {
                current: consistencyMetrics.loggingStreak,
                isNewRecord: consistencyMetrics.loggingStreak > 0
            },
            safetyChecks,
            encouragement: this.generateEncouragement(gamificationLevel, 'weight_logging')
        };
    }

    /**
     * Process gamification for breach recovery
     */
    async processBreachRecovery(
        userId: string,
        breachEvent: BreachEvent,
        recoveryMetrics: BreachRecoveryMetrics,
        profile: UserSupportProfile
    ): Promise<GamificationResponse> {
        const gamificationLevel = profile.preferences.gamificationLevel;

        const rewards: Reward[] = [];
        const achievements: Achievement[] = [];
        let pointsEarned = 0;

        // Always reward honest breach logging, even with minimal gamification
        // This is a safety requirement to encourage honesty
        const honestyReward = this.safeRewards.honesty[0];
        rewards.push(honestyReward);
        pointsEarned += honestyReward.points;

        // Reward recovery if successful (except for minimal gamification)
        if (recoveryMetrics.recoverySuccess && gamificationLevel !== 'minimal') {
            const recoveryReward = this.safeRewards.recovery[0];
            rewards.push(recoveryReward);
            pointsEarned += recoveryReward.points;
        }

        // Safety checks for breach recovery
        const safetyChecks = this.performBreachRecoverySafetyChecks(breachEvent, recoveryMetrics);

        const baseResponse = {
            message: this.generateBreachRecoveryMessage(gamificationLevel, recoveryMetrics),
            rewards,
            achievements,
            pointsEarned,
            safetyChecks,
            encouragement: this.generateEncouragement(gamificationLevel, 'breach_recovery')
        };

        // Apply user preference adaptation after creating base response
        if (gamificationLevel === 'minimal') {
            return {
                ...baseResponse,
                rewards: [honestyReward], // Keep honesty reward even for minimal
                achievements: [],
                pointsEarned: honestyReward.points
            };
        }

        return baseResponse;
    }

    /**
     * Evaluate consistency reward eligibility
     */
    private evaluateConsistencyReward(metrics: ConsistencyMetrics): Reward | null {
        if (metrics.loggingStreak >= 30) {
            return this.safeRewards.consistency[1]; // Monthly reward
        } else if (metrics.loggingStreak >= 7) {
            return this.safeRewards.consistency[0]; // Weekly reward
        }
        return null;
    }

    /**
     * Evaluate weight logging achievement
     */
    private evaluateWeightLoggingAchievement(metrics: ConsistencyMetrics, userId: string): Achievement | null {
        if (metrics.loggingStreak >= 30 && metrics.weeklyLoggingRate >= 0.9) {
            return {
                id: `${userId}_consistency_${Date.now()}`,
                userId,
                type: 'consistency_logging' as AchievementType,
                title: 'Consistency Champion',
                description: 'Maintained excellent logging consistency for 30 days',
                earnedAt: new Date(),
                points: 100,
                category: 'consistency'
            };
        }
        return null;
    }

    /**
     * Perform safety checks for weight logging
     */
    private performWeightLoggingSafetyChecks(
        weightEntry: WeightEntry,
        profile: UserSupportProfile
    ): { isHealthyBehavior: boolean; flaggedConcerns: string[] } {
        const flaggedConcerns: string[] = [];
        let isHealthyBehavior = true;

        // Check for unhealthy weight targets
        if (profile.goals.targetWeight && profile.goals.targetWeight < 45) { // Assuming kg
            flaggedConcerns.push('Target weight may be unhealthily low');
            isHealthyBehavior = false;
        }

        // Check for rapid weight loss patterns
        // This would require historical data comparison in a real implementation

        // Check for concerning notes with more comprehensive patterns
        if (weightEntry.notes) {
            const concerningPhrases = [
                'starving', 'starved', 'not eating', 'skipped', 'purged', 'purging',
                'binge', 'binged', 'restrict', 'restriction', 'extreme', 'punish', 'punishment',
                'pride in not eating', 'proud of not eating', 'didn\'t eat', 'refuse to eat',
                'fasting', 'fast', 'empty stomach', 'hunger', 'avoid food',
                'extreme restriction worked', 'restriction worked'
            ];

            const notesLower = weightEntry.notes.toLowerCase();
            const hasConceringContent = concerningPhrases.some(phrase =>
                notesLower.includes(phrase.toLowerCase())
            );

            if (hasConceringContent) {
                flaggedConcerns.push('Weight entry notes contain concerning language');
                isHealthyBehavior = false;
            }
        }

        return { isHealthyBehavior, flaggedConcerns };
    }

    /**
     * Perform safety checks for breach recovery
     */
    private performBreachRecoverySafetyChecks(
        breachEvent: BreachEvent,
        recoveryMetrics: BreachRecoveryMetrics
    ): { isHealthyBehavior: boolean; flaggedConcerns: string[] } {
        const flaggedConcerns: string[] = [];
        let isHealthyBehavior = true;

        // Check for extreme restriction as "recovery" - but be more lenient for minimal cases
        if (recoveryMetrics.timeToRecovery < 1) { // Less than 1 hour might indicate extreme restriction
            flaggedConcerns.push('Recovery time unusually short - may indicate extreme restriction');
            isHealthyBehavior = false;
        }

        // Check breach description for concerning patterns
        if (breachEvent.description) {
            const extremePatterns = ['binge', 'purge', 'starve', 'punish'];
            const hasExtremePattern = extremePatterns.some(pattern =>
                breachEvent.description!.toLowerCase().includes(pattern)
            );

            if (hasExtremePattern) {
                flaggedConcerns.push('Breach description indicates extreme behavior patterns');
                isHealthyBehavior = false;
            }
        }

        return { isHealthyBehavior, flaggedConcerns };
    }

    /**
     * Generate weight logging message based on gamification level
     */
    private generateWeightLoggingMessage(
        level: 'minimal' | 'moderate' | 'high',
        metrics: ConsistencyMetrics
    ): string {
        switch (level) {
            case 'minimal':
                return 'Weight logged successfully. Consistency in tracking supports your health journey.';
            case 'moderate':
                if (metrics.loggingStreak >= 7) {
                    return `Great consistency! You've logged your weight for ${metrics.loggingStreak} days in a row. This dedication to tracking supports your health goals.`;
                }
                return 'Weight logged successfully. Regular tracking helps you understand your progress patterns.';
            case 'high':
                if (metrics.loggingStreak >= 30) {
                    return `Outstanding commitment! Your ${metrics.loggingStreak}-day logging streak shows incredible dedication to your health journey. You've earned recognition for this consistency!`;
                } else if (metrics.loggingStreak >= 7) {
                    return `Excellent work! ${metrics.loggingStreak} days of consistent logging. You're building a strong foundation for lasting success!`;
                }
                return 'Weight logged! Every entry contributes to your health journey. Keep building that consistency streak!';
            default:
                return 'Weight logged successfully.';
        }
    }

    /**
     * Generate breach recovery message
     */
    private generateBreachRecoveryMessage(
        level: 'minimal' | 'moderate' | 'high',
        recoveryMetrics: BreachRecoveryMetrics
    ): string {
        switch (level) {
            case 'minimal':
                return 'Thank you for your honest logging. Recovery is part of the journey.';
            case 'moderate':
                if (recoveryMetrics.recoverySuccess) {
                    return 'Honest logging and successful recovery! This shows real strength and commitment to your health goals.';
                }
                return 'Thank you for honest logging. Every breach teaches us something valuable about your journey.';
            case 'high':
                if (recoveryMetrics.recoverySuccess) {
                    return 'Amazing resilience! You logged honestly and bounced back successfully. This is exactly the kind of strength that leads to lasting success!';
                }
                return 'Honesty earns respect! Logging your breach shows integrity and commitment to your authentic health journey.';
            default:
                return 'Thank you for your honesty.';
        }
    }

    /**
     * Generate minimal response for low gamification preference
     */
    private generateMinimalResponse(metrics: ConsistencyMetrics): GamificationResponse {
        return {
            message: 'Weight logged successfully. Consistency in tracking supports your health journey.',
            rewards: [],
            achievements: [],
            pointsEarned: 0,
            safetyChecks: {
                isHealthyBehavior: true,
                flaggedConcerns: []
            },
            encouragement: 'Your commitment to tracking is valuable for your health journey.'
        };
    }

    /**
     * Generate minimal breach response
     */
    private generateMinimalBreachResponse(): GamificationResponse {
        return {
            message: 'Thank you for your honest logging. Recovery is part of the journey.',
            rewards: [],
            achievements: [],
            pointsEarned: 0,
            safetyChecks: {
                isHealthyBehavior: true,
                flaggedConcerns: []
            },
            encouragement: 'Honesty in logging supports your long-term success.'
        };
    }

    /**
     * Generate encouragement based on context
     */
    private generateEncouragement(
        level: 'minimal' | 'moderate' | 'high',
        context: 'weight_logging' | 'breach_recovery'
    ): string {
        const encouragements = {
            weight_logging: {
                minimal: 'Your commitment to tracking is valuable for your health journey.',
                moderate: 'Consistent logging helps you understand your progress patterns and stay connected to your goals.',
                high: 'Every log entry is a victory! You\'re building incredible habits that will serve you for life!'
            },
            breach_recovery: {
                minimal: 'Honesty in logging supports your long-term success.',
                moderate: 'Your honesty and resilience are building blocks for lasting success.',
                high: 'Your courage to log honestly and bounce back shows the heart of a true champion!'
            }
        };

        return encouragements[context][level];
    }

    /**
     * Validate that gamification response avoids unhealthy reinforcement
     */
    validateSafeGamification(response: GamificationResponse): boolean {
        const content = response.message.toLowerCase() + ' ' + response.encouragement.toLowerCase();

        // Check for unsafe patterns
        const hasUnsafePattern = this.unsafePatterns.some(pattern =>
            content.includes(pattern.toLowerCase())
        );

        // Check that rewards are marked as healthy
        const allRewardsHealthy = response.rewards.every(reward => reward.isHealthy !== false);

        // For responses with safety concerns, they should not be considered safe gamification
        // unless they are appropriately handled (e.g., flagged but still supportive)
        const hasCriticalSafetyConcerns = response.safetyChecks.flaggedConcerns.length > 0 &&
            !response.safetyChecks.isHealthyBehavior;

        // Safe gamification means: no unsafe patterns, healthy rewards, and either healthy behavior or appropriate handling
        return !hasUnsafePattern && allRewardsHealthy && !hasCriticalSafetyConcerns;
    }

    /**
     * Adapt gamification to user preferences
     */
    adaptToUserPreferences(
        response: GamificationResponse,
        profile: UserSupportProfile
    ): GamificationResponse {
        const level = profile.preferences.gamificationLevel;

        if (level === 'minimal') {
            // Remove most gamification elements for minimal preference
            return {
                ...response,
                rewards: [],
                achievements: [],
                pointsEarned: 0,
                message: this.simplifyMessage(response.message)
            };
        }

        return response;
    }

    /**
     * Simplify message for minimal gamification
     */
    private simplifyMessage(message: string): string {
        // Remove gamification language while keeping supportive tone
        return message
            .replace(/points?|achievement|reward|streak|level/gi, '')
            .replace(/!/g, '.')
            .replace(/\s+/g, ' ')
            .trim();
    }

    /**
     * Check if behavior reinforces consistency and honesty
     */
    validateConsistencyAndHonestyReward(
        response: GamificationResponse,
        metrics: ConsistencyMetrics
    ): boolean {
        // Verify that rewards are given for consistency (logging streak)
        const hasConsistencyReward = response.rewards.some(reward =>
            reward.type === 'consistency_reward' && metrics.loggingStreak >= 7
        );

        // Verify that honesty is rewarded (breach logging)
        const hasHonestyReward = response.rewards.some(reward =>
            reward.type === 'honesty_reward'
        );

        // At least one should be true for a valid response
        return hasConsistencyReward || hasHonestyReward || response.rewards.length === 0;
    }
}