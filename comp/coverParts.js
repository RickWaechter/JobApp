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
import { useTheme } from './themeContext';
import { useThemedStyles } from './themeStyles';

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
    const { colors } = useTheme();
    const styles = useThemedStyles(createStyles);
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
            tint="dark"
            experimentalBlurMethod="dimezisBlurView"
            style={styles.menuBlurBox}
          >
            <View style={styles.menuColumnContainer}>
              <MenuRow
                icon={ICONS.newCv}
                label="Neuer Lebenslauf"
                hasBottomBorder
                onPress={() => {
                  closeAll();
                  onCreateNew();
                }}
              />

              <MenuRow
                icon={ICONS.newCv}
                label="Als Lebenslauf speichern"
                hasBottomBorder
                onPress={() => {
                  closeAll();
                  onSaveEncryptedCv();
                }}
              />

              <MenuRow
                icon={ICONS.preview}
                label="Vorschau"
                onPress={() => {
                  closeAll();
                  onOpenPreview();
                }}
              />

              <MenuRow
                icon={ICONS.pdf}
                label="Als PDF speichern"
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
                    <ActivityIndicator size="small" color={colors.accentText} />
                  ) : (
                    <Image
                      style={styles.menuRowIcon}
                      source={ICONS.scan}
                      tintColor={colors.iconLeading}
                      contentFit="contain"
                    />
                  )}
                </View>
                <Text style={styles.menuRowText}>
                  {isScanningCv ? 'Lebenslauf wird gescannt…' : 'Lebenslauf scannen'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuRow}
                activeOpacity={0.75}
                onPress={toggleSavedList}
              >
                <View style={styles.menuRowIconBox}>
                  <Image
                    style={styles.menuRowIcon}
                    source={ICONS.saved}
                    tintColor={colors.iconLeading}
                    contentFit="contain"
                  />
                </View>
                <Text
                  style={[
                    styles.menuRowText,
                    showSavedList && styles.menuRowTextActive,
                  ]}
                >
                  Gespeicherte Stände
                </Text>
                <Text style={styles.accordionChevron}>
                  {showSavedList ? '▲' : '▼'}
                </Text>
              </TouchableOpacity>

              {showSavedList && (
                <View style={styles.savedCvAccordion}>
                  {savedCvKeys.length > 0 ? (
                    savedCvKeys.map((key) => {
                      const isCurrent = currentPersonName === key;
                      return (
                        <View key={key} style={styles.cvListItemRow}>
                          <TouchableOpacity
                            style={[
                              styles.cvListItemBtn,
                              isCurrent && styles.cvListItemBtnActive,
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
                    <Text style={styles.cvListEmptyText}>
                      Keine Stände vorhanden
                    </Text>
                  )}

                  <TextInput
                    value={saveTitle}
                    onChangeText={setSaveTitle}
                    placeholder="Name (z.B. Go Backend)"
                    placeholderTextColor={colors.textDim}
                    style={styles.flyoutInput}
                  />

                  <TouchableOpacity
                    style={styles.cvSaveCurrentBtn}
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
            style={styles.floatingPreviewBtn}
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

const MenuRow = ({ icon, label, hasBottomBorder = false, onPress }) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <TouchableOpacity
      style={[styles.menuRow, hasBottomBorder && styles.menuRowBorder]}
      activeOpacity={0.75}
      onPress={onPress}
    >
      <View style={styles.menuRowIconBox}>
        <Image
          style={styles.menuRowIcon}
          source={icon}
          tintColor={colors.iconLeading}
          contentFit="contain"
        />
      </View>
      <Text style={styles.menuRowText}>{label}</Text>
    </TouchableOpacity>
  );
};

/* ── Vollbild-WebView-Vorschau Overlay ───────────────────── */
export const CvPreviewOverlay = memo(
  ({
    visible,
    htmlLayout,
    isTwoPage,
    setIsTwoPage,
    isExporting,
    onSharePdf,
    onClose,
  }) => {
    const { colors } = useTheme();
    const styles = useThemedStyles(createStyles);

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
            <View style={styles.webviewFooterBar}>
              <TouchableOpacity
                onPress={onClose}
                style={styles.footerCloseBtn}
                activeOpacity={0.7}
              >
                <Text style={styles.footerCloseBtnText}>✕</Text>
              </TouchableOpacity>

              <View style={styles.footerToggleContainer}>
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
                        active && styles.footerToggleBtnActive,
                      ]}
                      onPress={() => setIsTwoPage(opt.value)}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.footerToggleText,
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
                style={styles.footerShareBtn}
                disabled={isExporting}
                activeOpacity={0.8}
              >
                {isExporting ? (
                  <ActivityIndicator size="small" color={colors.textOnPrimary} />
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

const createStyles = (colors) => ({
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
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
  },
  menuBlurBox: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.actionCardBorder,
    backgroundColor: colors.menuBlurBg,
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
  menuRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.divider,
  },
  menuRowIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.iconContainer,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuRowIcon: {
    width: 24,
    height: 24,
  },
  menuRowText: {
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
    color: colors.titleMain,
  },
  menuRowTextActive: {
    color: colors.accentText,
  },
  accordionChevron: {
    color: colors.subTitleMain,
    fontSize: 12,
    fontWeight: '700',
  },
  savedCvAccordion: {
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.actionCardBorder,
    backgroundColor: colors.accordionBg,
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
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 10,
  },
  mainFabIcon: {
    fontSize: 24,
    color: colors.textOnPrimary,
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
    backgroundColor: colors.inputBg,
    justifyContent: 'center',
  },
  cvListItemBtnActive: {
    borderColor: colors.primary,
    borderWidth: 1,
  },
  cvItemDeleteBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.errorBg,
    borderWidth: 1,
    borderColor: colors.errorBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cvItemDeleteBtnText: {
    color: colors.iconClear,
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
    backgroundColor: colors.inputBg,
    color: colors.titleMain,
    borderColor: colors.inputBorder,
  },
  cvListItemText: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.titleMain,
  },
  cvListItemTextBold: {
    fontWeight: '700',
  },
  cvListEmptyText: {
    fontSize: 14,
    paddingVertical: 12,
    textAlign: 'center',
    fontStyle: 'italic',
    color: colors.subTitleMain,
  },
  cvSaveCurrentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    backgroundColor: colors.primary,
  },
  cvSaveCurrentBtnIcon: {
    fontSize: 16,
  },
  cvSaveCurrentBtnText: {
    color: colors.textOnPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  overlayBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlayBackdrop,
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
    backgroundColor: colors.previewBarBg,
    borderColor: colors.actionCardBorder,
    shadowColor: colors.shadow,
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
    backgroundColor: colors.previewCloseBg,
    borderColor: colors.actionCardBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerCloseBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.titleMain,
  },
  footerToggleContainer: {
    flex: 1,
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.actionCardBorder,
    backgroundColor: colors.previewToggleBg,
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
    backgroundColor: colors.primary,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 2,
  },
  footerToggleText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: colors.subTitleMain,
  },
  footerToggleTextActive: {
    fontWeight: '700',
    color: colors.textOnPrimary,
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
    backgroundColor: colors.primary,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 4,
  },
  footerShareBtnIcon: {
    fontSize: 15,
  },
  footerShareBtnText: {
    color: colors.textOnPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
});