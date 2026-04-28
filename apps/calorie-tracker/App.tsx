import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet } from 'react-native';
import { initErrorTracking } from './src/observability/errorTracking';
import { logEvent } from './src/observability/logger';
import { HomeScreen } from './src/screens/HomeScreen';
import { palette } from './src/theme/colors';

export default function App() {
  useEffect(() => {
    void initErrorTracking();
    logEvent('info', 'app_bootstrap');
  }, []);

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <HomeScreen />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.background,
  },
});
