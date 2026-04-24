import React, { useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Animated, 
  Dimensions, 
  Pressable 
} from 'react-native';

const { width } = Dimensions.get('window');

export default function Info({ visible, onClose, message }) {
  // Der Wert startet bei der vollen Bildschirmbreite (außerhalb rechts)
  const slideAnim = useRef(new Animated.Value(width)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: width,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, slideAnim]);

  return (
    <Animated.View 
      style={[
        styles.container, 
        { 
           height: (Math.floor(message.length / 25) * 25),
          // translateX: slideAnim bewegt es rein/raus
          // -width * 0.425 schiebt es horizontal in die Mitte (da Breite 85% ist)
          transform: [
            { translateX: slideAnim },
            { translateX: - (width * 0.85) / 2 } 
          ] 
        }
      ]}
    >
      <View style={styles.header}>
        <Pressable onPress={onClose} hitSlop={20}>
          <Text style={styles.closeX}>✕</Text>
        </Pressable>
      </View>
      
      <View style={styles.body}>
        <Text style={styles.text}>{message}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    // Positioniert die obere linke Ecke genau in der Mitte des Screens
    top: '50%',
    left: '50%',
    
    // Die Box ist 85% breit und 30% hoch
    width: width * 0.85,
    
    // Verschiebt die Box um die Hälfte ihrer eigenen Höhe nach oben,
    // damit sie vertikal perfekt mittig sitzt
    marginTop: -(Dimensions.get('window').height * 0.3) / 2,
    
    backgroundColor: 'white',
    borderRadius: 20, // Abgerundete Ecken sehen bei zentrierten Boxen besser aus
    padding: 25,
    
    // Schatten & Layering
    elevation: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    zIndex: 1000,
  },
  header: {
    position: 'absolute',
    top: 12,
    right: 17,

    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  closeX: {
    fontSize: 24,
    color: '#999',
    fontWeight: 'bold',
  },
  body: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
  }
});