import { useRef } from 'react';
import { PanResponder, Animated } from 'react-native';

/**
 * Custom hook that creates a pan responder for dragging a modal down to close it
 * @param {Object} options Configuration options
 * @param {Animated.ValueXY} options.pan Animated.ValueXY to track movement
 * @param {Function} options.onClose Function to call when modal should close
 * @param {Number} options.threshold Distance in pixels needed to trigger close (default: 150)
 * @returns {Object} The configured pan responder instance
 */
const dragDown = ({ pan, onClose, threshold = 150 }) => {
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        return Math.abs(gestureState.dy) > 20;
      },
      onPanResponderMove: (evt, gestureState) => {
        if (gestureState.dy > 0) {
          Animated.event([null, { dy: pan.y }], { useNativeDriver: false })(evt, gestureState);
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (gestureState.dy > threshold) {
          onClose();
        } else {
          Animated.spring(pan, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: false,
          }).start();
        }
      },
    })
  ).current;

  return panResponder;
};

export default dragDown;