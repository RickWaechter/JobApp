import React, { useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Animated, 
  Dimensions, 
  Pressable 
} from 'react-native';
import { useTranslation } from 'react-i18next';

const { width } = Dimensions.get('window');

export default function Info({ visible, onClose, message = '' }) {
  const { t } = useTranslation();
  const slideAnim = useRef(new Animated.Value(width)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 8,
          tension: 45,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: width,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, slideAnim, fadeAnim]);

  return (
    <View 
      style={styles.backdropLayer} 
      pointerEvents={visible ? 'auto' : 'none'}
    >
      {/* Halbtransparenter Dark-Backdrop mit Fade-In */}
      <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      {/* Zentrierter Wrapper */}
      <View style={styles.centerContainer} pointerEvents="box-none">
        <Animated.View 
          style={[
            styles.modalCard, 
            {
              transform: [{ translateX: slideAnim }]
            }
          ]}
        >
          {/* Subtiler Glow-Orb (wie bei primaryCard) */}
          <View style={styles.glowEffect} />

          {/* Top-Leiste: Badge + Schließen-Button */}
          <View style={styles.headerRow}>
            <View style={styles.badgePrimary}>
              <View style={styles.statusDot} />
              <Text style={styles.badgePrimaryText}>
                {t('common.infoBadge').toUpperCase()}
              </Text>
            </View>

            <Pressable 
              onPress={onClose} 
              hitSlop={15}
              style={({ pressed }) => [styles.closeBtn, pressed && styles.btnPressed]}
            >
              <Text style={styles.closeX}>✕</Text>
            </Pressable>
          </View>

          {/* Text-Inhalt */}
          <View style={styles.body}>
            <Text style={styles.messageText}>{message}</Text>
          </View>

          {/* Schließen / Bestätigen Button */}
          <Pressable 
            onPress={onClose}
            style={({ pressed }) => [styles.confirmButton, pressed && styles.btnPressed]}
          >
            <Text style={styles.confirmButtonText}>
              {t('common.understood')}
            </Text>
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdropLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    elevation: 9999,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 12, 18, 0.82)',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 22,
  },
  modalCard: {
    position: 'relative',
    width: Math.min(width * 0.88, 380),
    backgroundColor: '#171B26',
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.35)',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 18,
    elevation: 10,
    overflow: 'hidden',
  },
  glowEffect: {
    position: 'absolute',
    top: -30,
    right: -30,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  badgePrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#3B82F6',
    marginRight: 6,
  },
  badgePrimaryText: {
    color: '#60A5FA',
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeX: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
    fontWeight: 'bold',
    lineHeight: 16,
  },
  body: {
    marginBottom: 20,
  },
  messageText: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 14.5,
    lineHeight: 22,
    fontWeight: '500',
  },
  confirmButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  btnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
});