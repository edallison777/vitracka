import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useDispatch } from 'react-redux';
import { OnboardingStackParamList } from '@/navigation/OnboardingNavigator';
import { theme } from '@/theme';
import { AppDispatch } from '@/store';

type GoalsScreenNavigationProp = StackNavigationProp<OnboardingStackParamList, 'Goals'>;

interface Props {
    navigation: GoalsScreenNavigationProp;
}

const GoalsScreen: React.FC<Props> = ({ navigation }) => {
    const dispatch = useDispatch<AppDispatch>();
    const [selectedGoal, setSelectedGoal] = useState<'loss' | 'maintenance' | 'transition' | null>(null);
    const [targetWeight, setTargetWeight] = useState('');
    const [timeframe, setTimeframe] = useState('');
    const [weeklyGoal, setWeeklyGoal] = useState('');

    const goals = [
        {
            id: 'loss' as const,
            title: 'Weight Loss',
            description: 'I want to lose weight in a healthy, sustainable way',
        },
        {
            id: 'maintenance' as const,
            title: 'Weight Maintenance',
            description: 'I want to maintain my current weight and build healthy habits',
        },
        {
            id: 'transition' as const,
            title: 'Medication Transition',
            description: 'I\'m transitioning off weight-loss medication and need support',
        },
    ];

    const handleContinue = () => {
        if (selectedGoal) {
            // Store goal data for later profile creation
            const goalData = {
                type: selectedGoal,
                targetWeight: targetWeight ? parseFloat(targetWeight) : undefined,
                timeframe: timeframe || undefined,
                weeklyGoal: weeklyGoal ? parseFloat(weeklyGoal) : undefined,
            };

            // TODO: Store in temporary state or pass to next screen
            navigation.navigate('Preferences', { goalData });
        }
    };

    return (
        <View style={styles.container}>
            <ScrollView style={styles.content}>
                <Text style={styles.title}>What's your primary goal?</Text>
                <Text style={styles.subtitle}>
                    This helps us provide the most relevant support and coaching
                </Text>

                <View style={styles.goalsList}>
                    {goals.map((goal) => (
                        <TouchableOpacity
                            key={goal.id}
                            style={[
                                styles.goalOption,
                                selectedGoal === goal.id && styles.goalOptionSelected,
                            ]}
                            onPress={() => setSelectedGoal(goal.id)}
                        >
                            <Text style={[
                                styles.goalTitle,
                                selectedGoal === goal.id && styles.goalTitleSelected,
                            ]}>
                                {goal.title}
                            </Text>
                            <Text style={[
                                styles.goalDescription,
                                selectedGoal === goal.id && styles.goalDescriptionSelected,
                            ]}>
                                {goal.description}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {selectedGoal === 'loss' && (
                    <View style={styles.additionalInputs}>
                        <Text style={styles.inputLabel}>Target Weight (optional)</Text>
                        <TextInput
                            style={styles.textInput}
                            value={targetWeight}
                            onChangeText={setTargetWeight}
                            placeholder="e.g., 70"
                            keyboardType="numeric"
                            placeholderTextColor={theme.colors?.textSecondary}
                        />

                        <Text style={styles.inputLabel}>Timeframe (optional)</Text>
                        <TextInput
                            style={styles.textInput}
                            value={timeframe}
                            onChangeText={setTimeframe}
                            placeholder="e.g., 6 months"
                            placeholderTextColor={theme.colors?.textSecondary}
                        />

                        <Text style={styles.inputLabel}>Weekly Goal (optional)</Text>
                        <TextInput
                            style={styles.textInput}
                            value={weeklyGoal}
                            onChangeText={setWeeklyGoal}
                            placeholder="e.g., 0.5 kg per week"
                            keyboardType="numeric"
                            placeholderTextColor={theme.colors?.textSecondary}
                        />
                    </View>
                )}
            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity
                    style={[
                        styles.continueButton,
                        !selectedGoal && styles.continueButtonDisabled,
                    ]}
                    onPress={handleContinue}
                    disabled={!selectedGoal}
                >
                    <Text style={[
                        styles.continueButtonText,
                        !selectedGoal && styles.continueButtonTextDisabled,
                    ]}>
                        Continue
                    </Text>
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
        marginBottom: theme.spacing.xl,
    },
    goalsList: {
        gap: theme.spacing.md,
    },
    goalOption: {
        backgroundColor: theme.colors?.surface,
        borderWidth: 2,
        borderColor: theme.colors?.border,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.lg,
    },
    goalOptionSelected: {
        borderColor: theme.colors?.primary,
        backgroundColor: theme.colors?.primary + '10',
    },
    goalTitle: {
        ...theme.typography.h3,
        color: theme.colors?.text,
        marginBottom: theme.spacing.xs,
    },
    goalTitleSelected: {
        color: theme.colors?.primary,
    },
    goalDescription: {
        ...theme.typography.body,
        color: theme.colors?.textSecondary,
    },
    goalDescriptionSelected: {
        color: theme.colors?.text,
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
    continueButtonDisabled: {
        backgroundColor: theme.colors?.border,
    },
    continueButtonText: {
        ...theme.typography.body,
        color: '#FFFFFF',
        fontWeight: '600',
    },
    continueButtonTextDisabled: {
        color: theme.colors?.textSecondary,
    },
    additionalInputs: {
        marginTop: theme.spacing.lg,
        gap: theme.spacing.md,
    },
    inputLabel: {
        ...theme.typography.body,
        color: theme.colors?.text,
        fontWeight: '600',
        marginBottom: theme.spacing.xs,
    },
    textInput: {
        backgroundColor: theme.colors?.surface,
        borderWidth: 1,
        borderColor: theme.colors?.border,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        ...theme.typography.body,
        color: theme.colors?.text,
    },
});

export default GoalsScreen;