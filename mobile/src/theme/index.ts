import { Platform } from 'react-native';

// iOS Human Interface Guidelines colors
const iOSColors = {
    primary: '#007AFF',
    secondary: '#5856D6',
    success: '#34C759',
    warning: '#FF9500',
    danger: '#FF3B30',
    background: '#F2F2F7',
    surface: '#FFFFFF',
    text: '#000000',
    textSecondary: '#8E8E93',
    border: '#C6C6C8',
    placeholder: '#C7C7CD',
};

// Android Material Design colors
const androidColors = {
    primary: '#6200EE',
    secondary: '#03DAC6',
    success: '#4CAF50',
    warning: '#FF9800',
    danger: '#F44336',
    background: '#FAFAFA',
    surface: '#FFFFFF',
    text: '#212121',
    textSecondary: '#757575',
    border: '#E0E0E0',
    placeholder: '#9E9E9E',
};

export const colors = Platform.select({
    ios: iOSColors,
    android: androidColors,
    default: iOSColors,
});

export const spacing = {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
};

export const typography = {
    h1: {
        fontSize: 32,
        fontWeight: 'bold' as const,
        lineHeight: 40,
    },
    h2: {
        fontSize: 24,
        fontWeight: 'bold' as const,
        lineHeight: 32,
    },
    h3: {
        fontSize: 20,
        fontWeight: '600' as const,
        lineHeight: 28,
    },
    body: {
        fontSize: 16,
        fontWeight: 'normal' as const,
        lineHeight: 24,
    },
    caption: {
        fontSize: 14,
        fontWeight: 'normal' as const,
        lineHeight: 20,
    },
    small: {
        fontSize: 12,
        fontWeight: 'normal' as const,
        lineHeight: 16,
    },
};

export const borderRadius = {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    round: 50,
};

export const shadows = Platform.select({
    ios: {
        small: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.1,
            shadowRadius: 2,
        },
        medium: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.15,
            shadowRadius: 4,
        },
        large: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.2,
            shadowRadius: 8,
        },
    },
    android: {
        small: { elevation: 2 },
        medium: { elevation: 4 },
        large: { elevation: 8 },
    },
    default: {
        small: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.1,
            shadowRadius: 2,
        },
        medium: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.15,
            shadowRadius: 4,
        },
        large: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.2,
            shadowRadius: 8,
        },
    },
});

export const theme = {
    colors,
    spacing,
    typography,
    borderRadius,
    shadows,
};