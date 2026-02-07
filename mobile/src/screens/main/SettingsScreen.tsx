import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView, Switch } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { logoutUser } from '@/store/slices/authSlice';
import { clearUserProfile, updateUserProfile } from '@/store/slices/userSlice';
import { AppDispatch, RootState } from '@/store';
import { theme } from '@/theme';

const SettingsScreen: React.FC = () => {
    const dispatch = useDispatch<AppDispatch>();
    const { profile, isLoading } = useSelector((state: RootState) => state.user);
    const [showCoachingSettings, setShowCoachingSettings] = useState(false);
    const [showNotificationSettings, setShowNotificationSettings] = useState(false);

    const handleLogout = () => {
        Alert.alert(
            'Sign Out',
            'Are you sure you want to sign out?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Sign Out',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await dispatch(logoutUser()).unwrap();
                            dispatch(clearUserProfile());
                        } catch (error) {
                            console.error('Logout failed:', error);
                        }
                    },
                },
            ]
        );
    };

    const updateCoachingStyle = async (style: 'gentle' | 'pragmatic' | 'upbeat' | 'structured') => {
        if (!profile) return;

        try {
            await dispatch(updateUserProfile({
                ...profile,
                preferences: {
                    ...profile.preferences,
                    coachingStyle: style,
                },
            })).unwrap();
            Alert.alert('Success', 'Coaching style updated successfully!');
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to update coaching style');
        }
    };

    const updateGamificationLevel = async (level: 'minimal' | 'moderate' | 'high') => {
        if (!profile) return;

        try {
            await dispatch(updateUserProfile({
                ...profile,
                preferences: {
                    ...profile.preferences,
                    gamificationLevel: level,
                },
            })).unwrap();
            Alert.alert('Success', 'Gamification level updated successfully!');
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to update gamification level');
        }
    };

    const updateNotificationFrequency = async (frequency: 'daily' | 'weekly' | 'custom') => {
        if (!profile) return;

        try {
            await dispatch(updateUserProfile({
                ...profile,
                preferences: {
                    ...profile.preferences,
                    notificationFrequency: frequency,
                },
            })).unwrap();
            Alert.alert('Success', 'Notification frequency updated successfully!');
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to update notification frequency');
        }
    };

    const coachingStyles = [
        {
            id: 'gentle' as const,
            title: 'Gentle',
            description: 'Soft encouragement, minimal pressure',
        },
        {
            id: 'pragmatic' as const,
            title: 'Pragmatic',
            description: 'Practical advice, realistic expectations',
        },
        {
            id: 'upbeat' as const,
            title: 'Upbeat',
            description: 'Enthusiastic support, motivational',
        },
        {
            id: 'structured' as const,
            title: 'Structured',
            description: 'Clear guidelines, systematic approach',
        },
    ];

    const gamificationLevels = [
        { id: 'minimal' as const, title: 'Minimal', description: 'Simple progress tracking' },
        { id: 'moderate' as const, title: 'Moderate', description: 'Some achievements and milestones' },
        { id: 'high' as const, title: 'High', description: 'Full gamification with rewards' },
    ];

    const notificationOptions = [
        { id: 'daily' as const, title: 'Daily', description: 'Daily check-ins' },
        { id: 'weekly' as const, title: 'Weekly', description: 'Weekly progress reviews' },
        { id: 'custom' as const, title: 'Custom', description: 'Set your own schedule' },
    ];

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Settings</Text>
            </View>

            <View style={styles.content}>
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Coaching Preferences</Text>

                    <TouchableOpacity
                        style={styles.settingItem}
                        onPress={() => setShowCoachingSettings(!showCoachingSettings)}
                    >
                        <View style={styles.settingContent}>
                            <Text style={styles.settingText}>Coaching Style</Text>
                            <Text style={styles.settingValue}>
                                {profile?.preferences.coachingStyle || 'Not set'}
                            </Text>
                        </View>
                        <Text style={styles.chevron}>{showCoachingSettings ? '▼' : '▶'}</Text>
                    </TouchableOpacity>

                    {showCoachingSettings && (
                        <View style={styles.expandedSection}>
                            {coachingStyles.map((style) => (
                                <TouchableOpacity
                                    key={style.id}
                                    style={[
                                        styles.optionItem,
                                        profile?.preferences.coachingStyle === style.id && styles.optionItemSelected,
                                    ]}
                                    onPress={() => updateCoachingStyle(style.id)}
                                    disabled={isLoading}
                                >
                                    <Text style={[
                                        styles.optionTitle,
                                        profile?.preferences.coachingStyle === style.id && styles.optionTitleSelected,
                                    ]}>
                                        {style.title}
                                    </Text>
                                    <Text style={styles.optionDescription}>{style.description}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}

                    <TouchableOpacity style={styles.settingItem}>
                        <View style={styles.settingContent}>
                            <Text style={styles.settingText}>Gamification Level</Text>
                            <Text style={styles.settingValue}>
                                {profile?.preferences.gamificationLevel || 'Not set'}
                            </Text>
                        </View>
                    </TouchableOpacity>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Notifications</Text>

                    <TouchableOpacity
                        style={styles.settingItem}
                        onPress={() => setShowNotificationSettings(!showNotificationSettings)}
                    >
                        <View style={styles.settingContent}>
                            <Text style={styles.settingText}>Notification Frequency</Text>
                            <Text style={styles.settingValue}>
                                {profile?.preferences.notificationFrequency || 'Not set'}
                            </Text>
                        </View>
                        <Text style={styles.chevron}>{showNotificationSettings ? '▼' : '▶'}</Text>
                    </TouchableOpacity>

                    {showNotificationSettings && (
                        <View style={styles.expandedSection}>
                            {notificationOptions.map((option) => (
                                <TouchableOpacity
                                    key={option.id}
                                    style={[
                                        styles.optionItem,
                                        profile?.preferences.notificationFrequency === option.id && styles.optionItemSelected,
                                    ]}
                                    onPress={() => updateNotificationFrequency(option.id)}
                                    disabled={isLoading}
                                >
                                    <Text style={[
                                        styles.optionTitle,
                                        profile?.preferences.notificationFrequency === option.id && styles.optionTitleSelected,
                                    ]}>
                                        {option.title}
                                    </Text>
                                    <Text style={styles.optionDescription}>{option.description}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Goals</Text>
                    <TouchableOpacity style={styles.settingItem}>
                        <View style={styles.settingContent}>
                            <Text style={styles.settingText}>Current Goal</Text>
                            <Text style={styles.settingValue}>
                                {profile?.goals.type === 'loss' && 'Weight Loss'}
                                {profile?.goals.type === 'maintenance' && 'Maintenance'}
                                {profile?.goals.type === 'transition' && 'Transition'}
                                {!profile?.goals.type && 'Not set'}
                            </Text>
                        </View>
                    </TouchableOpacity>
                    {profile?.goals.targetWeight && (
                        <TouchableOpacity style={styles.settingItem}>
                            <View style={styles.settingContent}>
                                <Text style={styles.settingText}>Target Weight</Text>
                                <Text style={styles.settingValue}>
                                    {profile.goals.targetWeight} kg
                                </Text>
                            </View>
                        </TouchableOpacity>
                    )}
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Medical Context</Text>
                    <View style={styles.settingItem}>
                        <View style={styles.settingContent}>
                            <Text style={styles.settingText}>GLP-1 Medication</Text>
                            <Text style={styles.settingValue}>
                                {profile?.medicalContext.onGLP1Medication ? 'Yes' : 'No'}
                            </Text>
                        </View>
                    </View>
                    <View style={styles.settingItem}>
                        <View style={styles.settingContent}>
                            <Text style={styles.settingText}>Clinician Guidance</Text>
                            <Text style={styles.settingValue}>
                                {profile?.medicalContext.hasClinicianGuidance ? 'Yes' : 'No'}
                            </Text>
                        </View>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Support</Text>
                    <TouchableOpacity style={styles.settingItem}>
                        <Text style={styles.settingText}>Help & FAQ</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.settingItem}>
                        <Text style={styles.settingText}>Contact Support</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.settingItem}>
                        <Text style={styles.settingText}>Privacy Policy</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.section}>
                    <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                        <Text style={styles.logoutButtonText}>Sign Out</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors?.background,
    },
    header: {
        padding: theme.spacing.lg,
        paddingTop: theme.spacing.xxl,
    },
    title: {
        ...theme.typography.h1,
        color: theme.colors?.text,
    },
    content: {
        flex: 1,
        padding: theme.spacing.lg,
    },
    section: {
        marginBottom: theme.spacing.xl,
    },
    sectionTitle: {
        ...theme.typography.h3,
        color: theme.colors?.text,
        marginBottom: theme.spacing.md,
    },
    settingItem: {
        backgroundColor: theme.colors?.surface,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.sm,
        ...theme.shadows?.small,
    },
    settingText: {
        ...theme.typography.body,
        color: theme.colors?.text,
    },
    logoutButton: {
        backgroundColor: theme.colors?.danger,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        alignItems: 'center',
    },
    logoutButtonText: {
        ...theme.typography.body,
        color: '#FFFFFF',
        fontWeight: '600',
    },
    settingContent: {
        flex: 1,
    },
    settingValue: {
        ...theme.typography.caption,
        color: theme.colors?.textSecondary,
        marginTop: theme.spacing.xs,
        textTransform: 'capitalize',
    },
    chevron: {
        ...theme.typography.body,
        color: theme.colors?.textSecondary,
        marginLeft: theme.spacing.sm,
    },
    expandedSection: {
        marginTop: theme.spacing.sm,
        marginLeft: theme.spacing.md,
        gap: theme.spacing.sm,
    },
    optionItem: {
        backgroundColor: theme.colors?.background,
        borderWidth: 1,
        borderColor: theme.colors?.border,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
    },
    optionItemSelected: {
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
});

export default SettingsScreen;