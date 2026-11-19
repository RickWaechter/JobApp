import MaterialIcons from '@react-native-vector-icons/material-icons';
import React, { memo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Keyboard,
  LayoutAnimation,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Modal from 'react-native-modal';
import DocPicker from './documentPicker.js';
import { itemsLangFlag } from '../inc/language.js';

const { height } = Dimensions.get('window');
const MENU_ANIM_MS = 380;
const MENU_SURFACE = '#16181E';
const MENU_BORDER = 'rgba(255, 255, 255, 0.08)';

/* ── Eingabefeld für Modals ──────────────────────────────── */
export const ModalInput = memo(
  ({
    icon,
    placeholder,
    value,
    onChangeText,
    secureTextEntry = false,
    keyboardType = 'default',
    suffix = null,
    containerStyle,
  }) => (
    <View style={[styles.inputShell, containerStyle]}>
      <MaterialIcons
        name={icon}
        size={20}
        color="rgba(255,255,255,0.4)"
        style={styles.inputIcon}
      />

      <TextInput
        style={styles.textInputField}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="rgba(255,255,255,0.35)"
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCorrect={false}
        spellCheck={false}
        autoComplete="off"
        textContentType="none"
        importantForAutofill="no"
        autoCapitalize="none"
        smartInsertDelete={false}
      />

      {suffix ? (
        <>
          <View style={styles.inputSuffixDivider} />
          <View style={styles.inputSuffixSlot}>{suffix}</View>
        </>
      ) : null}

      {Boolean(value?.length) && (
        <TouchableOpacity
          onPress={() => onChangeText('')}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.clearBtn}
        >
          <MaterialIcons name="cancel" size={18} color="rgba(255,255,255,0.35)" />
        </TouchableOpacity>
      )}
    </View>
  )
);

/* ── Gemeinsamer Wrapper für die 3 rechten Slide-In-Modals ─ */
const SlideMenuModal = ({
  isVisible,
  menuBox,
  title,
  subtitle,
  onClose,
  onModalHide,
  children,
}) => (
  <Modal
    isVisible={isVisible}
    animationIn="slideInRight"
    animationOut="slideOutRight"
    animationInTiming={MENU_ANIM_MS}
    animationOutTiming={MENU_ANIM_MS}
    backdropTransitionInTiming={200}
    backdropTransitionOutTiming={MENU_ANIM_MS}
    backdropOpacity={0}
    hideModalContentWhileAnimating={true}
    useNativeDriver={true}
    useNativeDriverForBackdrop={true}
    statusBarTranslucent={true}
    onBackdropPress={onClose}
    onBackButtonPress={onClose}
    onModalHide={onModalHide}
    style={styles.modalBackdropExact}
  >
    <View
      style={[
        styles.modalSheetFrame,
        menuBox.h > 0 && { height: menuBox.h },
        { marginLeft: menuBox.x, marginTop: menuBox.y, width: menuBox.w },
      ]}
    >
      <View style={styles.modalHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.modalTitle}>{title}</Text>
          <Text style={styles.modalSubtitle}>{subtitle}</Text>
        </View>
        <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn}>
          <MaterialIcons name="close" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
      {children}
    </View>
  </Modal>
);

/* ── MODAL 1: Persönliche Daten ──────────────────────────── */
export const PersonalDataModal = ({
  isVisible,
  menuBox,
  t,
  myName,
  setMyName,
  myStreet,
  setMyStreet,
  myCity,
  setMyCity,
  onSave,
  onClose,
  onModalHide,
}) => (
  <SlideMenuModal
    isVisible={isVisible}
    menuBox={menuBox}
    title={t('personalData')}
    subtitle={t('profil.modalDataSubtitle')}
    onClose={onClose}
    onModalHide={onModalHide}
  >
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingVertical: 14, gap: 12 }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <ModalInput icon="person" placeholder={t('placeholderName')} value={myName} onChangeText={setMyName} />
      <ModalInput icon="home" placeholder={t('placeholderStreet')} value={myStreet} onChangeText={setMyStreet} />
      <ModalInput icon="location-city" placeholder={t('placeholderZip')} value={myCity} onChangeText={setMyCity} />
    </ScrollView>

    <TouchableOpacity style={[styles.primaryButton, { marginTop: 8 }]} onPress={onSave} activeOpacity={0.8}>
      <Text style={styles.primaryButtonText}>{t('saveAndClose')}</Text>
    </TouchableOpacity>
  </SlideMenuModal>
);

/* ── MODAL 2: E-Mail Konfiguration ───────────────────────── */
export const EmailConfigModal = ({
  isVisible,
  menuBox,
  t,
  email,
  setEmail,
  password,
  setPassword,
  emailServerValue,
  setEmailServerValue,
  isTesting,
  onSave,
  onClose,
  onModalHide,
}) => {
  const [openServerDropdown, setOpenServerDropdown] = useState(false);

  const handleClose = () => {
    setOpenServerDropdown(false);
    onClose();
  };

  return (
    <SlideMenuModal
      isVisible={isVisible}
      menuBox={menuBox}
      title={t('profil.modalEmailTitle')}
      subtitle={t('profil.modalEmailSubtitle')}
      onClose={handleClose}
      onModalHide={() => {
        setOpenServerDropdown(false);
        onModalHide();
      }}
    >
      <View style={{ flex: 1, overflow: 'visible', gap: 12, paddingVertical: 8 }}>
        <ModalInput
          icon="mail"
          placeholder={t('placeholderEmail')}
          value={email}
          onChangeText={setEmail}
          containerStyle={{
            zIndex: openServerDropdown ? 5000 : 10,
            elevation: openServerDropdown ? 10 : 0,
          }}
          suffix={
            <DocPicker
              open={openServerDropdown}
              setOpen={setOpenServerDropdown}
              value={emailServerValue}
              setValue={setEmailServerValue}
            />
          }
        />

        <ModalInput
          icon="lock"
          placeholder={t('placeholderPassword')}
          value={password}
          onChangeText={setPassword}
          secureTextEntry={true}
          containerStyle={{ zIndex: 1 }}
        />

        <TouchableOpacity
          style={[
            styles.primaryButton,
            {
              marginTop: 8,
              zIndex: 1,
              minHeight: 46,
              flexDirection: 'row',
              opacity: isTesting ? 0.75 : 1,
            },
          ]}
          onPress={onSave}
          disabled={isTesting}
          activeOpacity={0.8}
        >
          {isTesting && <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />}
          <Text style={styles.primaryButtonText}>
            {isTesting ? 'Wird geprüft...' : t('saveAndClose')}
          </Text>
        </TouchableOpacity>
      </View>
    </SlideMenuModal>
  );
};

/* ── MODAL 3: Sprache wechseln ───────────────────────────── */
export const LanguageModal = ({
  isVisible,
  menuBox,
  t,
  currentLanguage,
  onSelectLanguage,
  onClose,
  onModalHide,
}) => (
  <SlideMenuModal
    isVisible={isVisible}
    menuBox={menuBox}
    title={t('profil.modalLangTitle')}
    subtitle={t('profil.modalLangSubtitle')}
    onClose={onClose}
    onModalHide={onModalHide}
  >
    <ScrollView
      style={{ flex: 1, marginTop: 12 }}
      contentContainerStyle={{ paddingBottom: 4 }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {itemsLangFlag.map((item) => {
        const isSelected = currentLanguage === item.value;
        return (
          <TouchableOpacity
            key={item.value}
            onPress={() => onSelectLanguage(item.value)}
            style={[styles.langOption, isSelected && styles.langOptionActive]}
            activeOpacity={0.7}
          >
            <View style={styles.langOptionLeft}>
              <Text style={styles.langFlag}>{item.flag}</Text>
              <Text style={[styles.langText, isSelected && styles.langTextActive]}>{item.label}</Text>
            </View>
            {isSelected && <MaterialIcons name="check-circle" size={20} color="#3B82F6" />}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  </SlideMenuModal>
);

/* ── MODAL 4: Coins Shop & Transfer ──────────────────────── */
export const CoinsModal = ({
  isVisible,
  t,
  coins,
  myUserId,
  copiedId,
  onCopyId,
  receiverId,
  setReceiverId,
  sendCoinsAmount,
  setSendCoinsAmount,
  isSendingCoins,
  onSendCoins,
  loaded,
  onPurchase,
  onShowRewarded,
  onClose,
}) => {
  const [isSendExpanded, setIsSendExpanded] = useState(false);

  const toggleSendExpanded = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsSendExpanded((prev) => !prev);
  };

  const dismissAndClose = () => {
    Keyboard.dismiss();
    onClose();
  };

  return (
    <Modal
      isVisible={isVisible}
      animationIn="zoomIn"
      animationOut="zoomOut"
      animationInTiming={260}
      animationOutTiming={400}
      backdropTransitionInTiming={260}
      backdropTransitionOutTiming={400}
      backdropOpacity={0.75}
      hideModalContentWhileAnimating={true}
      useNativeDriver={true}
      useNativeDriverForBackdrop={true}
      onBackdropPress={dismissAndClose}
      onBackButtonPress={dismissAndClose}
      style={styles.modalBackdrop}
    >
      <View style={styles.modalSheet}>
        <View style={styles.modalHeader}>
          <View>
            <Text style={styles.modalTitle}>{t('profil.modalCoinsTitle')}</Text>
            <Text style={styles.modalSubtitle}>{t('profil.modalCoinsSubtitle')}</Text>
          </View>
          <TouchableOpacity onPress={dismissAndClose} style={styles.modalCloseBtn}>
            <MaterialIcons name="close" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingVertical: 14, gap: 12 }}
          style={{ maxHeight: height * 0.72 }}
        >
          {/* Persönliche ID */}
          <View style={styles.myIdCard}>
            <View style={styles.myIdHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <MaterialIcons name="fingerprint" size={16} color="#60A5FA" />
                <Text style={styles.myIdLabel}>Deine persönliche ID</Text>
              </View>
              <TouchableOpacity
                onPress={onCopyId}
                style={[styles.copyPillBtn, copiedId && styles.copyPillBtnActive]}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <MaterialIcons
                  name={copiedId ? 'check' : 'content-copy'}
                  size={13}
                  color={copiedId ? '#10B981' : '#60A5FA'}
                />
                <Text style={[styles.copyPillText, copiedId && { color: '#10B981' }]}>
                  {copiedId ? 'Kopiert!' : 'Kopieren'}
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.myIdValue} numberOfLines={1} ellipsizeMode="middle">
              {myUserId || 'Wird geladen…'}
            </Text>
            <Text style={styles.myIdHelpText}>
              Gib diese ID anderen, damit sie dir direkt Coins überweisen können.
            </Text>
          </View>

          {/* Coins senden Accordion */}
          <View style={[styles.sendAccordionCard, isSendExpanded && styles.sendAccordionCardActive]}>
            <TouchableOpacity activeOpacity={0.75} onPress={toggleSendExpanded} style={styles.sendOptionHeader}>
              <View style={styles.sendOptionIconWrap}>
                <MaterialIcons name="send" size={20} color="#60A5FA" />
              </View>
              <View style={{ flex: 1, paddingHorizontal: 12 }}>
                <Text style={styles.payOptionTitle}>Coins an Freund senden</Text>
                <Text style={styles.payOptionDesc}>
                  {isSendExpanded ? 'Empfänger und Anzahl festlegen' : 'Guthaben per ID übertragen'}
                </Text>
              </View>
              <MaterialIcons
                name={isSendExpanded ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                size={24}
                color={isSendExpanded ? '#60A5FA' : 'rgba(255,255,255,0.4)'}
              />
            </TouchableOpacity>

            {isSendExpanded && (
              <View style={styles.sendAccordionBody}>
                <View style={styles.sendDivider} />

                <View style={styles.sendInputWrap}>
                  <MaterialIcons name="badge" size={18} color="rgba(255,255,255,0.4)" style={{ marginRight: 8 }} />
                  <TextInput
                    style={styles.sendTextInput}
                    placeholder="Empfänger-ID einfügen"
                    placeholderTextColor="rgba(255,255,255,0.35)"
                    value={receiverId}
                    onChangeText={setReceiverId}
                    autoCapitalize="none"
                    autoCorrect={false}
                    spellCheck={false}
                  />
                  {Boolean(receiverId.length) && (
                    <TouchableOpacity onPress={() => setReceiverId('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <MaterialIcons name="cancel" size={16} color="rgba(255,255,255,0.3)" />
                    </TouchableOpacity>
                  )}
                </View>

                <View style={styles.sendInputWrap}>
                  <MaterialIcons name="monetization-on" size={18} color="#F59E0B" style={{ marginRight: 8 }} />
                  <TextInput
                    style={styles.sendTextInput}
                    placeholder="Anzahl Coins (z.B. 10)"
                    placeholderTextColor="rgba(255,255,255,0.35)"
                    keyboardType="numeric"
                    value={sendCoinsAmount}
                    onChangeText={(val) => setSendCoinsAmount(val.replace(/[^0-9]/g, ''))}
                  />
                  <TouchableOpacity
                    onPress={() => setSendCoinsAmount(String(coins || 0))}
                    style={styles.sendMaxBtn}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.sendMaxBtnText}>MAX</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  onPress={onSendCoins}
                  disabled={isSendingCoins || !receiverId.trim() || !sendCoinsAmount}
                  activeOpacity={0.85}
                  style={[
                    styles.sendSubmitBtn,
                    (!receiverId.trim() || !sendCoinsAmount || isSendingCoins) && { opacity: 0.5 },
                  ]}
                >
                  {isSendingCoins ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <MaterialIcons name="arrow-upward" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                      <Text style={styles.sendSubmitBtnText}>Jetzt senden</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* In-App Purchase */}
          <TouchableOpacity
            onPress={() => onPurchase('JA2C0002')}
            disabled={loaded}
            activeOpacity={0.8}
            style={styles.payOptionCard}
          >
            <View style={styles.payOptionIconWrap}>
              <MaterialIcons name="shopping-bag" size={22} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1, paddingHorizontal: 12 }}>
              <Text style={styles.payOptionTitle}>{t('profil.packTitle')}</Text>
              <Text style={styles.payOptionDesc}>{t('profil.packDesc')}</Text>
            </View>
            {loaded ? (
              <ActivityIndicator size="small" color="#3B82F6" />
            ) : (
              <MaterialIcons name="arrow-forward" size={18} color="#60A5FA" />
            )}
          </TouchableOpacity>

          {/* Rewarded Video */}
          <TouchableOpacity onPress={onShowRewarded} disabled={loaded} activeOpacity={0.8} style={styles.adOptionCard}>
            <View style={styles.adOptionIconWrap}>
              <MaterialIcons name="play-circle-filled" size={24} color="#F59E0B" />
            </View>
            <View style={{ flex: 1, paddingHorizontal: 12 }}>
              <Text style={styles.payOptionTitle}>{t('profil.adTitle')}</Text>
              <Text style={styles.payOptionDesc}>{t('profil.adDesc')}</Text>
            </View>
            {loaded ? (
              <ActivityIndicator size="small" color="#F59E0B" />
            ) : (
              <MaterialIcons name="arrow-forward" size={18} color="rgba(255,255,255,0.4)" />
            )}
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
};

/* ── MODAL 5: Werdegang & CV ─────────────────────────────── */
export const ExperienceModal = ({
  isVisible,
  t,
  isScanningCv,
  onScan,
  experiences,
  onAddExperience,
  onUpdateExperience,
  onDeleteExperience,
  onSave,
  onClose,
}) => (
  <Modal
    isVisible={isVisible}
    animationIn="zoomIn"
    animationOut="zoomOut"
    animationInTiming={260}
    animationOutTiming={300}
    backdropTransitionInTiming={260}
    backdropTransitionOutTiming={300}
    backdropOpacity={0.75}
    hideModalContentWhileAnimating={true}
    useNativeDriver={true}
    useNativeDriverForBackdrop={true}
    onBackdropPress={onClose}
    onBackButtonPress={onClose}
    style={styles.modalBackdrop}
  >
    <View style={styles.modalSheet}>
      <View style={styles.modalHeader}>
        <View>
          <Text style={styles.modalTitle}>{t('profil.cvModalTitle')}</Text>
          <Text style={styles.modalSubtitle}>{t('profil.cvModalSubtitle')}</Text>
        </View>
        <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <MaterialIcons name="close" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        onPress={onScan}
        disabled={isScanningCv}
        activeOpacity={0.82}
        style={[styles.scanActionCard, isScanningCv && { borderColor: '#F59E0B', opacity: 0.85 }]}
      >
        <View style={styles.scanIconWrap}>
          {isScanningCv ? (
            <ActivityIndicator size="small" color="#60A5FA" />
          ) : (
            <MaterialIcons name="document-scanner" size={22} color="#60A5FA" />
          )}
        </View>
        <View style={{ flex: 1, paddingHorizontal: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={styles.scanCardTitle}>
              {isScanningCv ? 'Analyse läuft im Hintergrund…' : t('profil.scanTitle')}
            </Text>
            <View style={styles.badgeAi}>
              <Text style={styles.badgeAiText}>{t('profil.scanBadge')}</Text>
            </View>
          </View>
          <Text style={styles.scanCardDesc}>
            {isScanningCv
              ? 'Du kannst dieses Fenster schließen oder die App verlassen.'
              : t('profil.scanDesc')}
          </Text>
        </View>
        {!isScanningCv && <MaterialIcons name="arrow-forward" size={18} color="#60A5FA" />}
      </TouchableOpacity>

      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>
          {t('profil.sectionExperience', { count: experiences.length })}
        </Text>
        <TouchableOpacity onPress={onAddExperience} style={styles.addBtn} activeOpacity={0.7}>
          <MaterialIcons name="add" size={16} color="#60A5FA" />
          <Text style={styles.addBtnText}>{t('profil.btnAdd')}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.experienceScrollArea}
        contentContainerStyle={{ paddingBottom: 8 }}
        showsVerticalScrollIndicator={true}
        keyboardShouldPersistTaps="handled"
      >
        {experiences.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="work-outline" size={32} color="rgba(255,255,255,0.2)" />
            <Text style={styles.emptyText}>{t('profil.emptyExperience')}</Text>
          </View>
        ) : (
          experiences.map((exp, index) => (
            <View key={exp.id || index} style={styles.experienceCard}>
              <View style={styles.expCardHeader}>
                <View style={styles.expBadge}>
                  <Text style={styles.expBadgeText}>
                    {t('profil.stationBadge', { index: index + 1 })}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => onDeleteExperience(exp.id)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                  <MaterialIcons name="delete-outline" size={19} color="#EF4444" />
                </TouchableOpacity>
              </View>

              <Text style={styles.inputLabel}>{t('profil.labelRole')}</Text>
              <TextInput
                style={styles.textInput}
                value={exp.role}
                onChangeText={(val) => onUpdateExperience(exp.id, 'role', val)}
                placeholder={t('profil.placeholderRole')}
                placeholderTextColor="rgba(255, 255, 255, 0.3)"
              />

              <View style={styles.inputRow}>
                <View style={{ flex: 1.2 }}>
                  <Text style={styles.inputLabel}>{t('profil.labelCompany')}</Text>
                  <TextInput
                    style={styles.textInput}
                    value={exp.company}
                    onChangeText={(val) => onUpdateExperience(exp.id, 'company', val)}
                    placeholder={t('profil.placeholderCompany')}
                    placeholderTextColor="rgba(255, 255, 255, 0.3)"
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>{t('profil.labelPeriod')}</Text>
                  <TextInput
                    style={styles.textInput}
                    value={exp.period}
                    onChangeText={(val) => onUpdateExperience(exp.id, 'period', val)}
                    placeholder={t('profil.placeholderPeriod')}
                    placeholderTextColor="rgba(255, 255, 255, 0.3)"
                  />
                </View>
              </View>

              <Text style={styles.inputLabel}>{t('profil.labelTasks')}</Text>
              <TextInput
                style={[styles.textInput, styles.textAreaInput]}
                value={exp.tasks}
                onChangeText={(val) => onUpdateExperience(exp.id, 'tasks', val)}
                placeholder={t('profil.placeholderTasks')}
                placeholderTextColor="rgba(255, 255, 255, 0.3)"
                multiline={true}
                textAlignVertical="top"
                scrollEnabled={false}
              />
            </View>
          ))
        )}
      </ScrollView>

      <TouchableOpacity style={styles.saveModalBtn} onPress={onSave} activeOpacity={0.85}>
        <MaterialIcons name="check" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
        <Text style={styles.saveModalBtnText}>{t('saveAndClose')}</Text>
      </TouchableOpacity>
    </View>
  </Modal>
);

const styles = StyleSheet.create({
  modalBackdrop: {
    justifyContent: 'center',
    alignItems: 'center',
    margin: 0,
    paddingHorizontal: 16,
  },
  modalSheet: {
    width: '100%',
    maxWidth: 460,
    backgroundColor: MENU_SURFACE,
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: MENU_BORDER,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 16,
  },
  modalBackdropExact: {
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    margin: 0,
    paddingHorizontal: 0,
    paddingTop: 0,
  },
  modalSheetFrame: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 16,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  modalSubtitle: {
    color: 'rgba(255, 255, 255, 0.45)',
    fontSize: 12,
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  primaryButton: {
    width: '100%',
    height: 48,
    backgroundColor: '#3B82F6',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  inputShell: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    paddingLeft: 12,
    paddingRight: 6,
    minHeight: 48,
  },
  inputIcon: { marginRight: 10 },
  textInputField: {
    flex: 1,
    minWidth: 0,
    color: '#FFFFFF',
    fontSize: 14.5,
    paddingVertical: 12,
  },
  inputSuffixDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 6,
  },
  inputSuffixSlot: { flexShrink: 0 },
  clearBtn: { flexShrink: 0, paddingHorizontal: 4 },
  langOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  langOptionActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.4)',
  },
  langOptionLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  langFlag: { fontSize: 20 },
  langText: { color: 'rgba(255, 255, 255, 0.8)', fontSize: 15, fontWeight: '500' },
  langTextActive: { color: '#FFFFFF', fontWeight: '700' },
  myIdCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.25)',
    borderRadius: 16,
    padding: 12,
  },
  myIdHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  myIdLabel: {
    color: '#93C5FD',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  myIdValue: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    backgroundColor: '#0F1117',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  myIdHelpText: { color: 'rgba(255, 255, 255, 0.45)', fontSize: 10.5, marginTop: 6 },
  copyPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  copyPillBtnActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: 'rgba(16, 185, 129, 0.35)',
  },
  copyPillText: { color: '#60A5FA', fontSize: 11, fontWeight: '700' },
  sendAccordionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
  },
  sendAccordionCardActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.04)',
    borderColor: 'rgba(59, 130, 246, 0.28)',
  },
  sendOptionHeader: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  sendOptionIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendAccordionBody: { paddingHorizontal: 14, paddingBottom: 14, gap: 10 },
  sendDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 4,
  },
  sendInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#12151D',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  sendTextInput: { flex: 1, color: '#FFFFFF', fontSize: 13, paddingVertical: 0 },
  sendMaxBtn: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  sendMaxBtnText: { color: '#F59E0B', fontSize: 10.5, fontWeight: '800' },
  sendSubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    height: 42,
    marginTop: 2,
  },
  sendSubmitBtnText: { color: '#FFFFFF', fontSize: 13.5, fontWeight: '700' },
  payOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  payOptionIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  payOptionTitle: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  payOptionDesc: { color: 'rgba(255, 255, 255, 0.5)', fontSize: 12, marginTop: 2 },
  adOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  adOptionIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanActionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
    borderRadius: 16,
    padding: 14,
    marginBottom: 18,
  },
  scanIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanCardTitle: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  badgeAi: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeAiText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800' },
  scanCardDesc: { color: 'rgba(255, 255, 255, 0.55)', fontSize: 12, marginTop: 2 },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 4,
  },
  sectionTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    borderRadius: 8,
  },
  addBtnText: { color: '#60A5FA', fontSize: 12, fontWeight: '600' },
  experienceScrollArea: { maxHeight: height * 0.4 },
  experienceCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
  },
  expCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  expBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  expBadgeText: { color: 'rgba(255, 255, 255, 0.7)', fontSize: 11, fontWeight: '600' },
  inputLabel: { color: 'rgba(255, 255, 255, 0.5)', fontSize: 11, marginBottom: 4, marginTop: 4 },
  textInput: {
    backgroundColor: '#12151D',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.09)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: '#FFFFFF',
    fontSize: 13,
  },
  textAreaInput: { minHeight: 68, textAlignVertical: 'top' },
  inputRow: { flexDirection: 'row', gap: 8 },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 28,
    paddingHorizontal: 20,
  },
  emptyText: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 18,
  },
  saveModalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    borderRadius: 14,
    height: 46,
    marginTop: 8,
  },
  saveModalBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
});