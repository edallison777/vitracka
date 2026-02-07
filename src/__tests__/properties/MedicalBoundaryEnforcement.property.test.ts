/**
 * Property-Based Tests for Medical Boundary Enforcement
 * Tests Property 4: Medical Boundary Enforcement
 * Validates: Requirements 2.2, 2.3
 */

import * as fc from 'fast-check';
import { MedicalBoundariesService } from '../../services/MedicalBoundariesService';

describe('Medical Boundary Enforcement Properties', () => {
    let medicalBoundaries: MedicalBoundariesService;

    beforeEach(() => {
        medicalBoundaries = new MedicalBoundariesService();
    });

    /**
     * Property 4: Medical Boundary Enforcement
     * For any request for medical advice, diagnosis, or treatment recommendations, 
     * the system should defer to clinicians and provide appropriate professional 
     * referral guidance
     * **Validates: Requirements 2.2, 2.3**
     */
    describe('Property 4: Medical Boundary Enforcement', () => {
        // Custom arbitraries for generating medical advice requests
        const diagnosisRequests = fc.constantFrom(
            'what\'s wrong with me', 'do i have', 'am i sick', 'is this normal',
            'diagnose', 'what condition', 'what disease', 'what illness',
            'medical condition', 'health problem', 'symptoms mean',
            'is this serious', 'should i be worried', 'what\'s causing'
        );

        const treatmentRequests = fc.constantFrom(
            'how to treat', 'what should i take', 'medication for',
            'cure for', 'treatment for', 'how to fix', 'remedy for',
            'prescription', 'dosage', 'how much medicine',
            'side effects', 'drug interaction', 'stop taking',
            'increase dose', 'decrease dose', 'change medication'
        );

        const medicalDecisionRequests = fc.constantFrom(
            'should i see a doctor', 'do i need surgery', 'is surgery necessary',
            'medical procedure', 'operation', 'biopsy', 'scan results',
            'blood test results', 'lab results', 'x-ray shows',
            'mri results', 'ct scan', 'ultrasound results'
        );

        const weightLossMedicalRequests = fc.constantFrom(
            'weight loss surgery', 'bariatric surgery', 'gastric bypass',
            'lap band', 'stomach stapling', 'liposuction',
            'weight loss medication', 'diet pills', 'appetite suppressants',
            'glp-1 dosage', 'semaglutide dose', 'ozempic dose',
            'wegovy dose', 'mounjaro dose', 'medication adjustment'
        );

        const substantialWeightLossRequests = fc.constantFrom(
            'lose 50 pounds', 'lose 100 pounds', 'rapid weight loss',
            'extreme weight loss', 'crash diet', 'very low calorie',
            'starvation diet', 'lose weight fast', 'quick weight loss',
            'dramatic weight loss', 'massive weight loss'
        );

        const allMedicalRequests = fc.oneof(
            diagnosisRequests,
            treatmentRequests,
            medicalDecisionRequests,
            weightLossMedicalRequests,
            substantialWeightLossRequests
        );

        it('should detect and redirect diagnosis requests to clinicians', () => {
            return fc.assert(
                fc.property(
                    fc.record({
                        medicalRequest: diagnosisRequests,
                        contextBefore: fc.string({ minLength: 0, maxLength: 50 }),
                        contextAfter: fc.string({ minLength: 0, maxLength: 50 })
                    }),
                    (testData) => {
                        // Feature: vitracka-weight-management, Property 4: Medical Boundary Enforcement

                        const message = `${testData.contextBefore} ${testData.medicalRequest} ${testData.contextAfter}`.trim();
                        const response = medicalBoundaries.processMessage(message);

                        // Should detect medical advice request
                        expect(response.isMedicalAdviceRequest).toBe(true);

                        // Should redirect to clinician
                        expect(response.shouldRedirect).toBe(true);
                        expect(response.requiresClinicianReferral).toBe(true);

                        // Should include appropriate disclaimer and referral
                        expect(response.redirectResponse).toContain('medical');
                        expect(response.redirectResponse).toContain('healthcare');
                        expect(response.redirectResponse.toLowerCase()).toMatch(/doctor|healthcare|professional|provider/);

                        // Should include medical disclaimer
                        expect(response.redirectResponse.toLowerCase()).toMatch(/not.*medical.*professional|can't.*provide.*medical.*advice|educational.*purposes/i);

                        // Should detect the medical topic
                        expect(response.detectedMedicalTopics.length).toBeGreaterThan(0);
                        expect(response.detectedMedicalTopics.some(topic =>
                            message.toLowerCase().includes(topic.toLowerCase())
                        )).toBe(true);
                    }
                ),
                { numRuns: 50 }
            );
        });

        it('should detect and redirect treatment requests to clinicians', () => {
            return fc.assert(
                fc.property(
                    fc.record({
                        treatmentRequest: treatmentRequests,
                        contextBefore: fc.string({ minLength: 0, maxLength: 50 }),
                        contextAfter: fc.string({ minLength: 0, maxLength: 50 })
                    }),
                    (testData) => {
                        // Feature: vitracka-weight-management, Property 4: Medical Boundary Enforcement

                        const message = `${testData.contextBefore} ${testData.treatmentRequest} ${testData.contextAfter}`.trim();
                        const response = medicalBoundaries.processMessage(message);

                        // Should detect medical advice request
                        expect(response.isMedicalAdviceRequest).toBe(true);

                        // Should redirect to clinician
                        expect(response.shouldRedirect).toBe(true);
                        expect(response.requiresClinicianReferral).toBe(true);

                        // Should defer to clinicians for treatment decisions
                        expect(response.redirectResponse).toContain('healthcare');
                        expect(response.redirectResponse.toLowerCase()).toMatch(/consult|speak.*with|contact.*provider/i);

                        // Should include medical disclaimer
                        expect(response.redirectResponse.toLowerCase()).toMatch(/can't.*provide.*advice|healthcare.*professional/i);

                        // Should detect the medical topic
                        expect(response.detectedMedicalTopics.length).toBeGreaterThan(0);
                    }
                ),
                { numRuns: 50 }
            );
        });

        it('should detect and redirect substantial weight loss requests to healthcare professionals', () => {
            return fc.assert(
                fc.property(
                    fc.record({
                        weightLossRequest: substantialWeightLossRequests,
                        contextBefore: fc.string({ minLength: 0, maxLength: 50 }),
                        contextAfter: fc.string({ minLength: 0, maxLength: 50 })
                    }),
                    (testData) => {
                        // Feature: vitracka-weight-management, Property 4: Medical Boundary Enforcement

                        const message = `${testData.contextBefore} ${testData.weightLossRequest} ${testData.contextAfter}`.trim();
                        const response = medicalBoundaries.processMessage(message);

                        // Should detect medical advice request for substantial weight loss
                        expect(response.isMedicalAdviceRequest).toBe(true);

                        // Should redirect to healthcare professionals (Requirement 2.2)
                        expect(response.shouldRedirect).toBe(true);
                        expect(response.requiresClinicianReferral).toBe(true);

                        // Should encourage consultation with healthcare professionals
                        expect(response.redirectResponse.toLowerCase()).toMatch(/healthcare.*professional|doctor|medical.*supervision/i);

                        // Should mention safety and professional guidance
                        expect(response.redirectResponse.toLowerCase()).toMatch(/safe|safety|professional|supervision/i);

                        // Should detect the weight loss topic
                        expect(response.detectedMedicalTopics.length).toBeGreaterThan(0);
                    }
                ),
                { numRuns: 50 }
            );
        });

        it('should detect and redirect medication-related requests to clinicians', () => {
            return fc.assert(
                fc.property(
                    fc.record({
                        medicationRequest: weightLossMedicalRequests,
                        contextBefore: fc.string({ minLength: 0, maxLength: 50 }),
                        contextAfter: fc.string({ minLength: 0, maxLength: 50 })
                    }),
                    (testData) => {
                        // Feature: vitracka-weight-management, Property 4: Medical Boundary Enforcement

                        const message = `${testData.contextBefore} ${testData.medicationRequest} ${testData.contextAfter}`.trim();
                        const response = medicalBoundaries.processMessage(message);

                        // Should detect medical advice request
                        expect(response.isMedicalAdviceRequest).toBe(true);

                        // Should defer medication decisions to clinicians (Requirement 2.3)
                        expect(response.shouldRedirect).toBe(true);
                        expect(response.requiresClinicianReferral).toBe(true);

                        // Should specifically address medication concerns or healthcare
                        expect(response.redirectResponse.toLowerCase()).toMatch(/healthcare.*provider|your.*doctor/i);

                        // Should warn against self-adjustment or mention medical supervision
                        expect(response.redirectResponse.toLowerCase()).toMatch(/healthcare.*provider|your.*doctor/i);

                        // Should detect the medication topic
                        expect(response.detectedMedicalTopics.length).toBeGreaterThan(0);
                    }
                ),
                { numRuns: 50 }
            );
        });

        it('should not redirect non-medical wellness and coaching requests', () => {
            return fc.assert(
                fc.property(
                    fc.record({
                        wellnessMessage: fc.constantFrom(
                            'I feel motivated today',
                            'What healthy snacks do you recommend',
                            'How can I stay consistent with my goals',
                            'I had a good workout',
                            'Tell me about portion control',
                            'What are some healthy recipes',
                            'How do I track my progress',
                            'I need encouragement',
                            'What\'s a good exercise routine',
                            'How do I build healthy habits'
                        ),
                        contextBefore: fc.string({ minLength: 0, maxLength: 30 }),
                        contextAfter: fc.string({ minLength: 0, maxLength: 30 })
                    }),
                    (testData) => {
                        // Feature: vitracka-weight-management, Property 4: Medical Boundary Enforcement

                        const message = `${testData.contextBefore} ${testData.wellnessMessage} ${testData.contextAfter}`.trim();
                        const response = medicalBoundaries.processMessage(message);

                        // Should NOT detect medical advice request for wellness topics
                        expect(response.isMedicalAdviceRequest).toBe(false);
                        expect(response.shouldRedirect).toBe(false);
                        expect(response.requiresClinicianReferral).toBe(false);

                        // Should have empty redirect response
                        expect(response.redirectResponse).toBe('');
                        expect(response.detectedMedicalTopics).toEqual([]);
                    }
                ),
                { numRuns: 50 }
            );
        });

        it('should assess weight loss goals and require medical supervision for substantial goals', () => {
            return fc.assert(
                fc.property(
                    fc.record({
                        currentWeight: fc.float({ min: 120, max: 300 }), // Reasonable weight range
                        targetWeight: fc.float({ min: 100, max: 280 }),
                        timeframe: fc.integer({ min: 4, max: 52 }) // 4-52 weeks
                    }),
                    (testData) => {
                        // Feature: vitracka-weight-management, Property 4: Medical Boundary Enforcement

                        // Only test when target is less than current (weight loss)
                        if (testData.targetWeight >= testData.currentWeight) {
                            return; // Skip this test case
                        }

                        const assessment = medicalBoundaries.assessWeightLossGoal(
                            testData.currentWeight,
                            testData.targetWeight,
                            testData.timeframe
                        );

                        const totalLoss = testData.currentWeight - testData.targetWeight;
                        const weeklyLoss = totalLoss / testData.timeframe;
                        const percentageLoss = (totalLoss / testData.currentWeight) * 100;

                        // Should require medical supervision for substantial weight loss (Requirement 2.2)
                        if (totalLoss >= 30 || weeklyLoss > 2 || percentageLoss > 10) {
                            expect(assessment.requiresMedicalSupervision).toBe(true);
                            expect(assessment.reason).toBeTruthy();
                            expect(assessment.recommendation.toLowerCase()).toMatch(/healthcare.*provider|doctor|medical/);
                        } else {
                            expect(assessment.requiresMedicalSupervision).toBe(false);
                            expect(assessment.reason).toContain('safe parameters');
                        }
                    }
                ),
                { numRuns: 100 }
            );
        });

        it('should block responses containing medical advice and provide alternatives', () => {
            return fc.assert(
                fc.property(
                    fc.record({
                        medicalAdviceResponse: fc.constantFrom(
                            'You should take this medication',
                            'I recommend increasing your dose',
                            'You probably have diabetes',
                            'This sounds like you have anxiety',
                            'You need surgery for this',
                            'Stop taking your medication',
                            'Try this prescription drug',
                            'You likely have a medical condition'
                        ),
                        contextBefore: fc.string({ minLength: 0, maxLength: 30 }),
                        contextAfter: fc.string({ minLength: 0, maxLength: 30 })
                    }),
                    (testData) => {
                        // Feature: vitracka-weight-management, Property 4: Medical Boundary Enforcement

                        const response = `${testData.contextBefore} ${testData.medicalAdviceResponse} ${testData.contextAfter}`.trim();
                        const check = medicalBoundaries.checkResponseForMedicalAdvice(response);

                        // Should detect medical advice in response
                        expect(check.containsMedicalAdvice).toBe(true);
                        expect(check.shouldBlock).toBe(true);
                        expect(check.violations.length).toBeGreaterThan(0);

                        // Should provide alternative response with disclaimer
                        expect(check.alternativeResponse).toBeTruthy();
                        expect(check.alternativeResponse!.toLowerCase()).toMatch(/healthcare.*provider|consult.*with|appropriate.*boundaries/i);
                        expect(check.alternativeResponse!.toLowerCase()).toMatch(/healthcare.*provider|consult.*with/i);
                    }
                ),
                { numRuns: 50 }
            );
        });
    });
});