/* Jest setup: in-memory AsyncStorage and quiet native modules. */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
