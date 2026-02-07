import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Platform } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

import DashboardScreen from '@/screens/main/DashboardScreen';
import WeightScreen from '@/screens/main/WeightScreen';
import PlanScreen from '@/screens/main/PlanScreen';
import ProgressScreen from '@/screens/main/ProgressScreen';
import SettingsScreen from '@/screens/main/SettingsScreen';
import { colors } from '@/theme';

export type MainTabParamList = {
    Dashboard: undefined;
    Weight: undefined;
    Plan: undefined;
    Progress: undefined;
    Settings: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

const MainNavigator: React.FC = () => {
    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                tabBarIcon: ({ focused, color, size }) => {
                    let iconName: string;

                    switch (route.name) {
                        case 'Dashboard':
                            iconName = focused ? 'home' : 'home-outline';
                            break;
                        case 'Weight':
                            iconName = focused ? 'scale' : 'scale-outline';
                            break;
                        case 'Plan':
                            iconName = focused ? 'restaurant' : 'restaurant-outline';
                            break;
                        case 'Progress':
                            iconName = focused ? 'trending-up' : 'trending-up-outline';
                            break;
                        case 'Settings':
                            iconName = focused ? 'settings' : 'settings-outline';
                            break;
                        default:
                            iconName = 'circle';
                    }

                    return <Icon name={iconName} size={size} color={color} />;
                },
                tabBarActiveTintColor: colors?.primary,
                tabBarInactiveTintColor: colors?.textSecondary,
                tabBarStyle: {
                    backgroundColor: colors?.surface,
                    borderTopColor: colors?.border,
                    paddingBottom: Platform.OS === 'ios' ? 20 : 5,
                    height: Platform.OS === 'ios' ? 85 : 60,
                },
                headerShown: false,
            })}
        >
            <Tab.Screen
                name="Dashboard"
                component={DashboardScreen}
                options={{ tabBarLabel: 'Home' }}
            />
            <Tab.Screen
                name="Weight"
                component={WeightScreen}
                options={{ tabBarLabel: 'Weight' }}
            />
            <Tab.Screen
                name="Plan"
                component={PlanScreen}
                options={{ tabBarLabel: 'Plan' }}
            />
            <Tab.Screen
                name="Progress"
                component={ProgressScreen}
                options={{ tabBarLabel: 'Progress' }}
            />
            <Tab.Screen
                name="Settings"
                component={SettingsScreen}
                options={{ tabBarLabel: 'Settings' }}
            />
        </Tab.Navigator>
    );
};

export default MainNavigator;