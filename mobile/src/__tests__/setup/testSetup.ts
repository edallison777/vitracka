import 'react-native-gesture-handler/jestSetup';

// Mock Redux async thunks - only mock the functions, not the entire modules
const mockFetchWeightEntries = jest.fn(() => ({ type: 'weight/fetchWeightEntries/pending' }));
const mockAddWeightEntry = jest.fn(() => ({ type: 'weight/addWeightEntry/pending' }));
const mockUpdateWeightEntry = jest.fn(() => ({ type: 'weight/updateWeightEntry/pending' }));
const mockFetchUserProfile = jest.fn(() => ({ type: 'user/fetchUserProfile/pending' }));
const mockUpdateUserProfile = jest.fn(() => ({ type: 'user/updateUserProfile/pending' }));
const mockCreateUserProfile = jest.fn(() => ({ type: 'user/createUserProfile/pending' }));
const mockLoginUser = jest.fn(() => ({ type: 'auth/loginUser/pending' }));
const mockRegisterUser = jest.fn(() => ({ type: 'auth/registerUser/pending' }));
const mockLogoutUser = jest.fn(() => ({ type: 'auth/logoutUser/pending' }));

// Export mocks for use in tests
(global as any).mockReduxThunks = {
    fetchWeightEntries: mockFetchWeightEntries,
    addWeightEntry: mockAddWeightEntry,
    updateWeightEntry: mockUpdateWeightEntry,
    fetchUserProfile: mockFetchUserProfile,
    updateUserProfile: mockUpdateUserProfile,
    createUserProfile: mockCreateUserProfile,
    loginUser: mockLoginUser,
    registerUser: mockRegisterUser,
    logoutUser: mockLogoutUser,
};

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => {
    const Reanimated = require('react-native-reanimated/mock');
    Reanimated.default.call = () => { };
    return Reanimated;
});

// Mock react-native-chart-kit
jest.mock('react-native-chart-kit', () => {
    const React = require('react');
    return {
        LineChart: React.forwardRef((props: any, ref: any) => React.createElement('LineChart', { ...props, ref })),
        BarChart: React.forwardRef((props: any, ref: any) => React.createElement('BarChart', { ...props, ref })),
        PieChart: React.forwardRef((props: any, ref: any) => React.createElement('PieChart', { ...props, ref })),
        ProgressChart: React.forwardRef((props: any, ref: any) => React.createElement('ProgressChart', { ...props, ref })),
        ContributionGraph: React.forwardRef((props: any, ref: any) => React.createElement('ContributionGraph', { ...props, ref })),
        StackedBarChart: React.forwardRef((props: any, ref: any) => React.createElement('StackedBarChart', { ...props, ref })),
    };
});

// Mock react-native-svg
jest.mock('react-native-svg', () => {
    const React = require('react');
    return {
        Svg: React.forwardRef((props: any, ref: any) => React.createElement('Svg', { ...props, ref })),
        Circle: React.forwardRef((props: any, ref: any) => React.createElement('Circle', { ...props, ref })),
        Ellipse: React.forwardRef((props: any, ref: any) => React.createElement('Ellipse', { ...props, ref })),
        G: React.forwardRef((props: any, ref: any) => React.createElement('G', { ...props, ref })),
        Text: React.forwardRef((props: any, ref: any) => React.createElement('Text', { ...props, ref })),
        TSpan: React.forwardRef((props: any, ref: any) => React.createElement('TSpan', { ...props, ref })),
        TextPath: React.forwardRef((props: any, ref: any) => React.createElement('TextPath', { ...props, ref })),
        Path: React.forwardRef((props: any, ref: any) => React.createElement('Path', { ...props, ref })),
        Polygon: React.forwardRef((props: any, ref: any) => React.createElement('Polygon', { ...props, ref })),
        Polyline: React.forwardRef((props: any, ref: any) => React.createElement('Polyline', { ...props, ref })),
        Line: React.forwardRef((props: any, ref: any) => React.createElement('Line', { ...props, ref })),
        Rect: React.forwardRef((props: any, ref: any) => React.createElement('Rect', { ...props, ref })),
        Use: React.forwardRef((props: any, ref: any) => React.createElement('Use', { ...props, ref })),
        Image: React.forwardRef((props: any, ref: any) => React.createElement('Image', { ...props, ref })),
        Symbol: React.forwardRef((props: any, ref: any) => React.createElement('Symbol', { ...props, ref })),
        Defs: React.forwardRef((props: any, ref: any) => React.createElement('Defs', { ...props, ref })),
        LinearGradient: React.forwardRef((props: any, ref: any) => React.createElement('LinearGradient', { ...props, ref })),
        RadialGradient: React.forwardRef((props: any, ref: any) => React.createElement('RadialGradient', { ...props, ref })),
        Stop: React.forwardRef((props: any, ref: any) => React.createElement('Stop', { ...props, ref })),
        ClipPath: React.forwardRef((props: any, ref: any) => React.createElement('ClipPath', { ...props, ref })),
        Pattern: React.forwardRef((props: any, ref: any) => React.createElement('Pattern', { ...props, ref })),
        Mask: React.forwardRef((props: any, ref: any) => React.createElement('Mask', { ...props, ref })),
    };
});

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
    require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock NetInfo
jest.mock('@react-native-community/netinfo', () => ({
    fetch: jest.fn(() => Promise.resolve({ isConnected: true })),
    addEventListener: jest.fn(() => jest.fn()),
    useNetInfo: jest.fn(() => ({ isConnected: true })),
}));

// Mock react-native-vector-icons
jest.mock('react-native-vector-icons/MaterialIcons', () => {
    const React = require('react');
    return React.forwardRef((props: any, ref: any) => React.createElement('Icon', { ...props, ref }));
});
jest.mock('react-native-vector-icons/Ionicons', () => {
    const React = require('react');
    return React.forwardRef((props: any, ref: any) => React.createElement('Icon', { ...props, ref }));
});
jest.mock('react-native-vector-icons/FontAwesome', () => {
    const React = require('react');
    return React.forwardRef((props: any, ref: any) => React.createElement('Icon', { ...props, ref }));
});

// Mock React Native modules completely
jest.mock('react-native', () => {
    const React = require('react');

    const mockComponent = (name: string) => {
        const MockedComponent = React.forwardRef((props: any, ref: any) => {
            return React.createElement(name, { ...props, ref }, props.children);
        });
        MockedComponent.displayName = name;
        return MockedComponent;
    };

    return {
        // Core components
        View: mockComponent('View'),
        Text: mockComponent('Text'),
        TextInput: mockComponent('TextInput'),
        ScrollView: mockComponent('ScrollView'),
        TouchableOpacity: mockComponent('TouchableOpacity'),
        TouchableHighlight: mockComponent('TouchableHighlight'),
        TouchableWithoutFeedback: mockComponent('TouchableWithoutFeedback'),
        Pressable: mockComponent('Pressable'),
        Image: mockComponent('Image'),
        FlatList: mockComponent('FlatList'),
        SectionList: mockComponent('SectionList'),
        VirtualizedList: mockComponent('VirtualizedList'),
        VirtualizedSectionList: mockComponent('VirtualizedSectionList'),
        SafeAreaView: mockComponent('SafeAreaView'),
        KeyboardAvoidingView: mockComponent('KeyboardAvoidingView'),
        Modal: mockComponent('Modal'),
        Switch: mockComponent('Switch'),
        ActivityIndicator: mockComponent('ActivityIndicator'),

        // APIs
        Dimensions: {
            get: jest.fn(() => ({ width: 375, height: 812 })),
            addEventListener: jest.fn(),
            removeEventListener: jest.fn(),
        },
        AppState: {
            currentState: 'active',
            addEventListener: jest.fn(),
            removeEventListener: jest.fn(),
        },
        Settings: {
            get: jest.fn(),
            set: jest.fn(),
            watchKeys: jest.fn(),
            clearWatch: jest.fn(),
        },
        Alert: {
            alert: jest.fn(),
            prompt: jest.fn(),
        },
        Platform: {
            OS: 'ios',
            Version: '14.0',
            select: jest.fn((obj) => obj.ios || obj.default),
        },
        StyleSheet: {
            create: jest.fn((styles) => styles),
            flatten: jest.fn((style) => style),
            compose: jest.fn((style1, style2) => [style1, style2]),
        },
        Animated: {
            View: mockComponent('Animated.View'),
            Text: mockComponent('Animated.Text'),
            ScrollView: mockComponent('Animated.ScrollView'),
            Value: jest.fn(() => ({
                setValue: jest.fn(),
                addListener: jest.fn(),
                removeListener: jest.fn(),
                removeAllListeners: jest.fn(),
                stopAnimation: jest.fn(),
                resetAnimation: jest.fn(),
                interpolate: jest.fn(() => ({ setValue: jest.fn() })),
            })),
            timing: jest.fn(() => ({ start: jest.fn() })),
            spring: jest.fn(() => ({ start: jest.fn() })),
            decay: jest.fn(() => ({ start: jest.fn() })),
            sequence: jest.fn(() => ({ start: jest.fn() })),
            parallel: jest.fn(() => ({ start: jest.fn() })),
            stagger: jest.fn(() => ({ start: jest.fn() })),
            loop: jest.fn(() => ({ start: jest.fn() })),
            event: jest.fn(),
            createAnimatedComponent: jest.fn((component) => component),
        },
        Easing: {
            linear: jest.fn(),
            ease: jest.fn(),
            quad: jest.fn(),
            cubic: jest.fn(),
            poly: jest.fn(),
            sin: jest.fn(),
            circle: jest.fn(),
            exp: jest.fn(),
            elastic: jest.fn(),
            back: jest.fn(),
            bounce: jest.fn(),
            bezier: jest.fn(),
            in: jest.fn(),
            out: jest.fn(),
            inOut: jest.fn(),
        },

        // Native modules
        NativeModules: {
            SettingsManager: {
                settings: {},
                setValues: jest.fn(),
                getConstants: jest.fn(() => ({})),
            },
            UIManager: {
                getViewManagerConfig: jest.fn(() => ({})),
                hasViewManagerConfig: jest.fn(() => false),
                getConstants: jest.fn(() => ({})),
                getConstantsForViewManager: jest.fn(() => ({})),
                getDefaultEventTypes: jest.fn(() => []),
                lazilyLoadView: jest.fn(),
                createView: jest.fn(),
                updateView: jest.fn(),
                focus: jest.fn(),
                blur: jest.fn(),
                findSubviewIn: jest.fn(),
                dispatchViewManagerCommand: jest.fn(),
                measure: jest.fn((node, callback) => callback(0, 0, 200, 100, 0, 0)),
                measureInWindow: jest.fn((node, callback) => callback(0, 0, 200, 100)),
                measureLayout: jest.fn((node, relativeNode, onFail, onSuccess) => onSuccess(0, 0, 200, 100)),
                measureLayoutRelativeToParent: jest.fn((node, onFail, onSuccess) => onSuccess(0, 0, 200, 100)),
                setChildren: jest.fn(),
                manageChildren: jest.fn(),
                setLayoutAnimationEnabledExperimental: jest.fn(),
                sendAccessibilityEvent: jest.fn(),
                showPopupMenu: jest.fn(),
                dismissPopupMenu: jest.fn(),
            },
        },

        // Turbo modules
        TurboModuleRegistry: {
            get: jest.fn(),
            getEnforcing: jest.fn(),
        },
    };
});

// Silence the warning: Animated: `useNativeDriver` is not supported
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');

// Mock navigation
jest.mock('@react-navigation/native', () => {
    const actualNav = jest.requireActual('@react-navigation/native');
    return {
        ...actualNav,
        useNavigation: () => ({
            navigate: jest.fn(),
            dispatch: jest.fn(),
            reset: jest.fn(),
            goBack: jest.fn(),
            isFocused: jest.fn(() => true),
            canGoBack: jest.fn(() => true),
            getId: jest.fn(),
            getParent: jest.fn(),
            getState: jest.fn(() => ({})),
        }),
        useRoute: () => ({
            key: 'test',
            name: 'test',
            params: {},
        }),
        useFocusEffect: jest.fn(),
        NavigationContainer: ({ children }: any) => children,
    };
});

// Mock @react-navigation/stack
jest.mock('@react-navigation/stack', () => ({
    createStackNavigator: () => ({
        Navigator: ({ children }: any) => children,
        Screen: ({ children }: any) => children,
    }),
    CardStyleInterpolators: {},
    HeaderStyleInterpolators: {},
    TransitionPresets: {},
}));

// Mock @react-navigation/elements
jest.mock('@react-navigation/elements', () => ({
    Header: ({ children }: any) => children,
    HeaderBackButton: ({ children }: any) => children,
    HeaderTitle: ({ children }: any) => children,
    MaskedView: ({ children }: any) => children,
}));

// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => ({
    SafeAreaProvider: ({ children }: any) => children,
    SafeAreaView: ({ children }: any) => children,
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
    useSafeAreaFrame: () => ({ x: 0, y: 0, width: 375, height: 812 }),
}));

// Global test timeout
jest.setTimeout(10000);

// Suppress console warnings during tests
const originalWarn = console.warn;
const originalError = console.error;

beforeAll(() => {
    console.warn = (...args) => {
        if (
            typeof args[0] === 'string' &&
            (args[0].includes('Warning: ReactDOM.render is deprecated') ||
                args[0].includes('Warning: componentWillReceiveProps') ||
                args[0].includes('Animated: `useNativeDriver`'))
        ) {
            return;
        }
        originalWarn.call(console, ...args);
    };

    console.error = (...args) => {
        if (
            typeof args[0] === 'string' &&
            (args[0].includes('Warning: ReactDOM.render is deprecated') ||
                args[0].includes('Warning: componentWillReceiveProps'))
        ) {
            return;
        }
        originalError.call(console, ...args);
    };
});

afterAll(() => {
    console.warn = originalWarn;
    console.error = originalError;
});