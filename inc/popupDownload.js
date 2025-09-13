import React, { useRef, useEffect } from 'react';
import { View, Text, Animated, TouchableOpacity, TouchableWithoutFeedback,StyleSheet, Dimensions } from 'react-native';
import { ActivityIndicator } from 'react-native';
import MaterialIcons from '@react-native-vector-icons/material-icons';
const BottomPopup = ({ visible, message, onClose, children }) => {
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
const styles = StyleSheet.create({
  box: {
    position: 'absolute',
    top: '40%',
    left: 0,          // (= ½ * 0.8 * width)
    width: width * 0.8,
    height: 150,
    backgroundColor: '#333',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: fadeAnim,   
    zIndex:500,       // ← bleibt aus deinem Hook
  },
  msg: {
    color: '#fff',
    fontSize: width * 0.04,
    marginTop: 10,
    textAlign: 'center',
  },
  /* NEU ---------------------------------------- */
  closeBtn: {
    position: 'absolute',
    top: -16,
    right: -12,
  },
  closeTxt: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
 return (
    <TouchableWithoutFeedback onPress={onClose}>
      <Animated.View style={styles.box /* siehe unten */}>
        {/* ❶ Close‑Button */}
        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
          <MaterialIcons name="cancel" size={35} color="#a7a7a7" />
        </TouchableOpacity>

        {/* ❷ Loader + Message */}
        <Animated.View style={{ transform: [{ rotate: rotateInterpolate }] }}>
          <ActivityIndicator size="large" color="#fff" />
        </Animated.View>
        <Text style={styles.msg}>{message}</Text>

        {/* ❸ Extra‑Children (falls benötigt) */}
        {children}
      </Animated.View>
    </TouchableWithoutFeedback>
  );
};

export default BottomPopup;
