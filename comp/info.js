import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Animated, 
  Dimensions, 
  Pressable,
  ScrollView
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useKeyboardAnimation from '../inc/Keyboard.js';

const { width } = Dimensions.get('window');

/* ── Custom Hook für Screens (StartApp, OldScreen etc.) ── */
export const useInfoModal = () => {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState('');

  const openInfo = useCallback((key) => {
    switch (key) {
      case 'new':
        setMessage(t('info.new'));
        break;
      case 'old':
        setMessage(t('info.old'));
        break;
      case 'resume':
        setMessage(t('info.resume'));
        break;
      default:
        setMessage(key || '');
        break;
    }
    setVisible(true);
  }, [t]);

  const closeInfo = useCallback(() => {
    setVisible(false);
  }, []);

  return {
    infoVisible: visible,
    infoMessage: message,
    openInfo,
    closeInfo,
  };
};

/* ── Info-Modal Komponente ────────────────────────────── */
export default function Info({ visible, onClose, message = '', topOffset }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(width)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
const [mounted, setMounted] = useState(null);
  const { keyboardHeight, reset } = useKeyboardAnimation(250);

  /* Oberer Bereich (unterhalb der Topbar) */
  const topSpace = useMemo(() => {
    return topOffset !== undefined ? topOffset : insets.top + 50;
  }, [topOffset, insets.top]);

  /* Unterer Bereich (oberhalb der Tastatur oder Safe Area) */
  const bottomSpace = useMemo(() => {
    return keyboardHeight > 0 ? keyboardHeight : Math.max(insets.bottom, 16);
  }, [keyboardHeight, insets.bottom]);

  /* Modal Ein-/Ausblendung */

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, friction: 8, tension: 45, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else if (mounted) {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: width, duration: 220, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start(({ finished }) => {
        if (finished) setMounted(false);   // erst nach der Animation entfernen
      });
    }
  }, [visible]); // ⚠️ kein `reset` mehr in den Deps
  if (!mounted) return null;               // ⬅️ Kernpunkt
  return (
    <View 
      style={styles.backdropLayer} 
      pointerEvents={visible ? 'auto' : 'none'}
    >
      {/* Dark-Backdrop */}
      <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      {/* Zentrierter Bereich exakt zwischen Topbar und Tastatur */}
      <View 
        style={[
          styles.centerContainer, 
          { 
            top: topSpace, 
            bottom: bottomSpace 
          }
        ]} 
        pointerEvents="box-none"
      >
        <Animated.View 
          style={[
            styles.modalCard, 
            {
              transform: [{ translateX: slideAnim }]
            }
          ]}
        >
          {/* Subtiler Glow-Orb */}
          <View style={styles.glowEffect} />

          {/* Top-Leiste: Badge + Schließen-Button */}
          <View style={styles.headerRow}>
            <View style={styles.badgePrimary}>
              <View style={styles.statusDot} />
              <Text style={styles.badgePrimaryText}>
                {t('common.infoBadge', 'INFO').toUpperCase()}
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

          {/* Text-Inhalt mit ScrollView bei geringem Zwischenraum */}
          <ScrollView 
            style={styles.scrollArea}
            contentContainerStyle={styles.body}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            <Text style={styles.messageText}>{message}</Text>
          </ScrollView>

          {/* Schließen / Bestätigen Button */}
          <Pressable 
            onPress={onClose}
            style={({ pressed }) => [styles.confirmButton, pressed && styles.btnPressed]}
          >
            <Text style={styles.confirmButtonText}>
              {t('common.understood', 'Verstanden')}
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
    position: 'absolute',
    left: 0,
    right: 0,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 22,
  },
  modalCard: {
    position: 'relative',
    width: Math.min(width * 0.88, 380),
    maxHeight: '100%',
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
    flexShrink: 0,
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
  scrollArea: {
    maxHeight: 190,
    marginBottom: 16,
  },
  body: {
    paddingVertical: 2,
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
    flexShrink: 0,
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