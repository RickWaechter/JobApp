// comp/KeyboardPrewarmer.jsx
import React, { useEffect, useRef, useState } from "react";
import {
  TextInput,
  StyleSheet,
  InteractionManager,
  Platform,
} from "react-native";

// Modulweiter Speicher: Nur ein einziges Mal pro App-Session ausführen
let hasPrewarmedGlobally = false;

export default function KeyboardDummy({ delay = 350 }) {
  const dummyRef = useRef(null);
  const [shouldRender, setShouldRender] = useState(!hasPrewarmedGlobally);

  useEffect(() => {
    if (hasPrewarmedGlobally) return;

    // 1. Warten, bis alle Transitionen / Screen-Animationen durch sind
    const interactionTask = InteractionManager.runAfterInteractions(() => {
      const timer = setTimeout(() => {
        if (hasPrewarmedGlobally) return;
        hasPrewarmedGlobally = true;

        dummyRef.current?.focus();

        // Auf iOS reicht ein kurzer Frame-Abstand, auf Android 30-50ms
        const blurDelay = Platform.OS === "ios" ? 40 : 40;
        setTimeout(() => {
          dummyRef.current?.blur();
          // Nach dem Blur den Dummy komplett aus dem Komponentenbaum entfernen
          setShouldRender(false);
        }, blurDelay);
      }, delay);

      return () => clearTimeout(timer);
    });

    return () => interactionTask.cancel();
  }, [delay]);

  if (!shouldRender) return null;

  return (
    <TextInput
      ref={dummyRef}
      style={styles.hiddenInput}
      editable={true}
      pointerEvents="none"
      tabIndex={-1}
      aria-hidden={true}
      autoCorrect={true}
        keyboardType="default"
      spellCheck={true}
      // Verhindert unnötige Autocomplete-Checks
      importantForAutofill="no"
    />
  );
}

const styles = StyleSheet.create({
  hiddenInput: {
    position: "absolute",
    top: -9999,
    left: -9999,
    width: 1,
    height: 1,
    opacity: 0,
  },
}); 