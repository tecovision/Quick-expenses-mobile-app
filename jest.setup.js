// AsyncStorage is a native module with no JS implementation under Jest.
// Swap in the official in-memory mock it ships with.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
