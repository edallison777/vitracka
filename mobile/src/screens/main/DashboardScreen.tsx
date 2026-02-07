import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { LineChart } from 'react-native-chart-kit';
import { RootState, AppDispatch } from '@/store';
import { fetchWeightEntries } from '@/store/slices/weightSlice';
import { theme } from '@/theme';

const { width: screenWidth } = Dimensions.get('window');

const DashboardScreen: React.FC = () => {
    const dispatch = useDispatch<AppDispatch>();
    const { user } = useSelector((state: RootState) => state.auth);
    const { profile } = useSelector((state: RootState) => state.user);
    const { entries } = useSelector((state: RootState) => state.weight);
    const [greeting, setGreeting] = useState('Good Morning!');

    useEffect(() => {
        const hour = new Date().getHours();
        if (hour < 12) {
            setGreeting('Good Morning!');
        } else if (hour < 17) {
            setGreeting('Good Afternoon!');
        } else {
            setGreeting('Good Evening!');
        }
    }, []);

    useEffect(() => {
        if (user?.id) {
            dispatch(fetchWeightEntries(user.id));
        }
    }, [dispatch, user?.id]);

    const getRecentWeight = () => {
        if (entries.length === 0) return null;
        return entries[0]; // Entries are sorted by timestamp desc
    };

    const getWeightTrend = () => {
        if (entries.length < 2) return null;
        const recent = entries[0].weight;
        const previous = entries[1].weight;
        const diff = recent - previous;
        return {
            change: Math.abs(diff),
            direction: diff > 0 ? 'up' : diff < 0 ? 'down' : 'stable',
        };
    };

    const getChartData = () => {
        if (entries.length === 0) {
            return {
                labels: ['No Data'],
                datasets: [{
                    data: [0],
                    strokeWidth: 2,
                }],
            };
        }

        // Get last 7 entries for the chart
        const recentEntries = entries.slice(0, 7).reverse();
        const labels = recentEntries.map(entry => {
            const date = new Date(entry.timestamp);
            return `${date.getMonth() + 1}/${date.getDate()}`;
        });
        const data = recentEntries.map(entry => entry.weight);

        return {
            labels,
            datasets: [{
                data,
                strokeWidth: 2,
                color: (opacity = 1) => `rgba(${theme.colors?.primary?.replace('#', '')}, ${opacity})`,
            }],
        };
    };

    const recentWeight = getRecentWeight();
    const weightTrend = getWeightTrend();
    const chartData = getChartData();

    const getCoachingMessage = () => {
        if (!profile) return "Welcome to Vitracka! Let's start your journey.";

        const style = profile.preferences.coachingStyle;
        const hasRecentWeight = recentWeight && new Date(recentWeight.timestamp).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000;

        if (!hasRecentWeight) {
            switch (style) {
                case 'gentle':
                    return "When you're ready, consider logging your weight. No pressure - you're in control.";
                case 'pragmatic':
                    return "Regular weight tracking helps identify patterns. Consider logging when convenient.";
                case 'upbeat':
                    return "Ready to track your progress? Every step counts on this amazing journey!";
                case 'structured':
                    return "Consistent weight logging is key to tracking progress. Aim for weekly entries.";
                default:
                    return "Consider logging your weight to track your progress.";
            }
        }

        if (weightTrend) {
            switch (style) {
                case 'gentle':
                    return weightTrend.direction === 'down'
                        ? "You're making gentle progress. Be kind to yourself."
                        : "Remember, weight naturally fluctuates. Focus on how you feel.";
                case 'pragmatic':
                    return weightTrend.direction === 'down'
                        ? `Down ${weightTrend.change.toFixed(1)} ${recentWeight?.unit}. Steady progress.`
                        : "Weight fluctuations are normal. Look at the overall trend.";
                case 'upbeat':
                    return weightTrend.direction === 'down'
                        ? "Fantastic progress! You're doing amazing!"
                        : "Every day is a new opportunity. You've got this!";
                case 'structured':
                    return weightTrend.direction === 'down'
                        ? `Progress: -${weightTrend.change.toFixed(1)} ${recentWeight?.unit}. Stay consistent.`
                        : "Focus on your plan. Consistency leads to results.";
                default:
                    return "Keep up the great work on your journey!";
            }
        }

        return "You're doing great! Keep focusing on your goals.";
    };

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>{greeting}</Text>
                <Text style={styles.subtitle}>How are you feeling today?</Text>
            </View>

            <View style={styles.content}>
                {recentWeight && (
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Current Weight</Text>
                        <View style={styles.weightDisplay}>
                            <Text style={styles.weightValue}>
                                {recentWeight.weight} {recentWeight.unit}
                            </Text>
                            {weightTrend && (
                                <View style={styles.trendContainer}>
                                    <Text style={[
                                        styles.trendText,
                                        weightTrend.direction === 'down' && styles.trendDown,
                                        weightTrend.direction === 'up' && styles.trendUp,
                                    ]}>
                                        {weightTrend.direction === 'down' ? '↓' : weightTrend.direction === 'up' ? '↑' : '→'}
                                        {weightTrend.change.toFixed(1)} {recentWeight.unit}
                                    </Text>
                                </View>
                            )}
                        </View>
                        <Text style={styles.lastUpdated}>
                            Last updated: {new Date(recentWeight.timestamp).toLocaleDateString()}
                        </Text>
                    </View>
                )}

                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Weight Trend</Text>
                    {entries.length > 0 ? (
                        <LineChart
                            data={chartData}
                            width={screenWidth - 2 * theme.spacing.lg - 2 * theme.spacing.lg}
                            height={200}
                            chartConfig={{
                                backgroundColor: theme.colors?.surface,
                                backgroundGradientFrom: theme.colors?.surface || '#ffffff',
                                backgroundGradientTo: theme.colors?.surface || '#ffffff',
                                decimalPlaces: 1,
                                color: (opacity = 1) => theme.colors?.primary || `rgba(0, 122, 255, ${opacity})`,
                                labelColor: (opacity = 1) => theme.colors?.text || `rgba(0, 0, 0, ${opacity})`,
                                style: {
                                    borderRadius: theme.borderRadius.md,
                                },
                                propsForDots: {
                                    r: '4',
                                    strokeWidth: '2',
                                    stroke: theme.colors?.primary || '#007AFF',
                                },
                            }}
                            bezier
                            style={styles.chart}
                        />
                    ) : (
                        <View style={styles.noDataContainer}>
                            <Text style={styles.noDataText}>
                                Start logging your weight to see trends here
                            </Text>
                        </View>
                    )}
                </View>

                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Today's Coaching</Text>
                    <Text style={styles.coachingText}>
                        {getCoachingMessage()}
                    </Text>
                </View>

                {profile?.goals && (
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Your Goal</Text>
                        <Text style={styles.goalText}>
                            {profile.goals.type === 'loss' && 'Weight Loss Journey'}
                            {profile.goals.type === 'maintenance' && 'Weight Maintenance'}
                            {profile.goals.type === 'transition' && 'Medication Transition Support'}
                        </Text>
                        {profile.goals.targetWeight && (
                            <Text style={styles.goalDetail}>
                                Target: {profile.goals.targetWeight} {recentWeight?.unit || 'kg'}
                            </Text>
                        )}
                        {profile.goals.timeframe && (
                            <Text style={styles.goalDetail}>
                                Timeframe: {profile.goals.timeframe}
                            </Text>
                        )}
                    </View>
                )}
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
        marginBottom: theme.spacing.xs,
    },
    subtitle: {
        ...theme.typography.body,
        color: theme.colors?.textSecondary,
    },
    content: {
        padding: theme.spacing.lg,
        gap: theme.spacing.md,
    },
    card: {
        backgroundColor: theme.colors?.surface,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.lg,
        ...theme.shadows?.small,
    },
    cardTitle: {
        ...theme.typography.h3,
        color: theme.colors?.text,
        marginBottom: theme.spacing.sm,
    },
    cardContent: {
        ...theme.typography.body,
        color: theme.colors?.textSecondary,
    },
    weightDisplay: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: theme.spacing.sm,
    },
    weightValue: {
        ...theme.typography.h1,
        color: theme.colors?.primary,
        fontWeight: 'bold',
    },
    trendContainer: {
        alignItems: 'flex-end',
    },
    trendText: {
        ...theme.typography.body,
        color: theme.colors?.textSecondary,
        fontWeight: '600',
    },
    trendDown: {
        color: theme.colors?.success,
    },
    trendUp: {
        color: theme.colors?.warning,
    },
    lastUpdated: {
        ...theme.typography.caption,
        color: theme.colors?.textSecondary,
    },
    chart: {
        marginVertical: theme.spacing.sm,
        borderRadius: theme.borderRadius.md,
    },
    noDataContainer: {
        padding: theme.spacing.xl,
        alignItems: 'center',
    },
    noDataText: {
        ...theme.typography.body,
        color: theme.colors?.textSecondary,
        textAlign: 'center',
    },
    coachingText: {
        ...theme.typography.body,
        color: theme.colors?.text,
        lineHeight: 22,
        fontStyle: 'italic',
    },
    goalText: {
        ...theme.typography.body,
        color: theme.colors?.text,
        fontWeight: '600',
        marginBottom: theme.spacing.xs,
    },
    goalDetail: {
        ...theme.typography.caption,
        color: theme.colors?.textSecondary,
        marginBottom: theme.spacing.xs,
    },
});

export default DashboardScreen;