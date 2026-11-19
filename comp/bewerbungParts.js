import MaterialIcons from '@react-native-vector-icons/material-icons';
import React, { memo, useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';
import EncryptedStorage from 'react-native-encrypted-storage';
import { WebView } from 'react-native-webview';
import colors from '../inc/colors.js';
import { itemsLang } from '../inc/language.js';

const { height } = Dimensions.get('window');

export const WARM = {
  bg: colors.background || '#171412',
  backdrop: 'rgba(18, 13, 10, 0.85)',
  surface: 'rgba(255, 240, 225, 0.05)',
  surfaceBorder: 'rgba(255, 220, 190, 0.14)',
  surfaceBorderSubtle: 'rgba(255, 220, 190, 0.07)',
  primary: '#E06D28',
  accentBadgeBg: 'rgba(245, 158, 11, 0.15)',
  accentBadgeBorder: 'rgba(245, 158, 11, 0.3)',
  iconLeading: '#F59E0B',
  iconPin: '#FB923C',
  iconArrow: '#FBBF24',
  iconClose: '#FFF7ED',
  textMain: '#FFF9F2',
  textMuted: 'rgba(255, 240, 225, 0.65)',
  textDim: 'rgba(255, 235, 220, 0.38)',
  error: '#F87171',
  errorBg: 'rgba(248, 113, 113, 0.08)',
  errorBorder: 'rgba(248, 113, 113, 0.45)',
  success: '#10B981',
  successBg: 'rgba(16, 185, 129, 0.12)',
  successBorder: 'rgba(16, 185, 129, 0.35)',
};

export const CardHeader = memo(({ icon, title, rightElement, onInfo }) => (
  <View style={styles.cardHeaderRow}>
    <TouchableOpacity
      style={styles.headerLeft}
      onPress={onInfo}
      disabled={!onInfo}
      activeOpacity={0.7}
      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
    >
      <View style={styles.iconBadge}>
        <MaterialIcons name={icon} size={18} color={WARM.iconLeading} />
      </View>
      <Text style={styles.fieldLabel}>{title}</Text>
    </TouchableOpacity>
    {rightElement}
  </View>
));

export const FieldLabelWithIcon = memo(({ icon, label, onPress }) => (
  <TouchableOpacity
    style={styles.labelRowWithIcon}
    onPress={onPress}
    disabled={!onPress}
    activeOpacity={0.7}
    hitSlop={{ top: 8, bottom: 8, left: 6, right: 8 }}
  >
    <MaterialIcons name={icon} size={15} color={WARM.iconLeading} />
    <Text style={styles.subFieldLabelText}>{label}</Text>
  </TouchableOpacity>
));

export const SegmentedPills = memo(({ options, selected, onSelect, labels }) => (
  <View style={styles.pillContainer}>
    {options.map((opt) => {
      const isSelected = selected === opt;
      return (
        <TouchableOpacity
          key={opt}
          activeOpacity={0.75}
          onPress={() => onSelect(opt)}
          style={[styles.pillButton, isSelected && styles.pillButtonActive]}
        >
          <Text style={[styles.pillText, isSelected && styles.pillTextActive]} numberOfLines={1}>
            {labels?.[opt] || opt}
          </Text>
        </TouchableOpacity>
      );
    })}
  </View>
));

export const SuggestionDropdown = memo(
  ({
    data,
    onSelect,
    onToggleSelect,
    selectedItems = [],
    isSkill = false,
    theMaxHeight = height * 0.16,
  }) => (
    <View style={[styles.suggestionsCard, { maxHeight: theMaxHeight }]}>
      <FlatList
        data={data}
        keyExtractor={(item, index) =>
          item?.rowid ? String(item.rowid) : item?.id ? String(item.id) : String(index)
        }
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const roleText =
            typeof item === 'string'
              ? item
              : isSkill
              ? item?.role ?? item?.text ?? item?.name ?? ''
              : item?.text ?? item?.role ?? item?.name ?? item?.id ?? '';

          const companyText = typeof item === 'object' && item?.company ? item.company : '';
          const itemKey = item?.rowid ?? item?.id ?? roleText;
          const isSelected = selectedItems.some((s) => {
            const sKey = s?.rowid ?? s?.id ?? (typeof s === 'string' ? s : s?.role ?? s?.text);
            return sKey === itemKey;
          });

          return (
            <View style={styles.suggestionRow}>
              <TouchableOpacity
                style={styles.suggestionTextArea}
                onPress={() => (isSkill && onToggleSelect ? onToggleSelect(item) : onSelect(item))}
                activeOpacity={0.7}
              >
                <View style={styles.resultIconWrapper}>
                  <MaterialIcons
                    name={isSkill ? 'psychology' : 'work-outline'}
                    size={16}
                    color={WARM.iconPin}
                  />
                </View>

                <View style={styles.suggestionTextWrap}>
                  <Text
                    style={[
                      styles.suggestionText,
                      isSkill && isSelected && styles.suggestionTextSelected,
                    ]}
                    numberOfLines={1}
                  >
                    {String(roleText)}
                  </Text>
                  {isSkill && Boolean(companyText) && (
                    <View style={styles.companyRow}>
                      <MaterialIcons
                        name="business"
                        size={12}
                        color={WARM.textDim}
                        style={{ marginRight: 4 }}
                      />
                      <Text style={styles.suggestionTextSub} numberOfLines={1}>
                        {String(companyText)}
                      </Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>

              {isSkill && onToggleSelect ? (
                <TouchableOpacity
                  style={styles.selectSuggestionBtn}
                  onPress={() => onToggleSelect(item)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <MaterialIcons
                    name={isSelected ? 'check-box' : 'check-box-outline-blank'}
                    size={20}
                    color={isSelected ? WARM.primary : WARM.textDim}
                  />
                </TouchableOpacity>
              ) : null}
            </View>
          );
        }}
      />
    </View>
  )
);

/* ── Optionen-Screen (Slide-In Panel) ────────────────────── */
export const OptionsPanel = memo(
  ({
    t,
    openInfo,
    onClose,
    onBack,
    onGenerate,
    loading,
    employmentOptions,
    selectedOption,
    setSelectedOption,
    applicationOptions,
    selectedOption2,
    setSelectedOption2,
    qualityKeys,
    qualityLabels,
    selectedQuality,
    setSelectedQuality,
    fontOptions,
    fontValue,
    setFontValue,
    downloadingFonts,
    downloadedFonts,
    onDownloadFont,
    languageValue,
    onLanguageChange,
  }) => {
    const [fontPickerOpen, setFontPickerOpen] = useState(false);
    const [languagePickerOpen, setLanguagePickerOpen] = useState(false);

    const handleClose = () => {
      setFontPickerOpen(false);
      setLanguagePickerOpen(false);
      onClose();
    };

    const handleBack = () => {
      setFontPickerOpen(false);
      setLanguagePickerOpen(false);
      onBack();
    };

    const renderFontItem = useCallback(
      ({ item }) => {
        const fontName = item.fontName || item.value;
        const isDownloading = Boolean(downloadingFonts[fontName]);
        const isDownloaded = Boolean(downloadedFonts[item.value]);
        const isSelected = fontValue === item.value;

        const handleSelect = async () => {
          setFontValue(item.value);
          setFontPickerOpen(false);
          await EncryptedStorage.setItem('font', item.value);
        };

        return (
          <View style={[styles.fontItemContainer, isSelected && styles.fontItemSelected]}>
            <TouchableOpacity style={styles.fontSelectArea} onPress={handleSelect} activeOpacity={0.7}>
              <Text
                style={[styles.fontLabelText, isSelected && styles.fontLabelTextSelected]}
                numberOfLines={1}
              >
                {item.label}
              </Text>
              {isSelected && (
                <MaterialIcons name="check" size={16} color={WARM.primary} style={{ marginLeft: 6 }} />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.fontDownloadActionBtn,
                isDownloaded && styles.fontDownloadActionBtnDownloaded,
              ]}
              onPress={() => onDownloadFont(item)}
              disabled={isDownloading}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              activeOpacity={0.7}
            >
              {isDownloading ? (
                <ActivityIndicator size="small" color={WARM.primary} />
              ) : isDownloaded ? (
                <MaterialIcons name="cloud-done" size={18} color={WARM.success} />
              ) : (
                <MaterialIcons name="cloud-download" size={18} color={WARM.iconArrow} />
              )}
            </TouchableOpacity>
          </View>
        );
      },
      [downloadingFonts, downloadedFonts, fontValue, onDownloadFont, setFontValue]
    );

    return (
      <View style={styles.accordionPanel}>
        <View style={styles.optionsHeader}>
          <TouchableOpacity
            style={styles.headerLeft}
            onPress={() => openInfo(t('info.options'))}
            activeOpacity={0.7}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <View style={styles.iconBadge}>
              <MaterialIcons name="tune" size={18} color={WARM.iconLeading} />
            </View>
            <Text style={styles.fieldLabel}>{t('bewerbung.options').toUpperCase()}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.closeButton}
            onPress={handleClose}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MaterialIcons name="close" size={18} color={WARM.iconClose} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.optionsScrollArea}
          contentContainerStyle={styles.optionsScrollContent}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled={true}
          bounces={false}
        >
          <FieldLabelWithIcon
            icon="schedule"
            label={t('bewerbung.labelEmployment')}
            onPress={() => openInfo(t('info.employment'))}
          />
          <SegmentedPills
            options={employmentOptions}
            selected={selectedOption}
            onSelect={(opt) => setSelectedOption((p) => (p === opt ? '' : opt))}
          />

          <View style={{ marginTop: 12 }}>
            <FieldLabelWithIcon
              icon="category"
              label={t('bewerbung.labelAppType')}
              onPress={() => openInfo(t('info.appType'))}
            />
            <SegmentedPills
              options={applicationOptions}
              selected={selectedOption2}
              onSelect={(opt) => setSelectedOption2((p) => (p === opt ? '' : opt))}
            />
          </View>

          <View style={{ marginTop: 12 }}>
            <FieldLabelWithIcon
              icon="speed"
              label={t('bewerbung.labelQuality').toUpperCase()}
              onPress={() => openInfo(t('info.quality'))}
            />
            <SegmentedPills
              options={qualityKeys}
              selected={selectedQuality}
              onSelect={setSelectedQuality}
              labels={qualityLabels}
            />
          </View>

          <View style={{ marginTop: 12 }}>
            <FieldLabelWithIcon
              icon="font-download"
              label={t('bewerbung.labelFont')}
              onPress={() => openInfo(t('info.font'))}
            />
            <View style={{ zIndex: 3000, marginTop: 4, marginBottom: 8 }}>
              <DropDownPicker
                open={fontPickerOpen}
                value={fontValue}
                items={fontOptions}
                setOpen={setFontPickerOpen}
                onOpen={() => setLanguagePickerOpen(false)}
                placeholder={t('bewerbung.placeholderFont')}
                style={styles.dropdown}
                dropDownContainerStyle={styles.dropdownList}
                textStyle={styles.dropdownText}
                arrowIconStyle={{ tintColor: WARM.iconArrow }}
                dropDownDirection="TOP"
                listMode="SCROLLVIEW"
                renderListItem={renderFontItem}
              />
            </View>
          </View>

          <View style={{ marginTop: 4 }}>
            <FieldLabelWithIcon
              icon="translate"
              label={t('bewerbung.labelLanguage')}
              onPress={() => openInfo(t('info.languageOption'))}
            />
            <View style={{ zIndex: 4000, marginTop: 4, marginBottom: 12 }}>
              <DropDownPicker
                open={languagePickerOpen}
                value={languageValue}
                items={itemsLang}
                setOpen={setLanguagePickerOpen}
                setValue={onLanguageChange}
                onOpen={() => setFontPickerOpen(false)}
                placeholder={itemsLang[0]?.label}
                style={styles.dropdown}
                dropDownContainerStyle={styles.dropdownList}
                textStyle={styles.dropdownText}
                arrowIconStyle={{ tintColor: WARM.iconArrow }}
                dropDownDirection="TOP"
                listMode="SCROLLVIEW"
              />
            </View>
          </View>
        </ScrollView>

        <View style={styles.bottomActionRow}>
          <TouchableOpacity style={styles.settingsButton} onPress={handleBack} activeOpacity={0.8}>
            <MaterialIcons name="arrow-back" size={18} color={WARM.iconLeading} />
            <Text style={styles.settingsButtonText} numberOfLines={1}>
              {t('bewerbung.btnBack')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.generateButton}
            onPress={() => {
              setFontPickerOpen(false);
              setLanguagePickerOpen(false);
              onGenerate();
            }}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text style={[styles.generateBtnText, { marginLeft: 8, fontSize: 13 }]} numberOfLines={1}>
                  {` ${t('pleaseWait')}`}
                </Text>
              </View>
            ) : (
              <View style={styles.loadingRow}>
                <MaterialIcons name="auto-awesome" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.generateBtnText}>{t('bewerbung.btnStart')}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  }
);

/* ── WebView Extraktions-Overlay ─────────────────────────── */
export const ExtractionOverlay = memo(
  ({ t, webViewUrl, webViewRef, injectScript, onMessage, onError, onCancel }) => (
    <View style={styles.extractingOverlay}>
      {Boolean(webViewUrl) && (
        <WebView
          ref={webViewRef}
          source={{ uri: webViewUrl }}
          style={styles.hiddenWebView}
          onLoadEnd={injectScript}
          onMessage={onMessage}
          javaScriptEnabled
          onError={onError}
          userAgent="Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1"
        />
      )}

      <View style={styles.extractCard}>
        <View style={styles.radarCircle}>
          <ActivityIndicator size="large" color={WARM.iconLeading} />
        </View>
        <Text style={styles.extractTitle}>{t('bewerbung.extractingTitle')}</Text>
        <Text style={styles.extractSubtitle}>{t('bewerbung.extractingSubtitle')}</Text>

        <TouchableOpacity style={styles.cancelExtractBtn} onPress={onCancel}>
          <Text style={styles.cancelExtractText}>{t('bewerbung.btnCancel')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
);

const styles = StyleSheet.create({
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBadge: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fieldLabel: {
    color: WARM.textMain,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  labelRowWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  subFieldLabelText: {
    color: WARM.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  pillContainer: {
    flexDirection: 'row',
    backgroundColor: WARM.surface,
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: WARM.surfaceBorderSubtle,
    gap: 4,
  },
  pillButton: {
    flex: 1,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    paddingHorizontal: 4,
  },
  pillButtonActive: {
    backgroundColor: WARM.primary,
    shadowColor: WARM.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  pillText: {
    color: WARM.textMuted,
    fontSize: 12.5,
    fontWeight: '600',
  },
  pillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  suggestionsCard: {
    position: 'absolute',
    top: 46,
    left: 0,
    right: 0,
    backgroundColor: WARM.bg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: WARM.surfaceBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 12,
    zIndex: 9999,
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: WARM.surfaceBorderSubtle,
    paddingVertical: 4,
  },
  resultIconWrapper: {
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: 'rgba(251, 146, 60, 0.16)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  suggestionTextArea: {
    flex: 1,
    flexDirection: 'row',
    alignSelf: 'stretch',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  suggestionTextWrap: {
    flex: 1,
    justifyContent: 'center',
  },
  suggestionText: {
    color: WARM.textMain,
    fontSize: 13.5,
    fontWeight: '500',
  },
  companyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  suggestionTextSub: {
    color: WARM.textMuted,
    fontSize: 11,
    fontWeight: '400',
  },
  suggestionTextSelected: {
    color: WARM.iconArrow,
    fontWeight: '700',
  },
  selectSuggestionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  accordionPanel: {
    flex: 1,
    width: '100%',
    backgroundColor: WARM.bg,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: WARM.surfaceBorder,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  optionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 240, 225, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  optionsScrollArea: {
    flex: 1,
    width: '100%',
  },
  optionsScrollContent: {
    paddingBottom: 16,
    paddingTop: 4,
  },
  dropdown: {
    backgroundColor: WARM.surface,
    borderRadius: 14,
    borderColor: WARM.surfaceBorder,
    height: 48,
  },
  dropdownList: {
    backgroundColor: WARM.bg,
    borderColor: WARM.surfaceBorder,
    borderRadius: 14,
    maxHeight: 220,
  },
  dropdownText: {
    color: WARM.textMain,
    fontSize: 13.5,
    fontWeight: '500',
  },
  fontItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: WARM.surfaceBorderSubtle,
  },
  fontItemSelected: {
    backgroundColor: 'rgba(224, 109, 40, 0.08)',
  },
  fontSelectArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  fontLabelText: {
    color: WARM.textMain,
    fontSize: 13.5,
    fontWeight: '500',
  },
  fontLabelTextSelected: {
    color: WARM.primary,
    fontWeight: '700',
  },
  fontDownloadActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  fontDownloadActionBtnDownloaded: {
    backgroundColor: WARM.successBg,
    borderColor: WARM.successBorder,
  },
  bottomActionRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  settingsButton: {
    flex: 1,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: WARM.surfaceBorder,
    backgroundColor: WARM.surface,
    paddingHorizontal: 10,
  },
  settingsButtonText: {
    flexShrink: 1,
    color: WARM.textMuted,
    fontSize: 15.5,
    fontWeight: '700',
  },
  generateButton: {
    flex: 1,
    height: 52,
    flexDirection: 'row',
    backgroundColor: WARM.primary,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: WARM.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  generateBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  extractingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: WARM.backdrop,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    zIndex: 99999,
  },
  hiddenWebView: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
  extractCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: WARM.bg,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: WARM.surfaceBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.55,
    shadowRadius: 28,
    elevation: 16,
  },
  radarCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderWidth: 1,
    borderColor: WARM.accentBadgeBorder,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  extractTitle: {
    color: WARM.textMain,
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 6,
  },
  extractSubtitle: {
    color: WARM.textMuted,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  cancelExtractBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  cancelExtractText: {
    color: WARM.error,
    fontSize: 14,
    fontWeight: '600',
  },
});