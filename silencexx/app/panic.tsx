import React from 'react';
import { View, StyleSheet } from 'react-native';
import { PanicModeScreen } from '@/components/PanicModeScreen';

export default function PanicScreen() {
  return (
    <View style={styles.container}>
      <PanicModeScreen />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
