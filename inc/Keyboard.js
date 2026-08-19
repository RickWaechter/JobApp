import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Keyboard, Platform } from 'react-native';

const useKeyboardAnimation = (duration = 300) => {
  const animated = useRef(new Animated.Value(0)).current;  
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Animated -> state spiegeln
  useEffect(() => {
    const id = animated.addListener(({ value }) => setKeyboardHeight(value));
    return () => animated.removeListener(id);
  }, [animated]);

  useEffect(() => {
    const animateTo = (to) =>
      Animated.timing(animated, {
        toValue: to,
        duration,
        useNativeDriver: true,
      }).start();

    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const onShow = (e) => animateTo(e.endCoordinates.height);
    const onHide = () => animateTo(0);

    const showSub = Keyboard.addListener(showEvent, onShow);
    const hideSub = Keyboard.addListener(hideEvent, onHide);

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [duration, animated]);

  const reset = useCallback(() => animated.setValue(0), [animated]);

  return { keyboardHeight, reset, animated };
};

export default useKeyboardAnimation;
