import { useEffect, useRef } from 'react';
import { Animated, Dimensions, Text, TouchableWithoutFeedback } from 'react-native';

const BottomPopup = ({ visible, message, onClose }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-60)).current; // Start über dem Bildschirm
  const rotateAnim = useRef(new Animated.Value(0)).current;

  const loopRef = useRef(null);

  useEffect(() => {
    if (visible) {
      // Fade + Slide IN parallel
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        })
      ]).start();

      // Start rotation loop (nur falls du es später brauchst)
      loopRef.current = Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      );
      loopRef.current.start();
      
    } else {
      // Fade + Slide OUT
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: -60,
          duration: 250,
          useNativeDriver: true,
        })
      ]).start();

      // Stop rotation
      if (loopRef.current) {
        loopRef.current.stop();
        rotateAnim.setValue(0);
      }
    }
  }, [visible]);

  const { width } = Dimensions.get("window");

  if (!visible) return null;

  return (
    <TouchableWithoutFeedback onPress={onClose}>
      <Animated.View
        style={{
          position: 'absolute',
          top: '4%',
          left: 0,
          width: width,
          height: 50,
          backgroundColor: '#3f4377ff',
          borderRadius: 10,
          justifyContent: 'center',
          alignItems: 'center',
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }], // ← WICHTIG!
          zIndex: 1000,
        }}
      >
        <Text
          style={{
            color: '#fff',
            fontSize: width * 0.04,
            textAlign: 'center',
          }}
        >
          {message}
        </Text>
      </Animated.View>
    </TouchableWithoutFeedback>
  );
};

export default BottomPopup;
