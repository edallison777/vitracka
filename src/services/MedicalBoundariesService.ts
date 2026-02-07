/**
 * Medical Boundaries Service
 * Implements the Medical Boundaries agent for medical advice detection
 * Ensures consistent messaging about medical advice limitations and clinician referrals
 */

export interface MedicalBoundaryResponse {
    isMedicalAdviceRequest: boolean;
    shouldRedirect: boolean;
    redirectResponse: string;
    detectedMedicalTopics: string[];
    requiresClinicianReferral: boolean;
}

export interface MedicalAdviceDetection {
    detected: boolean;
    medicalTopics: string[];
    severity: 'low' | 'medium' | 'high';
    requiresImmediate: boolean;
}

export class MedicalBoundariesService {
    // Medical advice request patterns organized by category
    private readonly medicalAdvicePatterns = {
        diagnosis: [
            'what\'s wrong with me', 'what\'s wrong with my symptoms', 'do i have', 'am i sick', 'is this normal',
            'diagnose', 'what condition', 'what disease', 'what illness',
            'medical condition', 'health problem', 'symptoms mean',
            'is this serious', 'should i be worried', 'what\'s causing'
        ],
        treatment: [
            'how to treat', 'how do i treat', 'what should i take', 'what medication should i take', 'medication for',
            'cure for', 'treatment for', 'how to fix', 'remedy for',
            'prescription', 'dosage', 'how much medicine', 'right dosage',
            'side effects', 'drug interaction', 'stop taking', 'should i stop taking',
            'increase dose', 'decrease dose', 'change medication'
        ],
        medical_decisions: [
            'should i see a doctor', 'do i need surgery', 'is surgery necessary',
            'medical procedure', 'operation', 'biopsy', 'scan results',
            'blood test results', 'lab results', 'x-ray shows',
            'mri results', 'ct scan', 'ultrasound results'
        ],
        weight_loss_medical: [
            'weight loss surgery', 'bariatric surgery', 'gastric bypass',
            'lap band', 'stomach stapling', 'liposuction',
            'weight loss medication', 'diet pills', 'appetite suppressants',
            'glp-1 dosage', 'semaglutide dose', 'ozempic dose',
            'wegovy dose', 'mounjaro dose', 'medication adjustment',
            'ozempic', 'semaglutide', 'adjust my glp-1', 'increase my ozempic'
        ],
        substantial_weight_loss: [
            'lose 50 pounds', 'lose 100 pounds', 'rapid weight loss',
            'extreme weight loss', 'crash diet', 'very low calorie',
            'starvation diet', 'lose weight fast', 'quick weight loss',
            'dramatic weight loss', 'massive weight loss'
        ]
    };

    private readonly clinicianReferralMessages = {
        general_medical: {
            message: "I can't provide medical advice, but I encourage you to speak with a healthcare professional about your concerns.",
            resources: [
                "Your primary care doctor is the best person to evaluate your symptoms",
                "Consider scheduling an appointment to discuss your health concerns",
                "If this is urgent, don't hesitate to seek immediate medical attention"
            ]
        },
        substantial_weight_loss: {
            message: "For substantial weight loss goals, it's important to work with healthcare professionals who can ensure your safety and success.",
            resources: [
                "A doctor can help create a safe, effective weight loss plan",
                "Consider consulting with a registered dietitian",
                "Your healthcare provider can monitor your progress and adjust as needed",
                "They can also discuss whether weight loss medications might be appropriate"
            ]
        },
        medication_related: {
            message: "I can't provide advice about medications. Please consult with your healthcare provider about any medication questions.",
            resources: [
                "Your doctor prescribed your medication for specific reasons",
                "Never adjust medication doses without medical supervision",
                "Contact your healthcare provider if you're experiencing side effects",
                "Your pharmacist can also answer medication-related questions"
            ]
        },
        urgent_medical: {
            message: "What you're describing sounds like it needs immediate medical attention.",
            resources: [
                "Contact your healthcare provider right away",
                "If this is an emergency, call 911 or go to the emergency room",
                "Don't delay seeking medical care for concerning symptoms"
            ]
        }
    };

    private readonly medicalDisclaimers = [
        "I'm not a medical professional and can't provide medical advice.",
        "This app is for educational and motivational purposes only.",
        "Always consult with qualified healthcare professionals for medical decisions.",
        "I can support your wellness journey, but medical guidance should come from your doctor."
    ];

    /**
     * Process a user message to detect medical advice requests
     */
    processMessage(message: string): MedicalBoundaryResponse {
        const detection = this.detectMedicalAdviceRequest(message);

        if (!detection.detected) {
            return {
                isMedicalAdviceRequest: false,
                shouldRedirect: false,
                redirectResponse: '',
                detectedMedicalTopics: [],
                requiresClinicianReferral: false
            };
        }

        const response = this.generateClinicianReferralResponse(detection);

        return {
            isMedicalAdviceRequest: true,
            shouldRedirect: true,
            redirectResponse: response,
            detectedMedicalTopics: detection.medicalTopics,
            requiresClinicianReferral: true
        };
    }

    /**
     * Detect medical advice requests in user input
     */
    private detectMedicalAdviceRequest(message: string): MedicalAdviceDetection {
        const lowerMessage = message.toLowerCase();
        const detectedTopics: string[] = [];
        let highestSeverity: 'low' | 'medium' | 'high' = 'low';
        let requiresImmediate = false;

        // Check each category of medical advice patterns
        for (const [category, patterns] of Object.entries(this.medicalAdvicePatterns)) {
            for (const pattern of patterns) {
                if (lowerMessage.includes(pattern.toLowerCase())) {
                    detectedTopics.push(pattern);

                    // Determine severity based on category
                    if (category === 'substantial_weight_loss' || category === 'weight_loss_medical') {
                        highestSeverity = 'high';
                    } else if (category === 'treatment' || category === 'medical_decisions') {
                        if (highestSeverity !== 'high') {
                            highestSeverity = 'medium';
                        }
                    }

                    // Check for urgent medical situations
                    if (category === 'medical_decisions' && (
                        pattern.includes('surgery') ||
                        pattern.includes('emergency') ||
                        lowerMessage.includes('urgent') ||
                        lowerMessage.includes('emergency')
                    )) {
                        requiresImmediate = true;
                        highestSeverity = 'high';
                    }
                }
            }
        }

        // Additional checks for numerical weight loss goals
        const weightLossNumbers = lowerMessage.match(/lose\s+(\d+)\s*(pounds?|lbs?|kg|kilograms?)/i);
        if (weightLossNumbers) {
            const amount = parseInt(weightLossNumbers[1]);
            if (amount >= 30) { // 30+ pounds is substantial
                detectedTopics.push(`lose ${amount} ${weightLossNumbers[2]}`);
                highestSeverity = 'high';
            }
        }

        return {
            detected: detectedTopics.length > 0,
            medicalTopics: detectedTopics,
            severity: highestSeverity,
            requiresImmediate
        };
    }

    /**
     * Generate appropriate clinician referral response
     */
    private generateClinicianReferralResponse(detection: MedicalAdviceDetection): string {
        let referralKey: keyof typeof this.clinicianReferralMessages;

        // Determine appropriate referral message based on detected topics
        if (detection.requiresImmediate) {
            referralKey = 'urgent_medical';
        } else if (detection.medicalTopics.some(topic =>
            topic.includes('medication') ||
            topic.includes('dose') ||
            topic.includes('prescription') ||
            topic.includes('glp-1') ||
            topic.includes('semaglutide') ||
            topic.includes('ozempic')
        )) {
            referralKey = 'medication_related';
        } else if (detection.medicalTopics.some(topic =>
            topic.includes('lose') && /\d+/.test(topic) ||
            topic.includes('surgery') ||
            topic.includes('rapid') ||
            topic.includes('extreme') ||
            topic.includes('substantial')
        )) {
            referralKey = 'substantial_weight_loss';
        } else {
            referralKey = 'general_medical';
        }

        const referralMessage = this.clinicianReferralMessages[referralKey];
        const disclaimer = this.getRandomDisclaimer();

        return `${disclaimer}\n\n${referralMessage.message}\n\n${referralMessage.resources.join('\n')}\n\nI'm here to support your wellness journey in ways that complement professional medical care.`;
    }

    /**
     * Check if a response contains medical advice that should be blocked
     */
    checkResponseForMedicalAdvice(response: string): {
        containsMedicalAdvice: boolean;
        violations: string[];
        shouldBlock: boolean;
        alternativeResponse?: string;
    } {
        const lowerResponse = response.toLowerCase();
        const violations: string[] = [];

        // Patterns that indicate medical advice in responses
        const medicalAdviceViolations = [
            'you should take', 'i recommend taking', 'i recommend increasing', 'try this medication', 'try this prescription',
            'increase your dose', 'decrease your dose', 'stop taking',
            'you have', 'you might have', 'this could be', 'probably',
            'likely diagnosis', 'sounds like you have', 'appears to be',
            'medical condition', 'you need surgery', 'surgery is recommended',
            'see a doctor if', 'no need to see a doctor', 'don\'t worry about'
        ];

        for (const violation of medicalAdviceViolations) {
            if (lowerResponse.includes(violation)) {
                violations.push(violation);
            }
        }

        const shouldBlock = violations.length > 0;
        let alternativeResponse: string | undefined;

        if (shouldBlock) {
            alternativeResponse = `${this.getRandomDisclaimer()}\n\nI want to be helpful, but I need to stay within appropriate boundaries. For medical questions or concerns, please consult with your healthcare provider who can give you personalized, professional guidance.\n\nI'm here to support your wellness journey in other ways!`;
        }

        return {
            containsMedicalAdvice: shouldBlock,
            violations,
            shouldBlock,
            alternativeResponse
        };
    }

    /**
     * Get a random medical disclaimer
     */
    private getRandomDisclaimer(): string {
        const randomIndex = Math.floor(Math.random() * this.medicalDisclaimers.length);
        return this.medicalDisclaimers[randomIndex];
    }

    /**
     * Check if substantial weight loss requires medical supervision
     */
    assessWeightLossGoal(currentWeight: number, targetWeight: number, timeframe: number): {
        requiresMedicalSupervision: boolean;
        reason: string;
        recommendation: string;
    } {
        const totalLoss = currentWeight - targetWeight;
        const weeklyLoss = totalLoss / timeframe;
        const percentageLoss = (totalLoss / currentWeight) * 100;

        // Medical supervision criteria
        const requiresSupervision =
            totalLoss >= 30 || // 30+ pounds total
            weeklyLoss > 2 || // More than 2 pounds per week
            percentageLoss > 10; // More than 10% of body weight

        if (!requiresSupervision) {
            return {
                requiresMedicalSupervision: false,
                reason: 'Goal appears to be within safe parameters',
                recommendation: 'Continue with your planned approach and monitor your progress'
            };
        }

        let reason = '';
        if (totalLoss >= 30) {
            reason = 'Substantial weight loss (30+ pounds) benefits from medical supervision';
        } else if (weeklyLoss > 2) {
            reason = 'Rapid weight loss (>2 lbs/week) should be medically supervised';
        } else if (percentageLoss > 10) {
            reason = 'Losing >10% of body weight should be medically supervised';
        }

        return {
            requiresMedicalSupervision: true,
            reason,
            recommendation: 'I encourage you to discuss this goal with your healthcare provider. They can help create a safe, effective plan and monitor your progress to ensure your health and success.'
        };
    }
}