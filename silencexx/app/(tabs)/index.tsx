import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ChatPage } from '@/components/ChatPage';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <ChatPage />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
