import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, Alert } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { OnboardingStackParamList } from '@/navigation/OnboardingNavigator';
import { theme } from '@/theme';

type MedicalContextScreenNavigationProp = StackNavigationProp<OnboardingStackParamList, 'MedicalContext'>;
type MedicalContextScreenRouteProp = RouteProp<OnboardingStackParamList, 'MedicalContext'>;

interface Props {
    navigation: MedicalContextScreenNavigationProp;
    route: MedicalContextScreenRouteProp;
}

const MedicalContextScreen: React.FC<Props> = ({ navigation, route }) => {
    const [onGLP1Medication, setOnGLP1Medication] = useState<boolean | null>(null);
    const [hasClinicianGuidance, setHasClinicianGuidance] = useState<boolean | null>(null);
    const [medicationDetails, setMedicationDetails] = useState('');

    const handleContinue = () => {
        if (onGLP1Medication === null || hasClinicianGuidance === null) {
            Alert.alert('Please Complete', 'Please answer all required questions to continue.');
            return;
        }

        const medicalContextData = {
            onGLP1Medication,
            hasClinicianGuidance,
            medicationDetails: medicationDetails.trim() || undefined,
        };

        navigation.navigate('Completion', {
            goalData: route.params?.goalData,
            preferencesData: route.params?.preferencesData,
            medicalContextData,
        });
    };

    return (
        <View style={styles.container}>
            <ScrollView style={styles.content}>
                <Text style={styles.title}>Medical Context</Text>
                <Text style={styles.subtitle}>
                    This helps us provide appropriate support while respecting medical boundaries
                </Text>
                <Text style={styles.disclaimer}>
                    ⚠️ Vitracka does not provide medical advice. Always consult healthcare professionals for medical decisions.
                </Text>

                <View style={styles.section}>
                    <Text style={styles.questionText}>
                        Are you currently taking GLP-1 medication (like semaglutide, liraglutide, etc.)?
                    </Text>
                    <View style={styles.buttonGroup}>
                        <TouchableOpacity
                            style={[
                                styles.choiceButton,
                                onGLP1Medication === true && styles.choiceButtonSelected,
                            ]}
                            onPress={() => setOnGLP1Medication(true)}
                        >
                            <Text style={[
                                styles.choiceButtonText,
                                onGLP1Medication === true && styles.choiceButtonTextSelected,
                            ]}>
                                Yes
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[
                                styles.choiceButton,
                                onGLP1Medication === false && styles.choiceButtonSelected,
                            ]}
                            onPress={() => setOnGLP1Medication(false)}
                        >
                            <Text style={[
                                styles.choiceButtonText,
                                onGLP1Medication === false && styles.choiceButtonTextSelected,
                            ]}>
                                No
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.questionText}>
                        Do you have guidance from a healthcare professional for your weight management?
                    </Text>
                    <View style={styles.buttonGroup}>
                        <TouchableOpacity
                            style={[
                                styles.choiceButton,
                                hasClinicianGuidance === true && styles.choiceButtonSelected,
                            ]}
                            onPress={() => setHasClinicianGuidance(true)}
                        >
                            <Text style={[
                                styles.choiceButtonText,
                                hasClinicianGuidance === true && styles.choiceButtonTextSelected,
                            ]}>
                                Yes
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[
                                styles.choiceButton,
                                hasClinicianGuidance === false && styles.choiceButtonSelected,
                            ]}
                            onPress={() => setHasClinicianGuidance(false)}
                        >
                            <Text style={[
                                styles.choiceButtonText,
                                hasClinicianGuidance === false && styles.choiceButtonTextSelected,
                            ]}>
                                No
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {onGLP1Medication && (
                    <View style={styles.section}>
                        <Text style={styles.inputLabel}>
                            Medication details (optional)
                        </Text>
                        <Text style={styles.inputHint}>
                            You can share any relevant details about your medication that might help us provide better support
                        </Text>
                        <TextInput
                            style={styles.textArea}
                            value={medicationDetails}
                            onChangeText={setMedicationDetails}
                            placeholder="e.g., Started 3 months ago, experiencing side effects..."
                            placeholderTextColor={theme.colors?.textSecondary}
                            multiline
                            numberOfLines={4}
                            textAlignVertical="top"
                        />
                    </View>
                )}
            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity
                    style={styles.continueButton}
                    onPress={handleContinue}
                >
                    <Text style={styles.continueButtonText}>Continue</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors?.background,
    },
    content: {
        flex: 1,
        padding: theme.spacing.lg,
    },
    title: {
        ...theme.typography.h2,
        color: theme.colors?.text,
        textAlign: 'center',
        marginBottom: theme.spacing.sm,
    },
    subtitle: {
        ...theme.typography.body,
        color: theme.colors?.textSecondary,
        textAlign: 'center',
        marginBottom: theme.spacing.md,
    },
    disclaimer: {
        ...theme.typography.caption,
        color: theme.colors?.warning,
        textAlign: 'center',
        backgroundColor: theme.colors?.warning + '20',
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        marginBottom: theme.spacing.xl,
    },
    section: {
        marginBottom: theme.spacing.xl,
    },
    questionText: {
        ...theme.typography.body,
        color: theme.colors?.text,
        marginBottom: theme.spacing.md,
        fontWeight: '600',
    },
    buttonGroup: {
        flexDirection: 'row',
        gap: theme.spacing.md,
    },
    choiceButton: {
        flex: 1,
        backgroundColor: theme.colors?.surface,
        borderWidth: 2,
        borderColor: theme.colors?.border,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        alignItems: 'center',
    },
    choiceButtonSelected: {
        borderColor: theme.colors?.primary,
        backgroundColor: theme.colors?.primary + '10',
    },
    choiceButtonText: {
        ...theme.typography.body,
        color: theme.colors?.text,
        fontWeight: '600',
    },
    choiceButtonTextSelected: {
        color: theme.colors?.primary,
    },
    inputLabel: {
        ...theme.typography.body,
        color: theme.colors?.text,
        fontWeight: '600',
        marginBottom: theme.spacing.xs,
    },
    inputHint: {
        ...theme.typography.caption,
        color: theme.colors?.textSecondary,
        marginBottom: theme.spacing.sm,
    },
    textArea: {
        backgroundColor: theme.colors?.surface,
        borderWidth: 1,
        borderColor: theme.colors?.border,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        ...theme.typography.body,
        color: theme.colors?.text,
        minHeight: 100,
    },
    footer: {
        padding: theme.spacing.lg,
    },
    continueButton: {
        backgroundColor: theme.colors?.primary,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        alignItems: 'center',
    },
    continueButtonText: {
        ...theme.typography.body,
        color: '#FFFFFF',
        fontWeight: '600',
    },
});

export default MedicalContextScreen;