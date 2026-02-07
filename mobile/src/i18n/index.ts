/**
 * Internationalization Configuration
 * Sets up i18next for multi-language support
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as RNLocalize from 'react-native-localize';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import translation resources
import en from './locales/en.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import de from './locales/de.json';
import it from './locales/it.json';

const LANGUAGE_DETECTOR = {
    type: 'languageDetector' as const,
    async: true,
    detect: async (callback: (lng: string) => void) => {
        try {
            // Try to get saved language from AsyncStorage
            const savedLanguage = await AsyncStorage.getItem('user-language');
            if (savedLanguage) {
                callback(savedLanguage);
                return;
            }

            // Fall back to device locale
            const deviceLocales = RNLocalize.getLocales();
            if (deviceLocales.length > 0) {
                const deviceLanguage = deviceLocales[0].languageCode;
                callback(deviceLanguage);
                return;
            }

            // Final fallback to English
            callback('en');
        } catch (error) {
            console.warn('Error detecting language:', error);
            callback('en');
        }
    },
    init: () => { },
    cacheUserLanguage: async (lng: string) => {
        try {
            await AsyncStorage.setItem('user-language', lng);
        } catch (error) {
            console.warn('Error caching language:', error);
        }
    },
};

const resources = {
    en: { translation: en },
    es: { translation: es },
    fr: { translation: fr },
    de: { translation: de },
    it: { translation: it },
};

i18n
    .use(LANGUAGE_DETECTOR)
    .use(initReactI18next)
    .init({
        resources,
        fallbackLng: 'en',
        debug: __DEV__,

        interpolation: {
            escapeValue: false, // React already escapes values
        },

        react: {
            useSuspense: false, // Disable suspense for React Native
        },

        // Namespace configuration
        defaultNS: 'translation',
        ns: ['translation'],

        // Key separator
        keySeparator: '.',
        nsSeparator: ':',

        // Pluralization
        pluralSeparator: '_',
        contextSeparator: '_',

        // Missing key handling
        saveMissing: __DEV__,
        missingKeyHandler: (lng, ns, key, fallbackValue) => {
            if (__DEV__) {
                console.warn(`Missing translation key: ${key} for language: ${lng}`);
            }
        },
    });

export default i18n;