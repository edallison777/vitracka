import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

import GoalsScreen from '@/screens/onboarding/GoalsScreen';
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

describe('GoalsScreen', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders correctly with all goal options', () => {
        const { getByText } = renderWithProviders(
            <GoalsScreen navigation={mockNavigation as any} />
        );

        expect(getByText("What's your primary goal?")).toBeTruthy();
        expect(getByText('Weight Loss')).toBeTruthy();
        expect(getByText('Weight Maintenance')).toBeTruthy();
        expect(getByText('Medication Transition')).toBeTruthy();
        expect(getByText('Continue')).toBeTruthy();
    });

    it('allows goal selection and enables continue button', () => {
        const { getByText } = renderWithProviders(
            <GoalsScreen navigation={mockNavigation as any} />
        );

        const weightLossOption = getByText('Weight Loss');
        const continueButton = getByText('Continue');

        // Initially continue button should be disabled (we can't easily test disabled state in RN)
        fireEvent.press(weightLossOption);

        // After selection, continue button should be enabled
        fireEvent.press(continueButton);

        expect(mockNavigate).toHaveBeenCalledWith('Preferences', {
            goalData: {
                type: 'loss',
                targetWeight: undefined,
                timeframe: undefined,
                weeklyGoal: undefined,
            },
        });
    });

    it('shows additional inputs for weight loss goal', () => {
        const { getByText, getByPlaceholderText } = renderWithProviders(
            <GoalsScreen navigation={mockNavigation as any} />
        );

        const weightLossOption = getByText('Weight Loss');
        fireEvent.press(weightLossOption);

        expect(getByText('Target Weight (optional)')).toBeTruthy();
        expect(getByText('Timeframe (optional)')).toBeTruthy();
        expect(getByText('Weekly Goal (optional)')).toBeTruthy();
        expect(getByPlaceholderText('e.g., 70')).toBeTruthy();
        expect(getByPlaceholderText('e.g., 6 months')).toBeTruthy();
        expect(getByPlaceholderText('e.g., 0.5 kg per week')).toBeTruthy();
    });

    it('includes additional data when weight loss goal has inputs', () => {
        const { getByText, getByPlaceholderText } = renderWithProviders(
            <GoalsScreen navigation={mockNavigation as any} />
        );

        const weightLossOption = getByText('Weight Loss');
        fireEvent.press(weightLossOption);

        const targetWeightInput = getByPlaceholderText('e.g., 70');
        const timeframeInput = getByPlaceholderText('e.g., 6 months');
        const weeklyGoalInput = getByPlaceholderText('e.g., 0.5 kg per week');

        fireEvent.changeText(targetWeightInput, '70');
        fireEvent.changeText(timeframeInput, '6 months');
        fireEvent.changeText(weeklyGoalInput, '0.5');

        const continueButton = getByText('Continue');
        fireEvent.press(continueButton);

        expect(mockNavigate).toHaveBeenCalledWith('Preferences', {
            goalData: {
                type: 'loss',
                targetWeight: 70,
                timeframe: '6 months',
                weeklyGoal: 0.5,
            },
        });
    });

    it('handles maintenance goal selection correctly', () => {
        const { getByText } = renderWithProviders(
            <GoalsScreen navigation={mockNavigation as any} />
        );

        const maintenanceOption = getByText('Weight Maintenance');
        fireEvent.press(maintenanceOption);

        const continueButton = getByText('Continue');
        fireEvent.press(continueButton);

        expect(mockNavigate).toHaveBeenCalledWith('Preferences', {
            goalData: {
                type: 'maintenance',
                targetWeight: undefined,
                timeframe: undefined,
                weeklyGoal: undefined,
            },
        });
    });

    it('handles transition goal selection correctly', () => {
        const { getByText } = renderWithProviders(
            <GoalsScreen navigation={mockNavigation as any} />
        );

        const transitionOption = getByText('Medication Transition');
        fireEvent.press(transitionOption);

        const continueButton = getByText('Continue');
        fireEvent.press(continueButton);

        expect(mockNavigate).toHaveBeenCalledWith('Preferences', {
            goalData: {
                type: 'transition',
                targetWeight: undefined,
                timeframe: undefined,
                weeklyGoal: undefined,
            },
        });
    });
});