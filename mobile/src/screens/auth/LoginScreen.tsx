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
    ScrollView,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { StackNavigationProp } from '@react-navigation/stack';
import { AppDispatch, RootState } from '@/store';
import { loginUser, clearError } from '@/store/slices/authSlice';
import { AuthStackParamList } from '@/navigation/AuthNavigator';
import { theme } from '@/theme';

type LoginScreenNavigationProp = StackNavigationProp<AuthStackParamList, 'Login'>;

interface Props {
    navigation: LoginScreenNavigationProp;
}

const LoginScreen: React.FC<Props> = ({ navigation }) => {
    const dispatch = useDispatch<AppDispatch>();
    const { isLoading, error } = useSelector((state: RootState) => state.auth);

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [emailError, setEmailError] = useState('');
    const [passwordError, setPasswordError] = useState('');

    const validateEmail = (email: string): boolean => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email) {
            setEmailError('Email is required');
            return false;
        }
        if (!emailRegex.test(email)) {
            setEmailError('Please enter a valid email address');
            return false;
        }
        setEmailError('');
        return true;
    };

    const validatePassword = (password: string): boolean => {
        if (!password) {
            setPasswordError('Password is required');
            return false;
        }
        if (password.length < 6) {
            setPasswordError('Password must be at least 6 characters');
            return false;
        }
        setPasswordError('');
        return true;
    };

    const handleLogin = async () => {
        const isEmailValid = validateEmail(email);
        const isPasswordValid = validatePassword(password);

        if (!isEmailValid || !isPasswordValid) {
            return;
        }

        try {
            await dispatch(loginUser({
                method: 'email',
                email,
                password,
            })).unwrap();
        } catch (error: any) {
            Alert.alert('Login Failed', error || 'An error occurred during login');
        }
    };

    const handleGoogleLogin = () => {
        // TODO: Implement Google OAuth
        Alert.alert('Coming Soon', 'Google login will be available soon');
    };

    const handleFacebookLogin = () => {
        // TODO: Implement Facebook OAuth
        Alert.alert('Coming Soon', 'Facebook login will be available soon');
    };

    React.useEffect(() => {
        if (error) {
            Alert.alert('Error', error);
            dispatch(clearError());
        }
    }, [error, dispatch]);

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView contentContainerStyle={styles.scrollContainer}>
                <View style={styles.header}>
                    <Text style={styles.title}>Welcome to Vitracka</Text>
                    <Text style={styles.subtitle}>Your AI-powered weight management companion</Text>
                </View>

                <View style={styles.form}>
                    <View style={styles.inputContainer}>
                        <TextInput
                            style={[styles.input, emailError ? styles.inputError : null]}
                            placeholder="Email"
                            placeholderTextColor={theme.colors?.placeholder}
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoCorrect={false}
                        />
                        {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
                    </View>

                    <View style={styles.inputContainer}>
                        <TextInput
                            style={[styles.input, passwordError ? styles.inputError : null]}
                            placeholder="Password"
                            placeholderTextColor={theme.colors?.placeholder}
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                            autoCapitalize="none"
                        />
                        {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}
                    </View>

                    <TouchableOpacity
                        style={styles.loginButton}
                        onPress={handleLogin}
                        disabled={isLoading}
                    >
                        <Text style={styles.loginButtonText}>
                            {isLoading ? 'Signing In...' : 'Sign In'}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.forgotPasswordButton}
                        onPress={() => navigation.navigate('ForgotPassword')}
                    >
                        <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.divider}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerText}>or</Text>
                    <View style={styles.dividerLine} />
                </View>

                <View style={styles.socialButtons}>
                    <TouchableOpacity style={styles.socialButton} onPress={handleGoogleLogin}>
                        <Text style={styles.socialButtonText}>Continue with Google</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.socialButton} onPress={handleFacebookLogin}>
                        <Text style={styles.socialButtonText}>Continue with Facebook</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.footer}>
                    <Text style={styles.footerText}>Don't have an account? </Text>
                    <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                        <Text style={styles.footerLink}>Sign Up</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors?.background,
    },
    scrollContainer: {
        flexGrow: 1,
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
    loginButton: {
        backgroundColor: theme.colors?.primary,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        alignItems: 'center',
        marginTop: theme.spacing.md,
    },
    loginButtonText: {
        ...theme.typography.body,
        color: '#FFFFFF',
        fontWeight: '600',
    },
    forgotPasswordButton: {
        alignItems: 'center',
        marginTop: theme.spacing.md,
    },
    forgotPasswordText: {
        ...theme.typography.body,
        color: theme.colors?.primary,
    },
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: theme.spacing.lg,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: theme.colors?.border,
    },
    dividerText: {
        ...theme.typography.body,
        color: theme.colors?.textSecondary,
        marginHorizontal: theme.spacing.md,
    },
    socialButtons: {
        marginBottom: theme.spacing.xl,
    },
    socialButton: {
        backgroundColor: theme.colors?.surface,
        borderWidth: 1,
        borderColor: theme.colors?.border,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        alignItems: 'center',
        marginBottom: theme.spacing.sm,
    },
    socialButtonText: {
        ...theme.typography.body,
        color: theme.colors?.text,
        fontWeight: '500',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    footerText: {
        ...theme.typography.body,
        color: theme.colors?.textSecondary,
    },
    footerLink: {
        ...theme.typography.body,
        color: theme.colors?.primary,
        fontWeight: '600',
    },
});

export default LoginScreen;