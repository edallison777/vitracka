const React = require('react');

module.exports = {
    useTranslation: () => ({
        t: (key) => key,
        i18n: {
            changeLanguage: jest.fn(() => Promise.resolve()),
            language: 'en',
            languages: ['en'],
        },
        ready: true,
    }),
    Trans: ({ children, i18nKey }) => children || i18nKey,
    Translation: ({ children }) => children((key) => key, { i18n: { language: 'en' } }),
    I18nextProvider: ({ children }) => children,
    initReactI18next: {
        type: '3rdParty',
        init: jest.fn(),
    },
    withTranslation: () => (Component) => {
        const WithTranslation = React.forwardRef((props, ref) => {
            return React.createElement(Component, {
                ...props,
                ref,
                t: (key) => key,
                i18n: {
                    changeLanguage: jest.fn(() => Promise.resolve()),
                    language: 'en',
                    languages: ['en'],
                },
                tReady: true,
            });
        });
        WithTranslation.displayName = `WithTranslation(${Component.displayName || Component.name})`;
        return WithTranslation;
    },
    I18n: ({ children }) => children((key) => key, { i18n: { language: 'en' } }),
};