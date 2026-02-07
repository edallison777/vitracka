/**
 * Safety-related type definitions
 * Types for safety interventions, triggers, and escalation levels
 */

export type TriggerType = 'eating_disorder' | 'self_harm' | 'depression' | 'medical_emergency';

export type EscalationLevel = 'low' | 'medium' | 'high' | 'critical';

export interface SafetyIntervention {
    id: string;
    userId: string;
    triggerType: TriggerType;
    triggerContent: string;
    agentResponse: string;
    escalationLevel: EscalationLevel;
    adminNotified: boolean;
    followUpRequired: boolean;
    timestamp: Date;
}