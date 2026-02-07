import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '@/store';
import { addWeightEntry, fetchWeightEntries } from '@/store/slices/weightSlice';
import { theme } from '@/theme';

const WeightScreen: React.FC = () => {
    const dispatch = useDispatch<AppDispatch>();
    const { user } = useSelector((state: RootState) => state.auth);
    const { entries, isLoading } = useSelector((state: RootState) => state.weight);

    const [weight, setWeight] = useState('');
    const [unit, setUnit] = useState<'kg' | 'lbs'>('kg');
    const [notes, setNotes] = useState('');
    const [mood, setMood] = useState<'great' | 'good' | 'okay' | 'struggling' | null>(null);
    const [confidence, setConfidence] = useState(3);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (user?.id) {
            dispatch(fetchWeightEntries(user.id));
        }
    }, [dispatch, user?.id]);

    const handleSubmit = async () => {
        if (!weight.trim()) {
            Alert.alert('Missing Weight', 'Please enter your weight.');
            return;
        }

        const weightValue = parseFloat(weight);
        if (isNaN(weightValue) || weightValue <= 0) {
            Alert.alert('Invalid Weight', 'Please enter a valid weight.');
            return;
        }

        if (!user?.id) {
            Alert.alert('Error', 'User not found. Please try logging in again.');
            return;
        }

        setIsSubmitting(true);

        try {
            await dispatch(addWeightEntry({
                userId: user.id,
                weight: weightValue,
                unit,
                notes: notes.trim() || undefined,
                mood: mood || undefined,
                confidence,
            })).unwrap();

            // Clear form
            setWeight('');
            setNotes('');
            setMood(null);
            setConfidence(3);

            Alert.alert('Success', 'Weight entry added successfully!');
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to add weight entry. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const moodOptions = [
        { id: 'great' as const, label: 'Great', emoji: '😊' },
        { id: 'good' as const, label: 'Good', emoji: '🙂' },
        { id: 'okay' as const, label: 'Okay', emoji: '😐' },
        { id: 'struggling' as const, label: 'Struggling', emoji: '😔' },
    ];

    const confidenceLabels = ['Very Low', 'Low', 'Medium', 'High', 'Very High'];

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Weight Tracking</Text>
                <Text style={styles.subtitle}>Log your weight and track your progress</Text>
            </View>

            <View style={styles.content}>
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Add Weight Entry</Text>

                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Weight *</Text>
                        <View style={styles.weightInputContainer}>
                            <TextInput
                                style={styles.weightInput}
                                value={weight}
                                onChangeText={setWeight}
                                placeholder="Enter weight"
                                keyboardType="decimal-pad"
                                placeholderTextColor={theme.colors?.textSecondary}
                            />
                            <View style={styles.unitSelector}>
                                <TouchableOpacity
                                    style={[
                                        styles.unitButton,
                                        unit === 'kg' && styles.unitButtonSelected,
                                    ]}
                                    onPress={() => setUnit('kg')}
                                >
                                    <Text style={[
                                        styles.unitButtonText,
                                        unit === 'kg' && styles.unitButtonTextSelected,
                                    ]}>
                                        kg
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[
                                        styles.unitButton,
                                        unit === 'lbs' && styles.unitButtonSelected,
                                    ]}
                                    onPress={() => setUnit('lbs')}
                                >
                                    <Text style={[
                                        styles.unitButtonText,
                                        unit === 'lbs' && styles.unitButtonTextSelected,
                                    ]}>
                                        lbs
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>How are you feeling?</Text>
                        <View style={styles.moodSelector}>
                            {moodOptions.map((option) => (
                                <TouchableOpacity
                                    key={option.id}
                                    style={[
                                        styles.moodButton,
                                        mood === option.id && styles.moodButtonSelected,
                                    ]}
                                    onPress={() => setMood(option.id)}
                                >
                                    <Text style={styles.moodEmoji}>{option.emoji}</Text>
                                    <Text style={[
                                        styles.moodLabel,
                                        mood === option.id && styles.moodLabelSelected,
                                    ]}>
                                        {option.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>
                            Confidence Level: {confidenceLabels[confidence - 1]}
                        </Text>
                        <View style={styles.confidenceSelector}>
                            {[1, 2, 3, 4, 5].map((level) => (
                                <TouchableOpacity
                                    key={level}
                                    style={[
                                        styles.confidenceButton,
                                        confidence === level && styles.confidenceButtonSelected,
                                    ]}
                                    onPress={() => setConfidence(level)}
                                >
                                    <Text style={[
                                        styles.confidenceButtonText,
                                        confidence === level && styles.confidenceButtonTextSelected,
                                    ]}>
                                        {level}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Notes (optional)</Text>
                        <TextInput
                            style={styles.notesInput}
                            value={notes}
                            onChangeText={setNotes}
                            placeholder="Any notes about your weight today..."
                            placeholderTextColor={theme.colors?.textSecondary}
                            multiline
                            numberOfLines={3}
                            textAlignVertical="top"
                        />
                    </View>

                    <TouchableOpacity
                        style={[
                            styles.submitButton,
                            isSubmitting && styles.submitButtonDisabled,
                        ]}
                        onPress={handleSubmit}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? (
                            <View style={styles.loadingContainer}>
                                <ActivityIndicator color="#FFFFFF" size="small" />
                                <Text style={styles.submitButtonText}>Adding...</Text>
                            </View>
                        ) : (
                            <Text style={styles.submitButtonText}>Add Weight Entry</Text>
                        )}
                    </TouchableOpacity>
                </View>

                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Recent Entries</Text>
                    {isLoading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator color={theme.colors?.primary} />
                            <Text style={styles.loadingText}>Loading entries...</Text>
                        </View>
                    ) : entries.length === 0 ? (
                        <Text style={styles.noEntriesText}>
                            No weight entries yet. Add your first entry above!
                        </Text>
                    ) : (
                        <View style={styles.entriesList}>
                            {entries.slice(0, 5).map((entry) => (
                                <View key={entry.id} style={styles.entryItem}>
                                    <View style={styles.entryHeader}>
                                        <Text style={styles.entryWeight}>
                                            {entry.weight} {entry.unit}
                                        </Text>
                                        <Text style={styles.entryDate}>
                                            {new Date(entry.timestamp).toLocaleDateString()}
                                        </Text>
                                    </View>
                                    {entry.mood && (
                                        <Text style={styles.entryMood}>
                                            Feeling: {entry.mood}
                                        </Text>
                                    )}
                                    {entry.notes && (
                                        <Text style={styles.entryNotes}>{entry.notes}</Text>
                                    )}
                                </View>
                            ))}
                        </View>
                    )}
                </View>
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
    inputGroup: {
        marginBottom: theme.spacing.lg,
    },
    inputLabel: {
        ...theme.typography.body,
        color: theme.colors?.text,
        fontWeight: '600',
        marginBottom: theme.spacing.sm,
    },
    weightInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.md,
    },
    weightInput: {
        flex: 1,
        backgroundColor: theme.colors?.background,
        borderWidth: 1,
        borderColor: theme.colors?.border,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        ...theme.typography.body,
        color: theme.colors?.text,
        fontSize: 18,
    },
    unitSelector: {
        flexDirection: 'row',
        backgroundColor: theme.colors?.background,
        borderRadius: theme.borderRadius.md,
        padding: 2,
    },
    unitButton: {
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        borderRadius: theme.borderRadius.sm,
    },
    unitButtonSelected: {
        backgroundColor: theme.colors?.primary,
    },
    unitButtonText: {
        ...theme.typography.body,
        color: theme.colors?.text,
        fontWeight: '600',
    },
    unitButtonTextSelected: {
        color: '#FFFFFF',
    },
    moodSelector: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: theme.spacing.sm,
    },
    moodButton: {
        flex: 1,
        alignItems: 'center',
        padding: theme.spacing.md,
        backgroundColor: theme.colors?.background,
        borderWidth: 1,
        borderColor: theme.colors?.border,
        borderRadius: theme.borderRadius.md,
    },
    moodButtonSelected: {
        borderColor: theme.colors?.primary,
        backgroundColor: theme.colors?.primary + '10',
    },
    moodEmoji: {
        fontSize: 24,
        marginBottom: theme.spacing.xs,
    },
    moodLabel: {
        ...theme.typography.caption,
        color: theme.colors?.text,
    },
    moodLabelSelected: {
        color: theme.colors?.primary,
        fontWeight: '600',
    },
    confidenceSelector: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: theme.spacing.sm,
    },
    confidenceButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors?.background,
        borderWidth: 1,
        borderColor: theme.colors?.border,
        borderRadius: 20,
    },
    confidenceButtonSelected: {
        borderColor: theme.colors?.primary,
        backgroundColor: theme.colors?.primary,
    },
    confidenceButtonText: {
        ...theme.typography.body,
        color: theme.colors?.text,
        fontWeight: '600',
    },
    confidenceButtonTextSelected: {
        color: '#FFFFFF',
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
    submitButton: {
        backgroundColor: theme.colors?.primary,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        alignItems: 'center',
        marginTop: theme.spacing.md,
    },
    submitButtonDisabled: {
        backgroundColor: theme.colors?.border,
    },
    submitButtonText: {
        ...theme.typography.body,
        color: '#FFFFFF',
        fontWeight: '600',
    },
    loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
    },
    loadingText: {
        ...theme.typography.body,
        color: theme.colors?.textSecondary,
    },
    noEntriesText: {
        ...theme.typography.body,
        color: theme.colors?.textSecondary,
        textAlign: 'center',
        padding: theme.spacing.lg,
    },
    entriesList: {
        gap: theme.spacing.md,
    },
    entryItem: {
        backgroundColor: theme.colors?.background,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
    },
    entryHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.xs,
    },
    entryWeight: {
        ...theme.typography.h3,
        color: theme.colors?.primary,
        fontWeight: 'bold',
    },
    entryDate: {
        ...theme.typography.caption,
        color: theme.colors?.textSecondary,
    },
    entryMood: {
        ...theme.typography.caption,
        color: theme.colors?.textSecondary,
        marginBottom: theme.spacing.xs,
    },
    entryNotes: {
        ...theme.typography.body,
        color: theme.colors?.text,
        fontStyle: 'italic',
    },
});

export default WeightScreen;