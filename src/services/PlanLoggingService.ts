/**
 * Plan & Logging Service
 * Handles eating plan adherence tracking, breach logging, and recovery support
 * Implements Property 8: Breach Recovery Support and Property 9: Adherence Tracking Accuracy
 */

import { EatingPlan } from '../types/eating';
import { BreachEvent, BreachRecoveryResponse, AdherenceMetrics } from '../types/breach';
import { EatingPlanRepository } from '../database/repositories/EatingPlanRepository';
import { BreachEventRepository } from '../database/repositories/BreachEventRepository';

export class PlanLoggingService {
    private eatingPlanRepo: EatingPlanRepository;
    private breachEventRepo: BreachEventRepository;

    constructor(
        eatingPlanRepo?: EatingPlanRepository,
        breachEventRepo?: BreachEventRepository
    ) {
        this.eatingPlanRepo = eatingPlanRepo || new EatingPlanRepository();
        this.breachEventRepo = breachEventRepo || new BreachEventRepository();
    }

    /**
     * Process a breach event with recovery-focused messaging
     * Implements Property 8: Breach Recovery Support
     */
    async processBreachEvent(breach: BreachEvent, plan: EatingPlan): Promise<BreachRecoveryResponse> {
        // Store the breach event
        await this.breachEventRepo.create(breach);

        // Generate recovery-focused response
        const response: BreachRecoveryResponse = {
            isRecoveryFocused: true,
            avoidsShame: this.avoidsShameLanguage(breach.description),
            includesRecoveryGuidance: true,
            encouragesHonestLogging: true,
            framesAsRecoverable: true,
            includesGamificationIncentive: this.shouldIncludeGamificationIncentive(breach, plan)
        };

        return response;
    }

    /**
     * Calculate adherence metrics for a user and eating plan
     * Implements Property 9: Adherence Tracking Accuracy
     */
    async calculateAdherence(
        userId: string,
        eatingPlanId: string,
        startDate: Date,
        endDate: Date
    ): Promise<AdherenceMetrics> {
        const stats = await this.breachEventRepo.getAdherenceStats(userId, startDate, endDate);
        const breachEvents = await this.breachEventRepo.findByUserIdInDateRange(userId, startDate, endDate);

        // Calculate average recovery time
        const recoveredBreaches = breachEvents.filter(b => b.isRecovered && b.recoveredAt);
        const averageRecoveryTime = recoveredBreaches.length > 0
            ? recoveredBreaches.reduce((sum, breach) => {
                const recoveryTime = breach.recoveredAt!.getTime() - breach.timestamp.getTime();
                return sum + (recoveryTime / (1000 * 60 * 60)); // Convert to hours
            }, 0) / recoveredBreaches.length
            : 0;

        return {
            userId,
            eatingPlanId,
            period: this.determinePeriod(startDate, endDate),
            startDate,
            endDate,
            totalDays: stats.totalDays,
            adherentDays: Math.max(0, stats.totalDays - stats.breachDays),
            adherenceRate: stats.adherenceRate,
            breachCount: stats.breachCount,
            averageRecoveryTime
        };
    }

    /**
     * Generate recovery guidance for a breach event
     */
    async generateRecoveryGuidance(breach: BreachEvent): Promise<string> {
        const guidanceMessages = {
            minor: [
                "Small setbacks are part of the journey. Let's focus on your next meal and get back on track.",
                "This happens to everyone! What matters is how we move forward from here.",
                "One meal doesn't define your progress. You've got this!"
            ],
            moderate: [
                "It's okay - we all have challenging days. Let's think about what might help you feel more prepared next time.",
                "This is a learning opportunity. What support do you need to get back to your plan?",
                "Your commitment to logging this shows real strength. Let's plan your recovery together."
            ],
            major: [
                "Thank you for being honest about this. That takes courage and shows you're committed to your health.",
                "Difficult days happen, and they don't erase your progress. Let's focus on gentle steps forward.",
                "This is temporary. You have the tools and strength to get back to feeling good about your choices."
            ]
        };

        const messages = guidanceMessages[breach.severity];
        return messages[Math.floor(Math.random() * messages.length)];
    }

    /**
     * Log a breach event with recovery-focused messaging
     */
    async logBreach(
        userId: string,
        eatingPlanId: string,
        description: string,
        severity: 'minor' | 'moderate' | 'major',
        notes?: string
    ): Promise<{ breach: BreachEvent; guidance: string }> {
        const breach: Omit<BreachEvent, 'id'> = {
            userId,
            eatingPlanId,
            timestamp: new Date(),
            description,
            severity,
            isRecovered: false,
            notes
        };

        const createdBreach = await this.breachEventRepo.create(breach);
        const guidance = await this.generateRecoveryGuidance(createdBreach);

        return {
            breach: createdBreach,
            guidance
        };
    }

    /**
     * Mark a breach as recovered with optional recovery plan
     */
    async markBreachRecovered(
        breachId: string,
        recoveryPlan?: string
    ): Promise<BreachEvent | null> {
        return await this.breachEventRepo.markAsRecovered(breachId, recoveryPlan);
    }

    /**
     * Get adherence trends over time
     */
    async getAdherenceTrends(
        userId: string,
        weeks: number = 12
    ): Promise<{ week: number; adherenceRate: number; breachCount: number }[]> {
        const trends: { week: number; adherenceRate: number; breachCount: number }[] = [];
        const now = new Date();

        for (let week = weeks - 1; week >= 0; week--) {
            const weekStart = new Date(now.getTime() - (week + 1) * 7 * 24 * 60 * 60 * 1000);
            const weekEnd = new Date(now.getTime() - week * 7 * 24 * 60 * 60 * 1000);

            const stats = await this.breachEventRepo.getAdherenceStats(userId, weekStart, weekEnd);

            trends.push({
                week: weeks - week,
                adherenceRate: stats.adherenceRate,
                breachCount: stats.breachCount
            });
        }

        return trends;
    }

    /**
     * Get unrecovered breaches for follow-up
     */
    async getUnrecoveredBreaches(userId: string): Promise<BreachEvent[]> {
        return await this.breachEventRepo.findUnrecoveredByUserId(userId);
    }

    /**
     * Check if description avoids shame-based language
     */
    private avoidsShameLanguage(description: string): boolean {
        const shameWords = ['failure', 'failed', 'bad', 'terrible', 'awful', 'worthless', 'stupid'];
        const lowerDescription = description.toLowerCase();
        return !shameWords.some(word => lowerDescription.includes(word));
    }

    /**
     * Determine if gamification incentive should be included
     */
    private shouldIncludeGamificationIncentive(breach: BreachEvent, plan: EatingPlan): boolean {
        // Include incentives for moderate and major breaches to encourage recovery
        // Minor breaches may not need additional incentivization
        return breach.severity !== 'minor';
    }

    /**
     * Determine the period type based on date range
     */
    private determinePeriod(startDate: Date, endDate: Date): 'daily' | 'weekly' | 'monthly' {
        const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

        if (daysDiff <= 1) return 'daily';
        if (daysDiff <= 7) return 'weekly';
        return 'monthly';
    }
}