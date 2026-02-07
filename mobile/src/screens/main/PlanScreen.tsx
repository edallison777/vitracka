import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { theme } from '@/theme';

const PlanScreen: React.FC = () => {
    const { profile } = useSelector((state: RootState) => state.user);
    const [selectedPlanType, setSelectedPlanType] = useState<'calorie' | 'points' | 'plate' | 'custom'>('calorie');
    const [dailyTarget, setDailyTarget] = useState('');
    const [todayLog, setTodayLog] = useState('');
    const [mealNotes, setMealNotes] = useState('');

    const planTypes = [
        {
            id: 'calorie' as const,
            title: 'Calorie Counting',
            description: 'Track daily calorie intake',
            unit: 'calories',
        },
        {
            id: 'points' as const,
            title: 'Points System',
            description: 'Use a points-based approach',
            unit: 'points',
        },
        {
            id: 'plate' as const,
            title: 'Plate Method',
            description: 'Visual portion control',
            unit: 'servings',
        },
        {
            id: 'custom' as const,
            title: 'Custom Plan',
            description: 'Your own tracking method',
            unit: 'units',
        },
    ];

    const handleLogMeal = () => {
        if (!todayLog.trim()) {
            Alert.alert('Missing Information', 'Please enter your meal information.');
            return;
        }

        // TODO: Implement meal logging
        Alert.alert('Success', 'Meal logged successfully!');
        setTodayLog('');
        setMealNotes('');
    };

    const getCurrentPlan = () => {
        return planTypes.find(plan => plan.id === selectedPlanType);
    };

    const currentPlan = getCurrentPlan();

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Eating Plan</Text>
                <Text style={styles.subtitle}>Manage your eating plan and log meals</Text>
            </View>

            <View style={styles.content}>
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Plan Type</Text>
                    <View style={styles.planTypeSelector}>
                        {planTypes.map((plan) => (
                            <TouchableOpacity
                                key={plan.id}
                                style={[
                                    styles.planTypeOption,
                                    selectedPlanType === plan.id && styles.planTypeOptionSelected,
                                ]}
                                onPress={() => setSelectedPlanType(plan.id)}
                            >
                                <Text style={[
                                    styles.planTypeTitle,
                                    selectedPlanType === plan.id && styles.planTypeTitleSelected,
                                ]}>
                                    {plan.title}
                                </Text>
                                <Text style={[
                                    styles.planTypeDescription,
                                    selectedPlanType === plan.id && styles.planTypeDescriptionSelected,
                                ]}>
                                    {plan.description}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Daily Target</Text>
                    <View style={styles.targetInputContainer}>
                        <TextInput
                            style={styles.targetInput}
                            value={dailyTarget}
                            onChangeText={setDailyTarget}
                            placeholder={`Enter daily target ${currentPlan?.unit}`}
                            keyboardType="numeric"
                            placeholderTextColor={theme.colors?.textSecondary}
                        />
                        <Text style={styles.targetUnit}>{currentPlan?.unit}</Text>
                    </View>
                    {dailyTarget && (
                        <Text style={styles.targetDisplay}>
                            Daily Target: {dailyTarget} {currentPlan?.unit}
                        </Text>
                    )}
                </View>

                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Today's Log</Text>
                    <Text style={styles.logHint}>
                        Log what you've eaten today. Be honest - this helps track patterns and progress.
                    </Text>

                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Meals & Intake</Text>
                        <TextInput
                            style={styles.logInput}
                            value={todayLog}
                            onChangeText={setTodayLog}
                            placeholder={`e.g., Breakfast: 400 ${currentPlan?.unit}, Lunch: 500 ${currentPlan?.unit}...`}
                            placeholderTextColor={theme.colors?.textSecondary}
                            multiline
                            numberOfLines={4}
                            textAlignVertical="top"
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Notes (optional)</Text>
                        <TextInput
                            style={styles.notesInput}
                            value={mealNotes}
                            onChangeText={setMealNotes}
                            placeholder="How did you feel? Any challenges or wins?"
                            placeholderTextColor={theme.colors?.textSecondary}
                            multiline
                            numberOfLines={3}
                            textAlignVertical="top"
                        />
                    </View>

                    <TouchableOpacity
                        style={styles.logButton}
                        onPress={handleLogMeal}
                    >
                        <Text style={styles.logButtonText}>Log Today's Meals</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Helpful Tips</Text>
                    <View style={styles.tipsList}>
                        <Text style={styles.tip}>
                            • Be honest with your logging - it helps identify patterns
                        </Text>
                        <Text style={styles.tip}>
                            • If you go over your target, that's okay - focus on getting back on track
                        </Text>
                        <Text style={styles.tip}>
                            • Consider logging throughout the day rather than all at once
                        </Text>
                        <Text style={styles.tip}>
                            • Note how different foods make you feel
                        </Text>
                    </View>
                </View>

                {profile?.medicalContext.onGLP1Medication && (
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>GLP-1 Medication Support</Text>
                        <Text style={styles.medicationNote}>
                            Since you're taking GLP-1 medication, focus on eating enough nutritious food
                            rather than restricting. Your medication helps with appetite - listen to your body's signals.
                        </Text>
                    </View>
                )}
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors?.background,
    },
    header: {
        padding: theme.spacing.lg,
        paddingTop: theme.spacing.xxl,
    },
    title: {
        ...theme.typography.h1,
        color: theme.colors?.text,
        marginBottom: theme.spacing.xs,
    },
    subtitle: {
        ...theme.typography.body,
        color: theme.colors?.textSecondary,
    },
    content: {
        padding: theme.spacing.lg,
        gap: theme.spacing.lg,
    },
    card: {
        backgroundColor: theme.colors?.surface,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.lg,
        ...theme.shadows?.small,
    },
    cardTitle: {
        ...theme.typography.h3,
        color: theme.colors?.text,
        marginBottom: theme.spacing.md,
    },
    planTypeSelector: {
        gap: theme.spacing.sm,
    },
    planTypeOption: {
        backgroundColor: theme.colors?.background,
        borderWidth: 2,
        borderColor: theme.colors?.border,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
    },
    planTypeOptionSelected: {
        borderColor: theme.colors?.primary,
        backgroundColor: theme.colors?.primary + '10',
    },
    planTypeTitle: {
        ...theme.typography.body,
        color: theme.colors?.text,
        fontWeight: '600',
        marginBottom: theme.spacing.xs,
    },
    planTypeTitleSelected: {
        color: theme.colors?.primary,
    },
    planTypeDescription: {
        ...theme.typography.caption,
        color: theme.colors?.textSecondary,
    },
    planTypeDescriptionSelected: {
        color: theme.colors?.text,
    },
    targetInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.md,
    },
    targetInput: {
        flex: 1,
        backgroundColor: theme.colors?.background,
        borderWidth: 1,
        borderColor: theme.colors?.border,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        ...theme.typography.body,
        color: theme.colors?.text,
    },
    targetUnit: {
        ...theme.typography.body,
        color: theme.colors?.textSecondary,
        fontWeight: '600',
    },
    targetDisplay: {
        ...theme.typography.body,
        color: theme.colors?.primary,
        fontWeight: '600',
        marginTop: theme.spacing.sm,
        textAlign: 'center',
    },
    logHint: {
        ...theme.typography.caption,
        color: theme.colors?.textSecondary,
        marginBottom: theme.spacing.md,
        fontStyle: 'italic',
    },
    inputGroup: {
        marginBottom: theme.spacing.md,
    },
    inputLabel: {
        ...theme.typography.body,
        color: theme.colors?.text,
        fontWeight: '600',
        marginBottom: theme.spacing.sm,
    },
    logInput: {
        backgroundColor: theme.colors?.background,
        borderWidth: 1,
        borderColor: theme.colors?.border,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        ...theme.typography.body,
        color: theme.colors?.text,
        minHeight: 100,
    },
    notesInput: {
        backgroundColor: theme.colors?.background,
        borderWidth: 1,
        borderColor: theme.colors?.border,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        ...theme.typography.body,
        color: theme.colors?.text,
        minHeight: 80,
    },
    logButton: {
        backgroundColor: theme.colors?.primary,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        alignItems: 'center',
        marginTop: theme.spacing.md,
    },
    logButtonText: {
        ...theme.typography.body,
        color: '#FFFFFF',
        fontWeight: '600',
    },
    tipsList: {
        gap: theme.spacing.sm,
    },
    tip: {
        ...theme.typography.body,
        color: theme.colors?.text,
        lineHeight: 22,
    },
    medicationNote: {
        ...theme.typography.body,
        color: theme.colors?.text,
        lineHeight: 22,
        backgroundColor: theme.colors?.primary + '10',
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        borderLeftWidth: 4,
        borderLeftColor: theme.colors?.primary,
    },
});

export default PlanScreen;