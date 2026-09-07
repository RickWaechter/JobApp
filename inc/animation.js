import { useRef } from 'react';
import { Animated } from 'react-native';

export function animatedParallelSingle(minValue = 1, maxValue = 1.2, duration = 200) {
  // useRef sorgt dafür, dass die Instanz über Re-Renders hinweg stabil bleibt
  const anim = useRef(new Animated.Value(minValue)).current;

  const increaseSingle = () => {
    Animated.timing(anim, {
      toValue: maxValue,
      duration,
      useNativeDriver: true, // Läuft direkt im nativen UI-Thread
    }).start();
  };

  const decreaseSingle = () => {
    Animated.timing(anim, {
      toValue: minValue,
      duration,
      useNativeDriver: true,
    }).start();
  };

  return { anim, increaseSingle, decreaseSingle };
}

export function animatedParallel({
  first = { min: 1, max: 1.15 },
  second = { min: 0.6, max: 1.0 },
  duration = 200,
} = {}) {
  const anim1 = useRef(new Animated.Value(first.min)).current;
  const anim2 = useRef(new Animated.Value(second.min)).current;

  const increaseParallel = () => {
    Animated.parallel([
      Animated.timing(anim1, {
        toValue: first.max,
        duration,
        useNativeDriver: true,
      }),
      Animated.timing(anim2, {
        toValue: second.max,
        duration,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const decreaseParallel = () => {
    Animated.parallel([
      Animated.timing(anim1, {
        toValue: first.min,
        duration,
        useNativeDriver: true,
      }),
      Animated.timing(anim2, {
        toValue: second.min,
        duration,
        useNativeDriver: true,
      }),
    ]).start();
  };

  return { anim1, anim2, increaseParallel, decreaseParallel };
}