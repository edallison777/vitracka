import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '@/theme';

const ProgressScreen: React.FC = () => {
    return (
        <View style={styles.container}>
            <Text style={styles.title}>Progress</Text>
            <Text style={styles.subtitle}>Progress visualization coming soon</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors?.background,
        padding: theme.spacing.lg,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        ...theme.typography.h2,
        color: theme.colors?.text,
        marginBottom: theme.spacing.md,
    },
    subtitle: {
        ...theme.typography.body,
        color: theme.colors?.textSecondary,
    },
});

export default ProgressScreen;