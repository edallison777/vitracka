module.exports = {
    getLocales: jest.fn(() => [
        {
            languageCode: 'en',
            countryCode: 'GB',
            languageTag: 'en-GB',
            isRTL: false
        }
    ]),
    getNumberFormatSettings: jest.fn(() => ({
        decimalSeparator: '.',
        groupingSeparator: ','
    })),
    getCalendar: jest.fn(() => 'gregorian'),
    getCountry: jest.fn(() => 'GB'),
    getCurrencies: jest.fn(() => ['GBP']),
    getTemperatureUnit: jest.fn(() => 'celsius'),
    getTimeZone: jest.fn(() => 'Europe/London'),
    uses24HourClock: jest.fn(() => true),
    usesMetricSystem: jest.fn(() => true),
    usesAutoDateAndTime: jest.fn(() => true),
    usesAutoTimeZone: jest.fn(() => true),
    findBestAvailableLanguage: jest.fn(() => ({
        languageTag: 'en-GB',
        isRTL: false
    }))
};