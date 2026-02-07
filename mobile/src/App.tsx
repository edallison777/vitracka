import React from 'react';
import { StatusBar } from 'react-native';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { store, persistor } from '@/store';
import AppNavigator from '@/navigation/AppNavigator';
import { theme } from '@/theme';

const App: React.FC = () => {
    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <Provider store={store}>
                <PersistGate loading={null} persistor={persistor}>
                    <StatusBar
                        barStyle="dark-content"
                        backgroundColor={theme.colors?.background}
                    />
                    <AppNavigator />
                </PersistGate>
            </Provider>
        </GestureHandlerRootView>
    );
};

export default App;