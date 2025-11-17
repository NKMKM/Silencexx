import React, { useEffect } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';

interface CloudProps {
  size: number;
  color: string;
  top?: number;
  left?: number;
  right?: number;
  bottom?: number;
  yMovement: [number, number, number];
  xMovement: [number, number, number];
  scaleMovement: [number, number, number];
  duration: number;
}

function AnimatedCloud({
  size,
  color,
  top,
  left,
  right,
  bottom,
  yMovement,
  xMovement,
  scaleMovement,
  duration,
}: CloudProps) {
  const translateY = useSharedValue(0);
  const translateX = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    translateY.value = withRepeat(
      withSequence(
        withTiming(yMovement[1], { duration: duration * 800, easing: Easing.inOut(Easing.ease) }),
        withTiming(yMovement[2], { duration: duration * 800, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );

    translateX.value = withRepeat(
      withSequence(
        withTiming(xMovement[1], { duration: duration * 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(xMovement[2], { duration: duration * 1000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );

    // Убираем scale анимацию для производительности
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { translateX: translateX.value },
    ],
  }));

  const positionStyle: ViewStyle = {
    position: 'absolute',
    width: size,
    height: size,
    backgroundColor: color,
    borderRadius: size / 2,
    ...(top !== undefined && { top }),
    ...(left !== undefined && { left }),
    ...(right !== undefined && { right }),
    ...(bottom !== undefined && { bottom }),
  };

  return <Animated.View style={[positionStyle, animatedStyle]} />;
}

export function FloatingClouds() {
  return (
    <View style={styles.container} pointerEvents="none">
      <AnimatedCloud
        size={128}
        color="rgba(255, 255, 255, 0.4)"
        top={80}
        left={40}
        yMovement={[0, 30, 0]}
        xMovement={[0, 20, 0]}
        scaleMovement={[1, 1.1, 1]}
        duration={8}
      />
      <AnimatedCloud
        size={160}
        color="rgba(191, 219, 254, 0.3)"
        top={160}
        right={80}
        yMovement={[0, -40, 0]}
        xMovement={[0, -30, 0]}
        scaleMovement={[1, 1.15, 1]}
        duration={10}
      />
      <AnimatedCloud
        size={144}
        color="rgba(216, 180, 254, 0.3)"
        bottom={128}
        left={100}
        yMovement={[0, 25, 0]}
        xMovement={[0, 15, 0]}
        scaleMovement={[1, 1.12, 1]}
        duration={9}
      />
      <AnimatedCloud
        size={112}
        color="rgba(251, 207, 232, 0.3)"
        top={300}
        right={40}
        yMovement={[0, -20, 0]}
        xMovement={[0, 25, 0]}
        scaleMovement={[1, 1.08, 1]}
        duration={7}
      />
      <AnimatedCloud
        size={96}
        color="rgba(165, 243, 252, 0.25)"
        top={40}
        left={130}
        yMovement={[0, -15, 0]}
        xMovement={[0, -20, 0]}
        scaleMovement={[1, 1.2, 1]}
        duration={11}
      />
      <AnimatedCloud
        size={128}
        color="rgba(199, 210, 254, 0.25)"
        bottom={80}
        right={130}
        yMovement={[0, 35, 0]}
        xMovement={[0, 15, 0]}
        scaleMovement={[1, 1.1, 1]}
        duration={12}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
});
