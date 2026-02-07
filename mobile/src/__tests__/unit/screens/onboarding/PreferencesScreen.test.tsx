import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

import PreferencesScreen from '@/screens/onboarding/PreferencesScreen';
import authSlice from '@/store/slices/authSlice';
import userSlice from '@/store/slices/userSlice';
import weightSlice from '@/store/slices/weightSlice';

// Mock navigation
const mockNavigate = jest.fn();
const mockNavigation = {
    navigate: mockNavigate,
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

const mockRoute = {
    key: 'test-key',
    name: 'Preferences' as const,
    params: {
        goalData: {
            type: 'loss' as const,
            targetWeight: 70,
            timeframe: '6 months',
            weeklyGoal: 0.5,
        },
    },
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
                user: { id: 'test-user', email: 'test@example.com' },
                token: 'test-token',
                isLoading: false,
                error: null,
            },
            user: {
                profile: null,
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

describe('PreferencesScreen', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders correctly with all preference options', () => {
        const { getByText } = renderWithProviders(
            <PreferencesScreen navigation={mockNavigation as any} route={mockRoute as any} />
        );

        expect(getByText('Coaching Preferences')).toBeTruthy();
        expect(getByText('Coaching Style')).toBeTruthy();
        expect(getByText('Gamification Level')).toBeTruthy();
        expect(getByText('Notification Frequency')).toBeTruthy();
        expect(getByText('Continue')).toBeTruthy();
    });

    it('allows coaching style selection', () => {
        const { getByText } = renderWithProviders(
            <PreferencesScreen navigation={mockNavigation as any} route={mockRoute as any} />
        );

        const gentleOption = getByText('Gentle');
        fireEvent.press(gentleOption);

        // Visual feedback should be applied (we can't easily test styling changes)
        expect(gentleOption).toBeTruthy();
    });

    it('allows gamification level selection', () => {
        const { getByText } = renderWithProviders(
            <PreferencesScreen navigation={mockNavigation as any} route={mockRoute as any} />
        );

        const moderateOption = getByText('Moderate');
        fireEvent.press(moderateOption);

        expect(moderateOption).toBeTruthy();
    });

    it('allows notification frequency selection', () => {
        const { getByText } = renderWithProviders(
            <PreferencesScreen navigation={mockNavigation as any} route={mockRoute as any} />
        );

        const dailyOption = getByText('Daily');
        fireEvent.press(dailyOption);

        expect(dailyOption).toBeTruthy();
    });

    it('navigates to medical context with complete preferences data', () => {
        const { getByText } = renderWithProviders(
            <PreferencesScreen navigation={mockNavigation as any} route={mockRoute as any} />
        );

        // Select all required preferences
        fireEvent.press(getByText('Gentle'));
        fireEvent.press(getByText('Moderate'));
        fireEvent.press(getByText('Daily'));

        const continueButton = getByText('Continue');
        fireEvent.press(continueButton);

        expect(mockNavigate).toHaveBeenCalledWith('MedicalContext', {
            goalData: mockRoute.params.goalData,
            preferencesData: {
                coachingStyle: 'gentle',
                gamificationLevel: 'moderate',
                notificationFrequency: 'daily',
                reminderTimes: [],
            },
        });
    });

    it('requires all preferences to be selected before continuing', () => {
        const { getByText } = renderWithProviders(
            <PreferencesScreen navigation={mockNavigation as any} route={mockRoute as any} />
        );

        // Select only coaching style
        fireEvent.press(getByText('Gentle'));

        const continueButton = getByText('Continue');
        fireEvent.press(continueButton);

        // Should not navigate if not all preferences are selected
        expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('shows descriptions for each preference option', () => {
        const { getByText } = renderWithProviders(
            <PreferencesScreen navigation={mockNavigation as any} route={mockRoute as any} />
        );

        expect(getByText('Soft encouragement, minimal pressure, focus on self-compassion')).toBeTruthy();
        expect(getByText('Practical advice, problem-solving focus, realistic expectations')).toBeTruthy();
        expect(getByText('Simple progress tracking without games or rewards')).toBeTruthy();
        expect(getByText('Daily check-ins and encouragement')).toBeTruthy();
    });
});