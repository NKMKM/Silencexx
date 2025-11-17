import React, { PropsWithChildren, useState } from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type CollapsibleProps = PropsWithChildren<{
  title: string;
}>;

export function Collapsible({ children, title }: CollapsibleProps) {
  const [isOpen, setIsOpen] = useState(false);
  const colorScheme = useColorScheme();
  const animationProgress = useSharedValue(0);

  const toggleCollapsible = () => {
    setIsOpen(!isOpen);
    animationProgress.value = withTiming(isOpen ? 0 : 1, { duration: 250 });
  };

  const headerStyle = useAnimatedStyle(() => {
    return {
      borderBottomLeftRadius: interpolate(
        animationProgress.value,
        [0, 1],
        [8, 0],
        Extrapolate.CLAMP
      ),
      borderBottomRightRadius: interpolate(
        animationProgress.value,
        [0, 1],
        [8, 0],
        Extrapolate.CLAMP
      ),
    };
  });

  const contentStyle = useAnimatedStyle(() => {
    return {
      maxHeight: interpolate(
        animationProgress.value,
        [0, 1],
        [0, 1000],
        Extrapolate.CLAMP
      ),
      opacity: animationProgress.value,
    };
  });

  const iconStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          rotate: `${interpolate(
            animationProgress.value,
            [0, 1],
            [0, 90]
          )}deg`,
        },
      ],
    };
  });

  return (
    <ThemedView style={styles.container}>
      <TouchableOpacity
        style={styles.heading}
        onPress={toggleCollapsible}
        activeOpacity={0.8}
      >
        <Animated.View style={[styles.header, headerStyle]}>
          <ThemedText type="defaultSemiBold" style={styles.title}>
            {title}
          </ThemedText>
          <Animated.View style={iconStyle}>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={colorScheme === 'dark' ? Colors.dark.icon : Colors.light.icon}
            />
          </Animated.View>
        </Animated.View>
      </TouchableOpacity>
      <Animated.View style={[styles.content, contentStyle]}>
        <ThemedView style={styles.contentInner}>{children}</ThemedView>
      </Animated.View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
    borderRadius: 8,
    overflow: 'hidden',
  },
  heading: {
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  title: {
    flex: 1,
  },
  content: {
    overflow: 'hidden',
  },
  contentInner: {
    padding: 16,
    gap: 8,
  },
});
