import React from "react";
import { StyleSheet, Text, View } from "react-native";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

export function SwipeableSheet({ onClose, children }) {
  const translateY = useSharedValue(0);
  const translateX = useSharedValue(0);

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      // Nur nach unten ziehen erlauben (nach oben blockieren)
      translateY.value = Math.max(-200, e.translationY);
      translateX.value = Math.max(-200, e.translationX);
      console.log(e.translationY);
    })
    .onEnd(() => {
      // Federt zurück auf 0
      translateY.value = withSpring(0);
      translateX.value = withSpring(0);
    });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }, { translateX: translateX.value }],
  }));

  return (
    <GestureHandlerRootView style={styles.root}>
      <GestureDetector gesture={pan}>
        <Animated.View style={[styles.sheet, sheetStyle]}>
          {/* Kleiner Griff oben als Orientierung */}
          <View style={styles.handle} />

          {/* Weißes Test-Kästchen */}
          <View style={styles.whiteBox}>
            <Text style={styles.boxText}>Zieh mich nach unten</Text>
          </View>

          {children}
        </Animated.View>
      </GestureDetector>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#0A0A0A", // Dunkler Hintergrund dahinter
  },
  sheet: {
    flex: 1,
    backgroundColor: "#1E1B18", // Etwas heller als root, damit man die Kante sieht
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  handle: {
    position: "absolute",
    top: 14,
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
  },
  whiteBox: {
    width: 180,
    height: 180,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  boxText: {
    color: "#171412",
    fontSize: 15,
    fontWeight: "700",
  },
});