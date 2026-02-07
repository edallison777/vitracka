import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { OnboardingStackParamList } from '@/navigation/OnboardingNavigator';
import { createUserProfile } from '@/store/slices/userSlice';
import { AppDispatch, RootState } from '@/store';
import { theme } from '@/theme';

type CompletionScreenNavigationProp = StackNavigationProp<OnboardingStackParamList, 'Completion'>;
type CompletionScreenRouteProp = RouteProp<OnboardingStackParamList, 'Completion'>;

interface Props {
    navigation: CompletionScreenNavigationProp;
    route: CompletionScreenRouteProp;
}

const CompletionScreen: React.FC<Props> = ({ navigation, route }) => {
    const dispatch = useDispatch<AppDispatch>();
    const { isLoading } = useSelector((state: RootState) => state.user);
    const { user } = useSelector((state: RootState) => state.auth);
    const [isCreatingProfile, setIsCreatingProfile] = useState(false);

    const handleComplete = async () => {
        if (!user?.id) {
            Alert.alert('Error', 'User not found. Please try logging in again.');
            return;
        }

        const { goalData, preferencesData, medicalContextData } = route.params || {};

        if (!goalData || !preferencesData || !medicalContextData) {
            Alert.alert('Error', 'Missing onboarding data. Please complete the onboarding process again.');
            return;
        }

        setIsCreatingProfile(true);

        const profileData = {
            userId: user.id,
            accountId: user.id,
            goals: goalData,
            preferences: preferencesData,
            medicalContext: medicalContextData,
            safetyProfile: {
                riskFactors: [],
                triggerWords: [],
            },
        };

        try {
            await dispatch(createUserProfile(profileData)).unwrap();
            Alert.alert(
                'Welcome to Vitracka!',
                'Your profile has been created successfully. Let\'s start your journey!',
                [
                    {
                        text: 'Get Started',
                        onPress: () => {
                            // Navigation will be handled by the app navigator based on profile existence
                        },
                    },
                ]
            );
        } catch (error: any) {
            console.error('Failed to create profile:', error);
            Alert.alert(
                'Profile Creation Failed',
                error.message || 'There was an error creating your profile. Please try again.',
                [
                    {
                        text: 'Retry',
                        onPress: handleComplete,
                    },
                    {
                        text: 'Cancel',
                        style: 'cancel',
                    },
                ]
            );
        } finally {
            setIsCreatingProfile(false);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.content}>
                <Text style={styles.title}>You're All Set!</Text>
                <Text style={styles.subtitle}>
                    Welcome to your personalized weight management journey with Vitracka
                </Text>
                <Text style={styles.description}>
                    We've customized your experience based on your preferences. You can always adjust these settings later in your profile.
                </Text>
            </View>

            <View style={styles.footer}>
                <TouchableOpacity
                    style={[
                        styles.completeButton,
                        (isCreatingProfile || isLoading) && styles.completeButtonDisabled,
                    ]}
                    onPress={handleComplete}
                    disabled={isCreatingProfile || isLoading}
                >
                    {isCreatingProfile || isLoading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator color="#FFFFFF" size="small" />
                            <Text style={styles.completeButtonText}>Creating Profile...</Text>
                        </View>
                    ) : (
                        <Text style={styles.completeButtonText}>Start My Journey</Text>
                    )}
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
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        ...theme.typography.h1,
        color: theme.colors?.text,
        textAlign: 'center',
        marginBottom: theme.spacing.md,
    },
    subtitle: {
        ...theme.typography.h3,
        color: theme.colors?.textSecondary,
        textAlign: 'center',
        marginBottom: theme.spacing.md,
    },
    description: {
        ...theme.typography.body,
        color: theme.colors?.textSecondary,
        textAlign: 'center',
        lineHeight: 24,
    },
    footer: {
        padding: theme.spacing.lg,
    },
    completeButton: {
        backgroundColor: theme.colors?.primary,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        alignItems: 'center',
    },
    completeButtonDisabled: {
        backgroundColor: theme.colors?.border,
    },
    completeButtonText: {
        ...theme.typography.body,
        color: '#FFFFFF',
        fontWeight: '600',
    },
    loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
    },
});

export default CompletionScreen;