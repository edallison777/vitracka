/**
 * Unit Tests for Medical Boundaries Service
 * Tests specific medical advice detection and clinician referral scenarios
 */

import { MedicalBoundariesService } from '../../../services/MedicalBoundariesService';

describe('MedicalBoundariesService', () => {
    let medicalBoundaries: MedicalBoundariesService;

    beforeEach(() => {
        medicalBoundaries = new MedicalBoundariesService();
    });

    describe('Medical Advice Detection', () => {
        it('should detect diagnosis requests', () => {
            const messages = [
                "What's wrong with me?",
                "Do I have diabetes?",
                "Is this normal for my symptoms?",
                "Can you diagnose my condition?"
            ];

            messages.forEach(message => {
                const response = medicalBoundaries.processMessage(message);
                expect(response.isMedicalAdviceRequest).toBe(true);
                expect(response.shouldRedirect).toBe(true);
                expect(response.requiresClinicianReferral).toBe(true);
                expect(response.redirectResponse).toContain('healthcare');
            });
        });

        it('should detect treatment requests', () => {
            const messages = [
                "What medication should I take?",
                "How do I treat this condition?",
                "What's the right dosage for me?",
                "Should I stop taking my medication?"
            ];

            messages.forEach(message => {
                const response = medicalBoundaries.processMessage(message);
                expect(response.isMedicalAdviceRequest).toBe(true);
                expect(response.shouldRedirect).toBe(true);
                expect(response.requiresClinicianReferral).toBe(true);
                expect(response.redirectResponse).toContain('healthcare');
            });
        });

        it('should detect substantial weight loss requests', () => {
            const messages = [
                "I want to lose 50 pounds quickly",
                "How can I lose 100 pounds?",
                "I need rapid weight loss",
                "Tell me about crash diets"
            ];

            messages.forEach(message => {
                const response = medicalBoundaries.processMessage(message);
                expect(response.isMedicalAdviceRequest).toBe(true);
                expect(response.shouldRedirect).toBe(true);
                expect(response.requiresClinicianReferral).toBe(true);
                expect(response.redirectResponse.toLowerCase()).toMatch(/healthcare.*professional|doctor|safety|substantial/);
            });
        });

        it('should detect medication-related requests', () => {
            const messages = [
                "What's the right Ozempic dose?",
                "Should I adjust my GLP-1 medication?",
                "Tell me about weight loss surgery",
                "How much semaglutide should I take?"
            ];

            messages.forEach(message => {
                const response = medicalBoundaries.processMessage(message);
                expect(response.isMedicalAdviceRequest).toBe(true);
                expect(response.shouldRedirect).toBe(true);
                expect(response.requiresClinicianReferral).toBe(true);
                expect(response.redirectResponse).toContain('healthcare');
            });
        });

        it('should NOT detect wellness and coaching requests as medical advice', () => {
            const messages = [
                "I feel motivated today",
                "What healthy snacks do you recommend?",
                "How can I stay consistent?",
                "Tell me about portion control",
                "What's a good exercise routine?",
                "I need encouragement with my goals"
            ];

            messages.forEach(message => {
                const response = medicalBoundaries.processMessage(message);
                expect(response.isMedicalAdviceRequest).toBe(false);
                expect(response.shouldRedirect).toBe(false);
                expect(response.requiresClinicianReferral).toBe(false);
                expect(response.redirectResponse).toBe('');
            });
        });
    });

    describe('Weight Loss Goal Assessment', () => {
        it('should require medical supervision for substantial weight loss (30+ pounds)', () => {
            const assessment = medicalBoundaries.assessWeightLossGoal(200, 160, 20); // 40 pounds in 20 weeks

            expect(assessment.requiresMedicalSupervision).toBe(true);
            expect(assessment.reason).toContain('30+ pounds');
            expect(assessment.recommendation).toContain('healthcare provider');
        });

        it('should require medical supervision for rapid weight loss (>2 lbs/week)', () => {
            const assessment = medicalBoundaries.assessWeightLossGoal(180, 155, 8); // 25 pounds in 8 weeks (3.1 lbs/week)

            expect(assessment.requiresMedicalSupervision).toBe(true);
            expect(assessment.reason).toContain('>2 lbs/week');
            expect(assessment.recommendation).toContain('healthcare provider');
        });

        it('should require medical supervision for >10% body weight loss', () => {
            const assessment = medicalBoundaries.assessWeightLossGoal(150, 130, 20); // 20 pounds = 13.3% of 150

            expect(assessment.requiresMedicalSupervision).toBe(true);
            expect(assessment.reason).toContain('>10%');
            expect(assessment.recommendation).toContain('healthcare provider');
        });

        it('should NOT require medical supervision for moderate goals', () => {
            const assessment = medicalBoundaries.assessWeightLossGoal(180, 165, 16); // 15 pounds in 16 weeks (0.9 lbs/week)

            expect(assessment.requiresMedicalSupervision).toBe(false);
            expect(assessment.reason).toContain('safe parameters');
            expect(assessment.recommendation).toContain('Continue with your planned approach');
        });
    });

    describe('Response Medical Advice Checking', () => {
        it('should block responses containing medical advice', () => {
            const responses = [
                "You should take this medication for your condition",
                "I recommend increasing your dose to 2mg",
                "You probably have diabetes based on your symptoms",
                "This sounds like you have anxiety disorder",
                "You need surgery for this problem"
            ];

            responses.forEach(response => {
                const check = medicalBoundaries.checkResponseForMedicalAdvice(response);
                expect(check.containsMedicalAdvice).toBe(true);
                expect(check.shouldBlock).toBe(true);
                expect(check.violations.length).toBeGreaterThan(0);
                expect(check.alternativeResponse).toBeTruthy();
            });
        });

        it('should NOT block appropriate wellness responses', () => {
            const responses = [
                "Great job on your progress! Keep up the healthy habits.",
                "Here are some nutritious snack ideas for you to try.",
                "Staying consistent with small changes can lead to big results.",
                "Remember to celebrate your victories along the way!",
                "Focus on building sustainable habits rather than quick fixes."
            ];

            responses.forEach(response => {
                const check = medicalBoundaries.checkResponseForMedicalAdvice(response);
                expect(check.containsMedicalAdvice).toBe(false);
                expect(check.shouldBlock).toBe(false);
                expect(check.violations).toEqual([]);
                expect(check.alternativeResponse).toBeUndefined();
            });
        });
    });

    describe('Clinician Referral Messages', () => {
        it('should provide appropriate referral for general medical questions', () => {
            const response = medicalBoundaries.processMessage("What's wrong with my symptoms?");

            expect(response.redirectResponse).toContain('healthcare professional');
            expect(response.redirectResponse).toContain('primary care doctor');
            expect(response.redirectResponse.toLowerCase()).toMatch(/not.*medical.*professional|can't.*provide.*medical.*advice|educational.*purposes/i);
        });

        it('should provide specific guidance for substantial weight loss', () => {
            const response = medicalBoundaries.processMessage("I want to lose 60 pounds fast");

            expect(response.redirectResponse).toContain('substantial weight loss');
            expect(response.redirectResponse).toContain('healthcare professionals');
            expect(response.redirectResponse).toContain('safety');
        });

        it('should provide medication-specific guidance', () => {
            const response = medicalBoundaries.processMessage("Should I increase my Ozempic dose?");

            expect(response.redirectResponse).toContain('medication');
            expect(response.redirectResponse).toContain('healthcare provider');
            expect(response.redirectResponse.toLowerCase()).toMatch(/never.*adjust|medical.*supervision/i);
        });

        it('should include medical disclaimers in all responses', () => {
            const messages = [
                "Do I have diabetes?",
                "What medication should I take?",
                "I want to lose 50 pounds"
            ];

            messages.forEach(message => {
                const response = medicalBoundaries.processMessage(message);
                // Check for any of the actual disclaimer patterns used by the service
                expect(response.redirectResponse.toLowerCase()).toMatch(/not.*medical.*professional|can't.*provide.*medical.*advice|educational.*purposes|always consult.*qualified healthcare/i);
            });
        });
    });

    describe('Edge Cases', () => {
        it('should handle empty messages', () => {
            const response = medicalBoundaries.processMessage("");
            expect(response.isMedicalAdviceRequest).toBe(false);
            expect(response.shouldRedirect).toBe(false);
        });

        it('should handle messages with only whitespace', () => {
            const response = medicalBoundaries.processMessage("   \n\t  ");
            expect(response.isMedicalAdviceRequest).toBe(false);
            expect(response.shouldRedirect).toBe(false);
        });

        it('should detect numerical weight loss goals', () => {
            const messages = [
                "I want to lose 35 pounds",
                "Can I lose 40 lbs quickly?",
                "How to lose 50 kg safely?"
            ];

            messages.forEach(message => {
                const response = medicalBoundaries.processMessage(message);
                expect(response.isMedicalAdviceRequest).toBe(true);
                expect(response.detectedMedicalTopics.some(topic => /\d+/.test(topic))).toBe(true);
            });
        });

        it('should NOT trigger on small weight loss goals', () => {
            const messages = [
                "I want to lose 5 pounds",
                "Can I lose 10 lbs safely?",
                "How to lose 15 pounds gradually?"
            ];

            messages.forEach(message => {
                const response = medicalBoundaries.processMessage(message);
                expect(response.isMedicalAdviceRequest).toBe(false);
            });
        });
    });
});