import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { useGlobalWebView } from './jobWebView';

export const FloatingIndeedWebView = () => {
  const { url, mode, openMini, openFull, hide } = useGlobalWebView();
const jobUrl = "https://www.indeed.com"
    const DESKTOP_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

const HIDE_APP_BANNERS_JS = `
  (function() {
    // 1. Echten Klick simulieren (React/Indeed reagiert oft nicht auf ein nacktes .click())
    function triggerRealClick(el) {
      const target = el.closest('button, a, [role="button"]') || el;
      ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'].forEach((type) => {
        target.dispatchEvent(new MouseEvent(type, {
          view: window,
          bubbles: true,
          cancelable: true
        }));
      });
    }

    // 2. Durchsucht normales DOM UND geschachtelte Shadow-DOMs
    function findAndClickInRoot(root) {
      if (!root) return;
      const elements = root.querySelectorAll('*');
      for (const el of elements) {
        // Rekursiv in Shadow Roots abtauchen
        if (el.shadowRoot) {
          findAndClickInRoot(el.shadowRoot);
        }

        // Nur Blätter oder kompakte Text-Elemente prüfen
        if (el.children.length <= 2) {
          const text = (el.innerText || el.textContent || '').trim().toLowerCase();
          if (
            text.includes('im browser') ||
            text.includes('in browser') ||
            text.includes('ohne app') ||
            text === 'nein, danke' ||
            text === 'nicht jetzt' ||
            text === 'schließen'
          ) {
            triggerRealClick(el);
          }
        }
      }
    }

    // 3. Sofort und in den ersten Sekunden wiederholt ausführen
    findAndClickInRoot(document);
    let runs = 0;
    const interval = setInterval(() => {
      findAndClickInRoot(document);
      runs++;
      if (runs > 20) clearInterval(interval); // Stoppt nach 10 Sekunden
    }, 500);

    // 4. Bei nachträglichen DOM-Änderungen erneut prüfen
    const observer = new MutationObserver(() => findAndClickInRoot(document));
    if (document.body) {
      observer.observe(document.body, { childList: true, subtree: true });
    }
  })();
  true;
`;
  const isHidden = mode === 'hidden';
  const isMini = mode === 'mini';
  const isFull = mode === 'full';

  // Schaltet zwischen eingefahren (hidden) und ausgefahren (mini) um
  const toggleWebView = () => {
    if (isHidden) {
      openMini();
    } else {
      hide();
    }
  };

  return (
    <>
      {/* 1. Der schwebende WebView-Container */}
      <View
        pointerEvents={isHidden ? 'none' : 'auto'}
        style={[
          styles.container,
          isMini && styles.miniContainer,
          isFull && styles.fullContainer,
          isHidden && styles.hiddenContainer,
        ]}
      >
        {!isHidden && (
          <View style={styles.header}>
            <TouchableOpacity onPress={isMini ? () => openFull() : () => openMini()}>
              <Text style={styles.btnText}>{isMini ? 'Vollbild' : 'Mini'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={hide}>
              <Text style={styles.btnText}>Einfahren</Text>
            </TouchableOpacity>
          </View>
        )}

      <WebView
  source={{ uri: url }}
  // KEIN userAgent setzen! Echter nativer User-Agent verhindert die Cloudflare-Endlosschleife
  injectedJavaScript={HIDE_APP_BANNERS_JS}
  originWhitelist={['*']}
  onShouldStartLoadWithRequest={(request) => {
    const u = request.url;
    if (
      u.startsWith('http://') ||
      u.startsWith('https://') ||
      u.startsWith('blob:') ||
      u === 'about:blank' ||
      u === 'about:srcdoc'
    ) {
      return true;
    }
    return false;
  }}
  incognito={false}
  sharedCookiesEnabled={true}
  thirdPartyCookiesEnabled={true}
  domStorageEnabled={true}
  javaScriptEnabled={true}
  style={{ flex: 1 }}
/>
      </View>

      {/* 2. Permanenter Toggle-Button unten links */}
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={toggleWebView}
        style={styles.bottomLeftToggle}
      >
        <Text style={styles.toggleText}>
          {isHidden ? 'Indeed öffnen' : 'Einfahren'}
        </Text>
      </TouchableOpacity>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    zIndex: 9998,
    backgroundColor: '#111',
    overflow: 'hidden',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  // Ausgefahren über dem Button unten links
  miniContainer: {
    bottom: 135,
    left: 16,
    width: 220,
    height: 280,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
  },
  fullContainer: {
    top: 50,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 0,
  },
  // Eingefahren: bleibt gemountet, aber unsichtbar und nicht klickbar
  hiddenContainer: {
    width: 0,
    height: 0,
    opacity: 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: '#1f1f1f',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  btnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  // Fester Floating-Button unten links
  bottomLeftToggle: {
    position: 'absolute',
    bottom: 85, // ggf. anpassen, falls eine Tab-Bar darunter liegt
    left: 16,
    zIndex: 9999,
    backgroundColor: '#2557a7',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  toggleText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
});