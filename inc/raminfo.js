import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import DeviceInfo from 'react-native-device-info';

export default function RamMonitor() {
  const [usedRamMb, setUsedRamMb] = useState(0);
  const [totalRamMb, setTotalRamMb] = useState(0);

  useEffect(() => {
    // Gesamten RAM des Geräts einmalig auslesen
    DeviceInfo.getTotalMemory().then((totalBytes) => {
      setTotalRamMb(Math.round(totalBytes / (1024 * 1024)));
    });

    // Intervall: Alle 1,5 Sekunden den verbrauchten RAM der App abfragen
    const interval = setInterval(async () => {
      try {
        const usedBytes = await DeviceInfo.getUsedMemory();
        setUsedRamMb(Math.round(usedBytes / (1024 * 1024)));
      } catch (error) {
        console.warn('RAM konnte nicht ausgelesen werden:', error);
      }
    }, 1500);

    return () => clearInterval(interval);
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.text}>
        💾 App RAM: <Text style={styles.highlight}>{usedRamMb} MB</Text> / {totalRamMb} MB
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1C1C1E',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginVertical: 6,
    alignSelf: 'center',
  },
  text: {
    color: '#E5E5EA',
    fontSize: 13,
    fontWeight: '500',
  },
  highlight: {
    color: '#30D158', // Grün für den aktuellen RAM
    fontWeight: 'bold',
  },
});