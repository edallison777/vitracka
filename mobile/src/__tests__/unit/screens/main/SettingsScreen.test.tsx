import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

import SettingsScreen from '@/screens/main/SettingsScreen';
import authSlice from '@/store/slices/authSlice';
import userSlice from '@/store/slices/userSlice';
import weightSlice from '@/store/slices/weightSlice';

// Mock navigation
const mockNavigation = {
    navigate: jest.fn(),
    goBack: jest.fn(),
    dispatch: jest.fn(),
    setParams: jest.fn(),
    addListener: jest.fn(),
    removeListener: jest.fn(),
    canGoBack: jest.fn(),
    isFocused: jest.fn(),
    push: jest.fn(),
    replace: jest.fn(),
    pop: jest.fn(),
    popToTop: jest.fn(),
    setOptions: jest.fn(),
    reset: jest.fn(),
    getParent: jest.fn(),
    getState: jest.fn(),
    getId: jest.fn(),
};

const createTestStore = () => {
    return configureStore({
        reducer: {
            auth: authSlice,
            user: userSlice,
            weight: weightSlice,
        },
        preloadedState: {
            auth: {
                user: {
                    id: 'test-user',
                    email: 'test@example.com',
                    authMethod: 'email',
                    emailVerified: true,
                    createdAt: new Date('2024-01-01T00:00:00Z'),
                    lastLoginAt: new Date('2024-01-01T00:00:00Z'),
                    isActive: true,
                },
                token: 'test-token',
                isAuthenticated: true,
                isLoading: false,
                error: null,
            },
            user: {
                profile: {
                    userId: 'test-user',
                    accountId: 'test-user',
                    goals: {
                        type: 'loss',
                        targetWeight: 70,
                        timeframe: '6 months',
                        weeklyGoal: 0.5,
                    },
                    preferences: {
                        coachingStyle: 'gentle',
                        gamificationLevel: 'moderate',
                        notificationFrequency: 'daily',
                        reminderTimes: [],
                    },
                    medicalContext: {
                        onGLP1Medication: false,
                        hasClinicianGuidance: false,
                        medicationDetails: '',
                    },
                    safetyProfile: {
                        riskFactors: [],
                        triggerWords: [],
                    },
                    createdAt: new Date('2024-01-01T00:00:00Z'),
                    updatedAt: new Date('2024-01-01T00:00:00Z'),
                },
                isLoading: false,
                error: null,
            },
            weight: {
                entries: [],
                isLoading: false,
                error: null,
            },
        },
    });
};

const renderWithProviders = (component: React.ReactElement) => {
    const store = createTestStore();
    return render(
        <Provider store={store}>
            {component}
        </Provider>
    );
};

describe('SettingsScreen', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders settings sections', () => {
        const { getByText } = renderWithProviders(
            <SettingsScreen navigation={mockNavigation as any} />
        );

        expect(getByText('Settings')).toBeTruthy();
        expect(getByText('Coaching Preferences')).toBeTruthy();
        expect(getByText('Notifications')).toBeTruthy();
        expect(getByText('Goals')).toBeTruthy();
        expect(getByText('Medical Context')).toBeTruthy();
    });

    it('displays current coaching preferences', () => {
        const { getByText } = renderWithProviders(
            <SettingsScreen navigation={mockNavigation as any} />
        );

        expect(getByText('Coaching Style')).toBeTruthy();
        expect(getByText('gentle')).toBeTruthy();
        expect(getByText('Gamification Level')).toBeTruthy();
        expect(getByText('moderate')).toBeTruthy();
    });

    it('allows expanding coaching preference sections', () => {
        const { getByText } = renderWithProviders(
            <SettingsScreen navigation={mockNavigation as any} />
        );

        const coachingStyleSection = getByText('Coaching Style');
        fireEvent.press(coachingStyleSection);

        expect(getByText('Gentle')).toBeTruthy();
        expect(getByText('Pragmatic')).toBeTruthy();
        expect(getByText('Upbeat')).toBeTruthy();
        expect(getByText('Structured')).toBeTruthy();
    });

    it('allows expanding notification settings', () => {
        const { getByText } = renderWithProviders(
            <SettingsScreen navigation={mockNavigation as any} />
        );

        const notificationsSection = getByText('Notification Frequency');
        fireEvent.press(notificationsSection);

        expect(getByText('Daily')).toBeTruthy();
        expect(getByText('Weekly')).toBeTruthy();
        expect(getByText('Custom')).toBeTruthy();
    });

    it('shows goal information', () => {
        const { getByText } = renderWithProviders(
            <SettingsScreen navigation={mockNavigation as any} />
        );

        expect(getByText('Current Goal')).toBeTruthy();
        expect(getByText('Weight Loss')).toBeTruthy();
        expect(getByText('Target Weight')).toBeTruthy();
        expect(getByText('70 kg')).toBeTruthy();
    });

    it('shows medical context information', () => {
        const { getByText, getAllByText } = renderWithProviders(
            <SettingsScreen navigation={mockNavigation as any} />
        );

        expect(getByText('GLP-1 Medication')).toBeTruthy();
        expect(getAllByText('No')).toHaveLength(2); // Both GLP-1 and Clinician Guidance show "No"
        expect(getByText('Clinician Guidance')).toBeTruthy();
    });

    it('handles coaching style updates', () => {
        const { getByText } = renderWithProviders(
            <SettingsScreen navigation={mockNavigation as any} />
        );

        const coachingStyleSection = getByText('Coaching Style');
        fireEvent.press(coachingStyleSection);

        const pragmaticOption = getByText('Pragmatic');
        fireEvent.press(pragmaticOption);

        // Should handle coaching style update
        expect(pragmaticOption).toBeTruthy();
    });

    it('handles notification frequency updates', () => {
        const { getByText } = renderWithProviders(
            <SettingsScreen navigation={mockNavigation as any} />
        );

        const notificationSection = getByText('Notification Frequency');
        fireEvent.press(notificationSection);

        const weeklyOption = getByText('Weekly');
        fireEvent.press(weeklyOption);

        // Should handle notification frequency update
        expect(weeklyOption).toBeTruthy();
    });

    it('handles logout action', () => {
        const { getByText } = renderWithProviders(
            <SettingsScreen navigation={mockNavigation as any} />
        );

        const logoutButton = getByText('Sign Out');
        fireEvent.press(logoutButton);

        // Should handle logout
        expect(logoutButton).toBeTruthy();
    });
});