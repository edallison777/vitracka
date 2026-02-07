import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { OnboardingStackParamList } from '@/navigation/OnboardingNavigator';
import { theme } from '@/theme';

type PreferencesScreenNavigationProp = StackNavigationProp<OnboardingStackParamList, 'Preferences'>;
type PreferencesScreenRouteProp = RouteProp<OnboardingStackParamList, 'Preferences'>;

interface Props {
    navigation: PreferencesScreenNavigationProp;
    route: PreferencesScreenRouteProp;
}

const PreferencesScreen: React.FC<Props> = ({ navigation, route }) => {
    const [coachingStyle, setCoachingStyle] = useState<'gentle' | 'pragmatic' | 'upbeat' | 'structured' | null>(null);
    const [gamificationLevel, setGamificationLevel] = useState<'minimal' | 'moderate' | 'high' | null>(null);
    const [notificationFrequency, setNotificationFrequency] = useState<'daily' | 'weekly' | 'custom' | null>(null);

    const coachingStyles = [
        {
            id: 'gentle' as const,
            title: 'Gentle',
            description: 'Soft encouragement, minimal pressure, focus on self-compassion',
        },
        {
            id: 'pragmatic' as const,
            title: 'Pragmatic',
            description: 'Practical advice, problem-solving focus, realistic expectations',
        },
        {
            id: 'upbeat' as const,
            title: 'Upbeat',
            description: 'Enthusiastic support, celebration of small wins, motivational language',
        },
        {
            id: 'structured' as const,
            title: 'Structured',
            description: 'Clear guidelines, systematic approach, detailed planning',
        },
    ];

    const gamificationLevels = [
        {
            id: 'minimal' as const,
            title: 'Minimal',
            description: 'Simple progress tracking without games or rewards',
        },
        {
            id: 'moderate' as const,
            title: 'Moderate',
            description: 'Some achievements and milestones to celebrate progress',
        },
        {
            id: 'high' as const,
            title: 'High',
            description: 'Full gamification with points, levels, and rewards',
        },
    ];

    const notificationOptions = [
        {
            id: 'daily' as const,
            title: 'Daily',
            description: 'Daily check-ins and encouragement',
        },
        {
            id: 'weekly' as const,
            title: 'Weekly',
            description: 'Weekly progress reviews and tips',
        },
        {
            id: 'custom' as const,
            title: 'Custom',
            description: 'Set your own reminder schedule',
        },
    ];

    const handleContinue = () => {
        if (coachingStyle && gamificationLevel && notificationFrequency) {
            const preferencesData = {
                coachingStyle,
                gamificationLevel,
                notificationFrequency,
                reminderTimes: [], // Default empty, can be set later
            };

            navigation.navigate('MedicalContext', {
                goalData: route.params?.goalData,
                preferencesData
            });
        }
    };

    const isFormValid = coachingStyle && gamificationLevel && notificationFrequency;

    return (
        <View style={styles.container}>
            <ScrollView style={styles.content}>
                <Text style={styles.title}>Coaching Preferences</Text>
                <Text style={styles.subtitle}>
                    Help us personalize your experience to match your preferred style
                </Text>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Coaching Style</Text>
                    <View style={styles.optionsList}>
                        {coachingStyles.map((style) => (
                            <TouchableOpacity
                                key={style.id}
                                style={[
                                    styles.option,
                                    coachingStyle === style.id && styles.optionSelected,
                                ]}
                                onPress={() => setCoachingStyle(style.id)}
                            >
                                <Text style={[
                                    styles.optionTitle,
                                    coachingStyle === style.id && styles.optionTitleSelected,
                                ]}>
                                    {style.title}
                                </Text>
                                <Text style={[
                                    styles.optionDescription,
                                    coachingStyle === style.id && styles.optionDescriptionSelected,
                                ]}>
                                    {style.description}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Gamification Level</Text>
                    <View style={styles.optionsList}>
                        {gamificationLevels.map((level) => (
                            <TouchableOpacity
                                key={level.id}
                                style={[
                                    styles.option,
                                    gamificationLevel === level.id && styles.optionSelected,
                                ]}
                                onPress={() => setGamificationLevel(level.id)}
                            >
                                <Text style={[
                                    styles.optionTitle,
                                    gamificationLevel === level.id && styles.optionTitleSelected,
                                ]}>
                                    {level.title}
                                </Text>
                                <Text style={[
                                    styles.optionDescription,
                                    gamificationLevel === level.id && styles.optionDescriptionSelected,
                                ]}>
                                    {level.description}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Notification Frequency</Text>
                    <View style={styles.optionsList}>
                        {notificationOptions.map((option) => (
                            <TouchableOpacity
                                key={option.id}
                                style={[
                                    styles.option,
                                    notificationFrequency === option.id && styles.optionSelected,
                                ]}
                                onPress={() => setNotificationFrequency(option.id)}
                            >
                                <Text style={[
                                    styles.optionTitle,
                                    notificationFrequency === option.id && styles.optionTitleSelected,
                                ]}>
                                    {option.title}
                                </Text>
                                <Text style={[
                                    styles.optionDescription,
                                    notificationFrequency === option.id && styles.optionDescriptionSelected,
                                ]}>
                                    {option.description}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity
                    style={[
                        styles.continueButton,
                        !isFormValid && styles.continueButtonDisabled,
                    ]}
                    onPress={handleContinue}
                    disabled={!isFormValid}
                >
                    <Text style={[
                        styles.continueButtonText,
                        !isFormValid && styles.continueButtonTextDisabled,
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
    section: {
        marginBottom: theme.spacing.xl,
    },
    sectionTitle: {
        ...theme.typography.h3,
        color: theme.colors?.text,
        marginBottom: theme.spacing.md,
    },
    optionsList: {
        gap: theme.spacing.sm,
    },
    option: {
        backgroundColor: theme.colors?.surface,
        borderWidth: 2,
        borderColor: theme.colors?.border,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
    },
    optionSelected: {
        borderColor: theme.colors?.primary,
        backgroundColor: theme.colors?.primary + '10',
    },
    optionTitle: {
        ...theme.typography.body,
        color: theme.colors?.text,
        fontWeight: '600',
        marginBottom: theme.spacing.xs,
    },
    optionTitleSelected: {
        color: theme.colors?.primary,
    },
    optionDescription: {
        ...theme.typography.caption,
        color: theme.colors?.textSecondary,
    },
    optionDescriptionSelected: {
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
});

export default PreferencesScreen;