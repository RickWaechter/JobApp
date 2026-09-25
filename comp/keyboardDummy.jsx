// comp/KeyboardPrewarmer.jsx
import React, { useEffect, useRef } from 'react';
import { TextInput, StyleSheet } from 'react-native';

export default function KeyboardDummy({ delay = 150 }) {
  const dummyRef = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      dummyRef.current?.focus();
      requestAnimationFrame(() => {
        dummyRef.current?.blur();
      });
    }, delay);

    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <TextInput
      ref={dummyRef}
      style={styles.hiddenInput}
      editable={true}
      pointerEvents="none"
      tabIndex={-1}
      aria-hidden={true}
    />
  );
}

const styles = StyleSheet.create({
  hiddenInput: {
    position: 'absolute',
    top: -9999,
    left: -9999,
    width: 1,
    height: 1,
    opacity: 0,
  },
});