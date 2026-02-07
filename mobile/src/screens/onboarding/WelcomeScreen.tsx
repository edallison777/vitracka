import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { OnboardingStackParamList } from '@/navigation/OnboardingNavigator';
import { theme } from '@/theme';

type WelcomeScreenNavigationProp = StackNavigationProp<OnboardingStackParamList, 'Welcome'>;

interface Props {
    navigation: WelcomeScreenNavigationProp;
}

const WelcomeScreen: React.FC<Props> = ({ navigation }) => {
    return (
        <View style={styles.container}>
            <View style={styles.content}>
                <Text style={styles.title}>Welcome to Vitracka</Text>
                <Text style={styles.subtitle}>
                    Let's set up your personalized weight management journey
                </Text>
                <Text style={styles.description}>
                    We'll ask you a few questions to understand your goals, preferences, and create a supportive experience tailored just for you.
                </Text>
            </View>

            <View style={styles.footer}>
                <TouchableOpacity
                    style={styles.continueButton}
                    onPress={() => navigation.navigate('Goals')}
                >
                    <Text style={styles.continueButtonText}>Get Started</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors?.background,
        padding: theme.spacing.lg,
    },
    content: {
        flex: 1,
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
        marginBottom: theme.spacing.lg,
    },
    description: {
        ...theme.typography.body,
        color: theme.colors?.textSecondary,
        textAlign: 'center',
        lineHeight: 24,
    },
    footer: {
        paddingBottom: theme.spacing.lg,
    },
    continueButton: {
        backgroundColor: theme.colors?.primary,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        alignItems: 'center',
    },
    continueButtonText: {
        ...theme.typography.body,
        color: '#FFFFFF',
        fontWeight: '600',
    },
});

export default WelcomeScreen;