import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

import WelcomeScreen from '@/screens/onboarding/WelcomeScreen';
import GoalsScreen from '@/screens/onboarding/GoalsScreen';
import PreferencesScreen from '@/screens/onboarding/PreferencesScreen';
import MedicalContextScreen from '@/screens/onboarding/MedicalContextScreen';
import CompletionScreen from '@/screens/onboarding/CompletionScreen';

export type OnboardingStackParamList = {
    Welcome: undefined;
    Goals: undefined;
    Preferences: {
        goalData?: {
            type: 'loss' | 'maintenance' | 'transition';
            targetWeight?: number;
            timeframe?: string;
            weeklyGoal?: number;
        };
    };
    MedicalContext: {
        goalData?: {
            type: 'loss' | 'maintenance' | 'transition';
            targetWeight?: number;
            timeframe?: string;
            weeklyGoal?: number;
        };
        preferencesData?: {
            coachingStyle: 'gentle' | 'pragmatic' | 'upbeat' | 'structured';
            gamificationLevel: 'minimal' | 'moderate' | 'high';
            notificationFrequency: 'daily' | 'weekly' | 'custom';
            reminderTimes: string[];
        };
    };
    Completion: {
        goalData?: {
            type: 'loss' | 'maintenance' | 'transition';
            targetWeight?: number;
            timeframe?: string;
            weeklyGoal?: number;
        };
        preferencesData?: {
            coachingStyle: 'gentle' | 'pragmatic' | 'upbeat' | 'structured';
            gamificationLevel: 'minimal' | 'moderate' | 'high';
            notificationFrequency: 'daily' | 'weekly' | 'custom';
            reminderTimes: string[];
        };
        medicalContextData?: {
            onGLP1Medication: boolean;
            hasClinicianGuidance: boolean;
            medicationDetails?: string;
        };
    };
};

const Stack = createStackNavigator<OnboardingStackParamList>();

const OnboardingNavigator: React.FC = () => {
    return (
        <Stack.Navigator
            initialRouteName="Welcome"
            screenOptions={{
                headerShown: false,
                cardStyle: { backgroundColor: 'transparent' },
            }}
        >
            <Stack.Screen name="Welcome" component={WelcomeScreen} />
            <Stack.Screen name="Goals" component={GoalsScreen} />
            <Stack.Screen name="Preferences" component={PreferencesScreen} />
            <Stack.Screen name="MedicalContext" component={MedicalContextScreen} />
            <Stack.Screen name="Completion" component={CompletionScreen} />
        </Stack.Navigator>
    );
};

export default OnboardingNavigator;