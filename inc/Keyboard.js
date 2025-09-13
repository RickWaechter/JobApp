import { useRef, useState, useEffect, useCallback } from 'react';
import { Animated, Keyboard, Platform } from 'react-native';

const useKeyboardAnimation = (duration = 300) => {
  const animated = useRef(new Animated.Value(0)).current;   // bleibt Animated
  const [keyboardHeight, setKeyboardHeight] = useState(0);                  // ← reine Zahl

  // 1) Animated → plain number spiegeln
  useEffect(() => {
    const id = animated.addListener(({ value }) => setKeyboardHeight(value));
    return () => animated.removeListener(id);
  }, [animated]);

  // 2) Show/Hide Listener
  useEffect(() => {
    const animateTo = to =>
      Animated.timing(animated, {
        toValue: to,
        duration,
        useNativeDriver: false
      }).start();

    const onShow = e => animateTo(e.endCoordinates.height);
    const onHide = () => animateTo(0);

    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      onShow
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      onHide
    );

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [duration, animated]);

  // 3) Reset wenn Modal zu
  const reset = useCallback(() => animated.setValue(0), [animated]);

  return { keyboardHeight, reset, animated }; // keyboardHeight = Zahl, animated = Animated.Value
};

export default useKeyboardAnimation;