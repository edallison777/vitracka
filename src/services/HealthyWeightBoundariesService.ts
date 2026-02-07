/**
 * Healthy Weight Boundaries Service
 * Validates weight goals and ensures gradual, sustainable weight loss
 * Requirements: 2.7, 2.8, 2.9
 */

export interface WeightGoal {
    currentWeight: number;
    targetWeight: number;
    timeframe: number; // weeks
    unit: 'kg' | 'lbs';
    height?: number; // cm for BMI calculation
}

export interface WeightGoalValidation {
    isAccepted: boolean;
    suggestsModification: boolean;
    reason?: string;
    recommendedTarget?: number;
    recommendedTimeframe?: number;
    warnings: string[];
}

export class HealthyWeightBoundariesService {
    private static readonly MAX_WEEKLY_LOSS_KG = 1.0;
    private static readonly MIN_BMI = 18.5;
    private static readonly HEALTHY_BMI_RANGE = { min: 18.5, max: 24.9 };

    validateGoal(goal: WeightGoal): WeightGoalValidation {
        const validation: WeightGoalValidation = {
            isAccepted: true,
            suggestsModification: false,
            warnings: []
        };

        const currentWeightKg = goal.unit === 'lbs' ? goal.currentWeight * 0.453592 : goal.currentWeight;
        const targetWeightKg = goal.unit === 'lbs' ? goal.targetWeight * 0.453592 : goal.targetWeight;

        // Handle maintenance scenarios
        if (targetWeightKg >= currentWeightKg) {
            if (goal.height) {
                const heightM = goal.height / 100;
                const currentBMI = currentWeightKg / (heightM * heightM);
                if (currentBMI >= HealthyWeightBoundariesService.HEALTHY_BMI_RANGE.min &&
                    currentBMI <= HealthyWeightBoundariesService.HEALTHY_BMI_RANGE.max) {
                    validation.warnings.push('You are already in a healthy weight range. Consider focusing on maintenance rather than further weight loss.');
                }
            }
            return validation;
        }

        const totalLossKg = currentWeightKg - targetWeightKg;
        const weeklyLossKg = totalLossKg / goal.timeframe;

        // Check BMI first if height is provided - this is a safety boundary that takes priority
        if (goal.height) {
            const heightM = goal.height / 100;
            const targetBMI = targetWeightKg / (heightM * heightM);

            if (targetBMI < HealthyWeightBoundariesService.MIN_BMI) {
                validation.isAccepted = false;
                validation.suggestsModification = true;
                validation.reason = 'Target weight would result in unhealthily low BMI';
                const minHealthyWeightKg = HealthyWeightBoundariesService.MIN_BMI * (heightM * heightM);
                validation.recommendedTarget = goal.unit === 'lbs' ? minHealthyWeightKg / 0.453592 : minHealthyWeightKg;
                validation.warnings.push(`Consider targeting ${Math.round(validation.recommendedTarget * 10) / 10} ${goal.unit} to maintain healthy BMI`);
                return validation; // Return early for BMI violations
            }
        }

        // Check weekly loss rate only if BMI is acceptable
        if (weeklyLossKg > HealthyWeightBoundariesService.MAX_WEEKLY_LOSS_KG) {
            validation.isAccepted = false;
            validation.suggestsModification = true;
            validation.reason = 'Weight loss rate is too aggressive for sustainable results';
            validation.recommendedTimeframe = Math.ceil(totalLossKg / HealthyWeightBoundariesService.MAX_WEEKLY_LOSS_KG);
            validation.warnings.push(`Consider extending timeframe to ${validation.recommendedTimeframe} weeks for gradual, sustainable weight loss`);
        }

        // Always add warnings when modifications are suggested
        if (validation.suggestsModification && validation.warnings.length === 0) {
            validation.warnings.push('Please consider the suggested modifications for safer weight loss');
        }

        return validation;
    }

    isHealthyMaintenanceWeight(weight: number, height: number, unit: 'kg' | 'lbs'): boolean {
        // Handle invalid inputs
        if (!weight || !height || isNaN(weight) || isNaN(height) || weight <= 0 || height <= 0) {
            return false;
        }

        const weightKg = unit === 'lbs' ? weight * 0.453592 : weight;
        const heightM = height / 100;
        const bmi = weightKg / (heightM * heightM);
        return bmi >= HealthyWeightBoundariesService.HEALTHY_BMI_RANGE.min &&
            bmi <= HealthyWeightBoundariesService.HEALTHY_BMI_RANGE.max;
    }

    calculateBMI(weight: number, height: number, unit: 'kg' | 'lbs'): number {
        // Handle invalid inputs
        if (!weight || !height || isNaN(weight) || isNaN(height) || weight <= 0 || height <= 0) {
            return NaN;
        }

        const weightKg = unit === 'lbs' ? weight * 0.453592 : weight;
        const heightM = height / 100;
        return weightKg / (heightM * heightM);
    }

    getEncouragementMessage(validation: WeightGoalValidation): string {
        if (validation.isAccepted && validation.warnings.length === 0) {
            return "Your weight goal looks healthy and achievable. Remember, gradual progress is sustainable progress!";
        }
        if (!validation.isAccepted) {
            return "Let's adjust your goal to ensure safe, sustainable progress. Your health is the priority.";
        }
        return "Your goal is achievable, but please consider the suggestions for the healthiest approach.";
    }
}