module.exports = {
  preset: 'react-native',
  transformIgnorePatterns: [
    'node_modules/(?!(jest-)?react-native|@react-native|@react-native-community|@react-navigation|expo-modules-core|expo-.*)',
  ],
  setupFiles: ['./node_modules/react-native-gesture-handler/jestSetup.js', './__tests__/simple-setup.js'],
  setupFilesAfterEnv: ['@testing-library/jest-native/extend-expect'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1'
  },
  modulePathIgnorePatterns: ['<rootDir>/MacroScan/'],
  collectCoverageFrom: [
    '**/*.{js,jsx}',
    '!**/node_modules/**',
    '!**/coverage/**',
    '!**/android/**',
    '!**/ios/**',
    '!**/babel.config.js',
    '!**/jest.setup.js',
    '!**/jest.config.js',
    '!**/metro.config.js'
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '__tests__/providers/AnthropicProvider.test.js',
    '__tests__/screens/HistoryScreen.test.js',
    '__tests__/screens/FoodScanScreen.test.js',
    '__tests__/setup.js',
    '__tests__/simple-setup.js'
  ]
}; 