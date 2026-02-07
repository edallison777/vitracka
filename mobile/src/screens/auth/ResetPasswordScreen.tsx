import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { AuthStackParamList } from '@/navigation/AuthNavigator';
import { authService } from '@/services/authService';
import { theme } from '@/theme';

type ResetPasswordScreenNavigationProp = StackNavigationProp<AuthStackParamList, 'ResetPassword'>;
type ResetPasswordScreenRouteProp = RouteProp<AuthStackParamList, 'ResetPassword'>;

interface Props {
    navigation: ResetPasswordScreenNavigationProp;
    route: ResetPasswordScreenRouteProp;
}

const ResetPasswordScreen: React.FC<Props> = ({ navigation, route }) => {
    const { token } = route.params;
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [passwordError, setPasswordError] = useState('');
    const [confirmPasswordError, setConfirmPasswordError] = useState('');

    const validatePassword = (password: string): boolean => {
        if (!password) {
            setPasswordError('Password is required');
            return false;
        }
        if (password.length < 8) {
            setPasswordError('Password must be at least 8 characters');
            return false;
        }
        if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
            setPasswordError('Password must contain uppercase, lowercase, and number');
            return false;
        }
        setPasswordError('');
        return true;
    };

    const validateConfirmPassword = (confirmPassword: string): boolean => {
        if (!confirmPassword) {
            setConfirmPasswordError('Please confirm your password');
            return false;
        }
        if (confirmPassword !== password) {
            setConfirmPasswordError('Passwords do not match');
            return false;
        }
        setConfirmPasswordError('');
        return true;
    };

    const handleResetPassword = async () => {
        const isPasswordValid = validatePassword(password);
        const isConfirmPasswordValid = validateConfirmPassword(confirmPassword);

        if (!isPasswordValid || !isConfirmPasswordValid) {
            return;
        }

        setIsLoading(true);
        try {
            await authService.resetPassword(token, password);
            Alert.alert(
                'Password Reset Successful',
                'Your password has been reset successfully. You can now sign in with your new password.',
                [
                    {
                        text: 'OK',
                        onPress: () => navigation.navigate('Login'),
                    },
                ]
            );
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to reset password');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <View style={styles.content}>
                <View style={styles.header}>
                    <Text style={styles.title}>Set New Password</Text>
                    <Text style={styles.subtitle}>
                        Enter your new password below
                    </Text>
                </View>

                <View style={styles.form}>
                    <View style={styles.inputContainer}>
                        <TextInput
                            style={[styles.input, passwordError ? styles.inputError : null]}
                            placeholder="New Password"
                            placeholderTextColor={theme.colors?.placeholder}
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                            autoCapitalize="none"
                        />
                        {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}
                    </View>

                    <View style={styles.inputContainer}>
                        <TextInput
                            style={[styles.input, confirmPasswordError ? styles.inputError : null]}
                            placeholder="Confirm New Password"
                            placeholderTextColor={theme.colors?.placeholder}
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                            secureTextEntry
                            autoCapitalize="none"
                        />
                        {confirmPasswordError ? <Text style={styles.errorText}>{confirmPasswordError}</Text> : null}
                    </View>

                    <TouchableOpacity
                        style={styles.resetButton}
                        onPress={handleResetPassword}
                        disabled={isLoading}
                    >
                        <Text style={styles.resetButtonText}>
                            {isLoading ? 'Updating...' : 'Update Password'}
                        </Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.footer}>
                    <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                        <Text style={styles.backToLoginText}>Back to Sign In</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors?.background,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        padding: theme.spacing.lg,
    },
    header: {
        alignItems: 'center',
        marginBottom: theme.spacing.xl,
    },
    title: {
        ...theme.typography.h1,
        color: theme.colors?.text,
        textAlign: 'center',
        marginBottom: theme.spacing.sm,
    },
    subtitle: {
        ...theme.typography.body,
        color: theme.colors?.textSecondary,
        textAlign: 'center',
    },
    form: {
        marginBottom: theme.spacing.xl,
    },
    inputContainer: {
        marginBottom: theme.spacing.md,
    },
    input: {
        ...theme.typography.body,
        backgroundColor: theme.colors?.surface,
        borderWidth: 1,
        borderColor: theme.colors?.border,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        color: theme.colors?.text,
    },
    inputError: {
        borderColor: theme.colors?.danger,
    },
    errorText: {
        ...theme.typography.small,
        color: theme.colors?.danger,
        marginTop: theme.spacing.xs,
    },
    resetButton: {
        backgroundColor: theme.colors?.primary,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        alignItems: 'center',
        marginTop: theme.spacing.md,
    },
    resetButtonText: {
        ...theme.typography.body,
        color: '#FFFFFF',
        fontWeight: '600',
    },
    footer: {
        alignItems: 'center',
    },
    backToLoginText: {
        ...theme.typography.body,
        color: theme.colors?.primary,
        fontWeight: '600',
    },
});

export default ResetPasswordScreen;