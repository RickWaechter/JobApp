import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import React, { memo, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  LayoutAnimation,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import WebView from 'react-native-webview';

const ICONS = {
  newCv: 'https://img.icons8.com/?size=100&id=IoyS7mvkv16Q&format=png&color=000000',
  preview: 'https://img.icons8.com/?size=100&id=qsNHsXUgyhhh&format=png&color=000000',
  pdf: 'https://img.icons8.com/?size=100&id=WqrGC2CwYB9K&format=png&color=000000',
  scan: 'https://img.icons8.com/?size=100&id=zceGtdSd7VGT&format=png&color=000000',
  saved: 'https://img.icons8.com/?size=100&id=rHyB4w7zHzl2&format=png&color=000000',
};

/* ── Floating Action Menu (BlurView + gespeicherte Stände) ── */
export const CoverFabMenu = memo(
  ({
    isOpen,
    fabAnim,
    isDark,
    theme,
    isScanningCv,
    savedCvKeys,
    currentPersonName,
    onToggle,
    onCreateNew,
    onSaveEncryptedCv,
    onOpenPreview,
    onSharePdf,
    onStartScan,
    onSelectSavedCv,
    onDeleteSavedCv,
    onSaveSnapshot,
  }) => {
    const [showSavedList, setShowSavedList] = useState(false);
    const [saveTitle, setSaveTitle] = useState('');

    const closeAll = () => {
      setShowSavedList(false);
      onToggle();
    };

    const toggleSavedList = () => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setShowSavedList((prev) => !prev);
    };

    const handleSaveClick = async () => {
      const ok = await onSaveSnapshot(saveTitle);
      if (ok) {
        setSaveTitle('');
        setShowSavedList(false);
        if (isOpen) onToggle();
      }
    };

    return (
      <>
        {isOpen && <Pressable style={styles.outsideDismissOverlay} onPress={closeAll} />}

        <Animated.View
          pointerEvents={isOpen ? 'auto' : 'none'}
          style={[
            styles.menuAnimatedWrapper,
            {
              opacity: fabAnim,
              transform: [
                {
                  translateX: fabAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [95, 0],
                  }),
                },
                {
                  translateY: fabAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [130, 0],
                  }),
                },
                { scale: fabAnim },
              ],
            },
          ]}
        >
          <BlurView
            intensity={65}
            tint={isDark ? 'dark' : 'light'}
            experimentalBlurMethod="dimezisBlurView"
            style={[
              styles.menuBlurBox,
              {
                borderColor: theme.border,
                backgroundColor: isDark
                  ? 'rgba(24, 24, 27, 0.62)'
                  : 'rgba(255, 255, 255, 0.72)',
              },
            ]}
          >
            <View style={styles.menuColumnContainer}>
              <MenuRow
                icon={ICONS.newCv}
                label="Neuer Lebenslauf"
                theme={theme}
                hasBottomBorder
                onPress={() => {
                  closeAll();
                  onCreateNew();
                }}
              />

              <MenuRow
                icon={ICONS.newCv}
                label="Als Lebenslauf speichern"
                theme={theme}
                hasBottomBorder
                onPress={() => {
                  closeAll();
                  onSaveEncryptedCv();
                }}
              />

              <MenuRow
                icon={ICONS.preview}
                label="Vorschau"
                theme={theme}
                onPress={() => {
                  closeAll();
                  onOpenPreview();
                }}
              />

              <MenuRow
                icon={ICONS.pdf}
                label="Als PDF speichern"
                theme={theme}
                onPress={onSharePdf}
              />

              <TouchableOpacity
                style={[styles.menuRow, { opacity: isScanningCv ? 0.75 : 1 }]}
                disabled={isScanningCv}
                activeOpacity={0.75}
                onPress={() => {
                  closeAll();
                  onStartScan();
                }}
              >
                <View style={styles.menuRowIconBox}>
                  {isScanningCv ? (
                    <ActivityIndicator
                      size="small"
                      color={isDark ? '#60a5fa' : theme.primary}
                    />
                  ) : (
                    <Image style={styles.menuRowIcon} source={ICONS.scan} contentFit="contain" />
                  )}
                </View>
                <Text style={[styles.menuRowText, { color: theme.text }]}>
                  {isScanningCv ? 'Lebenslauf wird gescannt…' : 'Lebenslauf scannen'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuRow}
                activeOpacity={0.75}
                onPress={toggleSavedList}
              >
                <View style={styles.menuRowIconBox}>
                  <Image style={styles.menuRowIcon} source={ICONS.saved} contentFit="contain" />
                </View>
                <Text
                  style={[
                    styles.menuRowText,
                    { color: showSavedList ? theme.primary : theme.text },
                  ]}
                >
                  Gespeicherte Stände
                </Text>
                <Text style={{ color: theme.subtext, fontSize: 12, fontWeight: '700' }}>
                  {showSavedList ? '▲' : '▼'}
                </Text>
              </TouchableOpacity>

              {showSavedList && (
                <View
                  style={[
                    styles.savedCvAccordion,
                    {
                      backgroundColor: isDark
                        ? 'rgba(24, 24, 27, 0.85)'
                        : 'rgba(249, 250, 251, 0.9)',
                      borderColor: theme.border,
                    },
                  ]}
                >
                  {savedCvKeys.length > 0 ? (
                    savedCvKeys.map((key) => {
                      const isCurrent = currentPersonName === key;
                      return (
                        <View key={key} style={styles.cvListItemRow}>
                          <TouchableOpacity
                            style={[
                              styles.cvListItemBtn,
                              { backgroundColor: theme.inputBg },
                              isCurrent && { borderColor: theme.primary, borderWidth: 1 },
                            ]}
                            onPress={() => {
                              onSelectSavedCv(key);
                              closeAll();
                            }}
                            activeOpacity={0.7}
                          >
                            <Text
                              style={[
                                styles.cvListItemText,
                                { color: theme.text },
                                isCurrent && styles.cvListItemTextBold,
                              ]}
                              numberOfLines={1}
                            >
                              📄 {key}
                            </Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={styles.cvItemDeleteBtn}
                            onPress={() => onDeleteSavedCv(key)}
                            activeOpacity={0.7}
                          >
                            <Text style={styles.cvItemDeleteBtnText}>✕</Text>
                          </TouchableOpacity>
                        </View>
                      );
                    })
                  ) : (
                    <Text style={[styles.cvListEmptyText, { color: theme.subtext }]}>
                      Keine Stände vorhanden
                    </Text>
                  )}

                  <TextInput
                    value={saveTitle}
                    onChangeText={setSaveTitle}
                    placeholder="Name (z.B. Go Backend)"
                    placeholderTextColor={theme.subtext}
                    style={[
                      styles.flyoutInput,
                      {
                        backgroundColor: theme.inputBg,
                        color: theme.text,
                        borderColor: theme.border,
                      },
                    ]}
                  />

                  <TouchableOpacity
                    style={[styles.cvSaveCurrentBtn, { backgroundColor: theme.primary }]}
                    onPress={handleSaveClick}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.cvSaveCurrentBtnIcon}>💾</Text>
                    <Text style={styles.cvSaveCurrentBtnText}>Stand speichern</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </BlurView>
        </Animated.View>

        <View style={styles.fabTriggerContainer} pointerEvents="box-none">
          <TouchableOpacity
            style={[styles.floatingPreviewBtn, { backgroundColor: theme.primary }]}
            onPress={closeAll}
            activeOpacity={0.8}
          >
            <Animated.Text
              style={[
                styles.mainFabIcon,
                {
                  transform: [
                    {
                      rotate: fabAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0deg', '90deg'],
                      }),
                    },
                  ],
                },
              ]}
            >
              {isOpen ? '✕' : '☰'}
            </Animated.Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }
);

const MenuRow = ({ icon, label, theme, hasBottomBorder = false, onPress }) => (
  <TouchableOpacity
    style={[
      styles.menuRow,
      hasBottomBorder && { borderBottomWidth: 1, borderColor: theme.border },
    ]}
    activeOpacity={0.75}
    onPress={onPress}
  >
    <View style={styles.menuRowIconBox}>
      <Image style={styles.menuRowIcon} source={icon} contentFit="contain" />
    </View>
    <Text style={[styles.menuRowText, { color: theme.text }]}>{label}</Text>
  </TouchableOpacity>
);

/* ── Vollbild-WebView-Vorschau Overlay ───────────────────── */
export const CvPreviewOverlay = memo(
  ({
    visible,
    htmlLayout,
    isDark,
    theme,
    isTwoPage,
    setIsTwoPage,
    isExporting,
    onSharePdf,
    onClose,
  }) => {
    if (!visible) return null;

    return (
      <View style={styles.overlayBackdrop}>
        <View style={styles.webviewCard}>
          <WebView
            originWhitelist={['*']}
            source={{ html: htmlLayout }}
            style={styles.webview}
            scalesPageToFit={false}
            opaque={false}
          />

          <View style={styles.webviewFooterWrapper} pointerEvents="box-none">
            <View
              style={[
                styles.webviewFooterBar,
                {
                  backgroundColor: isDark ? '#1F1A16' : '#ffffff',
                  borderColor: isDark ? 'rgba(255, 220, 190, 0.16)' : '#e5e7eb',
                },
              ]}
            >
              <TouchableOpacity
                onPress={onClose}
                style={[
                  styles.footerCloseBtn,
                  {
                    backgroundColor: isDark ? 'rgba(255, 240, 225, 0.08)' : '#f3f4f6',
                    borderColor: isDark ? 'rgba(255, 220, 190, 0.12)' : '#e5e7eb',
                  },
                ]}
                activeOpacity={0.7}
              >
                <Text style={[styles.footerCloseBtnText, { color: theme.text }]}>✕</Text>
              </TouchableOpacity>

              <View
                style={[
                  styles.footerToggleContainer,
                  {
                    backgroundColor: isDark ? 'rgba(0, 0, 0, 0.45)' : '#f3f4f6',
                    borderColor: isDark ? 'rgba(255, 220, 190, 0.08)' : '#e5e7eb',
                  },
                ]}
              >
                {[
                  { label: '1-Pager', value: false },
                  { label: 'Multi-Pager', value: true },
                ].map((opt) => {
                  const active = isTwoPage === opt.value;
                  return (
                    <TouchableOpacity
                      key={opt.label}
                      style={[
                        styles.footerToggleBtn,
                        active && [styles.footerToggleBtnActive, { backgroundColor: theme.primary }],
                      ]}
                      onPress={() => setIsTwoPage(opt.value)}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.footerToggleText,
                          { color: active ? '#ffffff' : theme.subtext },
                          active && styles.footerToggleTextActive,
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TouchableOpacity
                onPress={onSharePdf}
                style={[styles.footerShareBtn, { backgroundColor: theme.primary }]}
                disabled={isExporting}
                activeOpacity={0.8}
              >
                {isExporting ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Text style={styles.footerShareBtnIcon}>📥</Text>
                    <Text style={styles.footerShareBtnText}>PDF</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  outsideDismissOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
    zIndex: 890,
  },
  menuAnimatedWrapper: {
    position: 'absolute',
    right: 20,
    bottom: 158,
    width: 270,
    zIndex: 920,
    elevation: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
  },
  menuBlurBox: {
    borderRadius: 22,
    borderWidth: 1,
    overflow: 'hidden',
  },
  menuColumnContainer: {
    flexDirection: 'column',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 18,
    gap: 12,
  },
  menuRowIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuRowIcon: {
    width: 32,
    height: 32,
  },
  menuRowText: {
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
  },
  savedCvAccordion: {
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
  },
  fabTriggerContainer: {
    position: 'absolute',
    right: 20,
    bottom: 85,
    zIndex: 950,
    elevation: 20,
  },
  floatingPreviewBtn: {
    width: 60,
    height: 60,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 10,
  },
  mainFabIcon: {
    fontSize: 24,
    color: '#ffffff',
    fontWeight: '700',
  },
  cvListItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 3,
    gap: 6,
  },
  cvListItemBtn: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    justifyContent: 'center',
  },
  cvItemDeleteBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cvItemDeleteBtnText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: 'bold',
  },
  flyoutInput: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    fontSize: 13,
    marginTop: 8,
  },
  cvListItemText: {
    fontSize: 15,
    fontWeight: '500',
  },
  cvListItemTextBold: {
    fontWeight: '700',
  },
  cvListEmptyText: {
    fontSize: 14,
    paddingVertical: 12,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  cvSaveCurrentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  cvSaveCurrentBtnIcon: {
    fontSize: 16,
  },
  cvSaveCurrentBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  overlayBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(18, 13, 10, 0.88)',
    zIndex: 9999,
    elevation: 20,
    paddingTop: Platform.OS === 'ios' ? 44 : 16,
  },
  webviewCard: {
    flex: 1,
    backgroundColor: 'transparent',
    position: 'relative',
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  webviewFooterWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 30 : 16,
    paddingTop: 8,
  },
  webviewFooterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 24,
    borderWidth: 1.2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.38,
    shadowRadius: 14,
    elevation: 16,
    gap: 8,
  },
  footerCloseBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerCloseBtnText: {
    fontSize: 16,
    fontWeight: '700',
  },
  footerToggleContainer: {
    flex: 1,
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: 1,
    padding: 3,
  },
  footerToggleBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerToggleBtnActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 2,
  },
  footerToggleText: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  footerToggleTextActive: {
    fontWeight: '700',
  },
  footerShareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 42,
    paddingHorizontal: 14,
    borderRadius: 21,
    gap: 5,
    minWidth: 84,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 4,
  },
  footerShareBtnIcon: {
    fontSize: 15,
  },
  footerShareBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
});