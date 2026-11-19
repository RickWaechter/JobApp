import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  StyleSheet,
  View,
  Text,
  Dimensions,
  TouchableOpacity,
  ActivityIndicator,
  BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcons from '@react-native-vector-icons/material-icons';
import { WebView } from 'react-native-webview';
import { getAgentEmail } from '../inc/scrapper';

const { width } = Dimensions.get('window');

const JobWebView = ({
  visible,
  refNr,
  onEmailFound,
  onCaptchaRequired,
  onClose,
}) => {
  const [pageLoading, setPageLoading] = useState(false);
  const [activeUrl, setActiveUrl] = useState('https://www.arbeitsagentur.de/jobsuche/');
  // Bleibt false, bis im DOM wirklich ein Captcha erkannt wird
  const [captchaVisible, setCaptchaVisible] = useState(false);

  const webViewRef = useRef(null);
  const isClosingRef = useRef(false);
  const currentRefNrRef = useRef(null);
  const slideAnim = useRef(new Animated.Value(width)).current;

  useEffect(() => {
    if (visible && refNr) {
      isClosingRef.current = false;
      currentRefNrRef.current = refNr;

      // Beim Laden eines Jobs immer versteckt starten
      setCaptchaVisible(false);
      slideAnim.setValue(width);

      const nextUrl = `https://www.arbeitsagentur.de/jobsuche/jobdetail/${refNr}`;
      if (activeUrl !== nextUrl) {
        setPageLoading(true);
        setActiveUrl(nextUrl);
      } else {
        setPageLoading(false);
        webViewRef.current?.injectJavaScript(`
          window.__baSent = false;
          window.__baCaptchaReported = false;
          window.__baScrolled = false;
          if (window.__baObserver && document.body) {
            window.__baObserver.observe(document.body, { childList: true, subtree: true });
          }
          if (window.__baCheckNow) window.__baCheckNow();
          true;
        `);
      }
    } else if (!visible) {
      setCaptchaVisible(false);
      Animated.timing(slideAnim, {
        toValue: width,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, refNr]);

  // Android Hardware-Zurück-Button nur abfangen, wenn das Captcha-Panel eingefahren ist
  useEffect(() => {
    if (!visible || !captchaVisible) return;
    const backSub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => backSub.remove();
  }, [visible, captchaVisible, onClose]);

  const showCaptchaOverlay = () => {
    setCaptchaVisible(true);
    onCaptchaRequired?.();
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const handleMessage = (event) => {
    if (isClosingRef.current || !visible) return;
    try {
      const payload = JSON.parse(event.nativeEvent.data);
      if (payload.type === 'EMAIL_FOUND' && payload.email) {
        isClosingRef.current = true;
        setCaptchaVisible(false);
        const targetRef = currentRefNrRef.current || refNr;
        onEmailFound(targetRef, payload.email);
        onClose();
      } else if (payload.type === 'CAPTCHA_REQUIRED') {
        // Erst jetzt, weil ein Captcha sichtbar ist, das Animated.View einfahren
        showCaptchaOverlay();
      }
    } catch (e) {
      // Fremde postMessages ignorieren
    }
  };

  return (
    <>
      {/* Dunkler Backdrop (nur sichtbar, wenn Captcha-Panel eingefahren ist) */}
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          {
            zIndex: 79,
            backgroundColor: '#000000',
            opacity: captchaVisible
              ? slideAnim.interpolate({
                  inputRange: [0, width],
                  outputRange: [0.1, 1],
                  extrapolate: 'clamp',
                })
              : 0,
          },
        ]}
      />

      {/* Dauerhaft gemountetes WebView-Panel: fährt NUR ein, wenn ein Captcha erkannt wurde */}
      <Animated.View
        pointerEvents={visible && captchaVisible ? 'auto' : 'none'}
        style={[
          webViewStyles.overlay,
          {
            transform: [{ translateX: slideAnim }],
          },
        ]}
      >
        <SafeAreaView style={webViewStyles.container}>
          <View style={webViewStyles.header}>
            <View style={webViewStyles.headerTextBox}>
              <Text style={webViewStyles.headerTitle}>Kontaktdaten freischalten</Text>
              <Text style={webViewStyles.headerSub}>
                Löse kurz die Sicherheitsabfrage – die E-Mail wird automatisch übernommen.
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={webViewStyles.closeBtn} hitSlop={8}>
              <MaterialIcons name="close" size={22} color="#f8fafc" />
            </TouchableOpacity>
          </View>

          <View style={webViewStyles.webviewWrapper}>
            {pageLoading && captchaVisible && (
              <View style={webViewStyles.loaderOverlay}>
                <ActivityIndicator size="large" color="#38bdf8" />
                <Text style={webViewStyles.loaderText}>Lade Kontaktbereich...</Text>
              </View>
            )}

            <WebView
              source={{ uri: activeUrl }}
              ref={webViewRef}
              userAgent="Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1"
              injectedJavaScript={getAgentEmail}
              onMessage={handleMessage}
              onLoadStart={() => setPageLoading(true)}
              onLoadEnd={() => setPageLoading(false)}
              incognito={false}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              sharedCookiesEnabled={true}
              thirdPartyCookiesEnabled={true}
            />
          </View>
        </SafeAreaView>
      </Animated.View>
    </>
  );
};

const webViewStyles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 80,
    backgroundColor: '#0f172a',
  },
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    gap: 12,
  },
  headerTextBox: {
    flex: 1,
  },
  headerTitle: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '700',
  },
  headerSub: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    backgroundColor: '#1e293b',
    padding: 8,
    borderRadius: 8,
  },
  webviewWrapper: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  loaderOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    gap: 10,
  },
  loaderText: {
    color: '#94a3b8',
    fontSize: 13,
  },
});

export default JobWebView;