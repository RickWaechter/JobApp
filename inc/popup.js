import React, { useRef, useEffect } from 'react';
import { View, Text, Animated, TouchableWithoutFeedback, Dimensions } from 'react-native';
import { ActivityIndicator } from 'react-native';
const BottomPopup = ({ visible, message, onClose }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current; // Startet unsichtbar
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      ).start();
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });
const { width, height } = Dimensions.get("window");
  return (
    <TouchableWithoutFeedback onPress={onClose}>
      <Animated.View
        style={{
       
          position: 'absolute',
          top: '40%',
          left: width / 2 - width * 0.8 / 2,
          width: width * 0.8,
          height: 150,
          marginLeft: 0,
          backgroundColor: '#333',
          borderRadius: 10,
          justifyContent: 'center',
          alignItems: 'center',
          opacity: fadeAnim,
        }}>

        <Animated.View style={{ transform: [{ rotate: rotateInterpolate }] }}>
      
          <ActivityIndicator size="large" color="#fff" />
        </Animated.View>
        <Text style={{ color: '#fff', fontSize: width * 0.04, marginTop: 10, textAlign: 'center' }}>{message}</Text>
      </Animated.View>
    </TouchableWithoutFeedback>
  );
};

export default BottomPopup;