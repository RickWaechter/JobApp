// OldScreen.js
import MaterialIcons from '@react-native-vector-icons/material-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Animated,
  BackHandler,
  Dimensions,
  FlatList,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import DeviceInfo from 'react-native-device-info';
import EncryptedStorage from 'react-native-encrypted-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import SQLite from 'react-native-sqlite-storage';

import CompanySearchModal from '../comp/name.js';
import colors from '../inc/colors.js';
import { encryp } from '../inc/cryp.js';
import ChangeScreenOld from './changeOld.js';

const { width, height } = Dimensions.get('window');
const DB_NAME = 'firstNew.db';

/* ── Eintrag Card (Memoisiert) ─────────────────────────────────────────── */
const HistoryEntryCard = memo(
  ({ entry, index, onUseTemplate, onOpenApplication, onDelete }) => {
    const { t } = useTranslation();

    const handleTemplate = useCallback(() => {
      onUseTemplate(entry);
    }, [entry, onUseTemplate]);

    const handleOpen = useCallback(() => {
      onOpenApplication(entry);
    }, [entry, onOpenApplication]);

    const handleDelete = useCallback(() => {
      onDelete(index);
    }, [index, onDelete]);

    const wrapText = (text, max = 14) =>
      text?.length > max
        ? text.replace(new RegExp(`(.{1,${max}})(\\s+|$)`, 'g'), '$1\n').trim()
        : text || '';

    return (
      <View style={styles.cardWrapper}>
        <Pressable
          onPress={handleTemplate}
          onLongPress={handleOpen}
          delayLongPress={280}
          style={({ pressed }) => [styles.entryCard, pressed && styles.cardPressed]}
        >
          <View style={styles.cardHeader}>
            <View style={styles.jobIconWrapper}>
              <MaterialIcons name="work-outline" size={20} color="#60A5FA" />
            </View>

            <View style={styles.headerTextWrap}>
              <Text style={styles.jobTitle} numberOfLines={1}>
                {entry.job || t('history.defaultJobTitle')}
              </Text>
              {Boolean(entry.date) && <Text style={styles.dateText}>{entry.date}</Text>}
            </View>

            <TouchableOpacity
              onPress={handleDelete}
              style={styles.deleteBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <MaterialIcons name="delete-outline" size={20} color="#EF4444" />
            </TouchableOpacity>
          </View>

          <View style={styles.cardBody}>
            {Boolean(entry.subject) && (
              <Text style={styles.subjectText} numberOfLines={1}>
                {entry.subject}
              </Text>
            )}

            {Boolean(entry.myType) && entry.myType !== ' / ' && (
              <View style={styles.badgeRow}>
                <View style={styles.typeBadge}>
                  <Text style={styles.typeBadgeText}>{entry.myType}</Text>
                </View>
                {Boolean(entry.link) && (
                  <View style={styles.pdfAttachedBadge}>
                    <MaterialIcons name="attachment" size={12} color="#60A5FA" />
                    <Text style={styles.pdfAttachedText}>{t('history.pdfAttached')}</Text>
                  </View>
                )}
              </View>
            )}
          </View>

          <View style={styles.cardFooter}>
            <TouchableOpacity
              style={styles.primaryActionBtn}
              onPress={handleTemplate}
              activeOpacity={0.8}
            >
              <MaterialIcons
                name="auto-awesome"
                size={15}
                color="rgba(255,255,255,0.8)"
                style={{ marginRight: 5 }}
              />
              <Text style={styles.secondaryActionBtnText}>{t('history.reuseTemplate')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryActionBtn}
              onPress={handleOpen}
              activeOpacity={0.7}
            >
              <MaterialIcons name="folder-open" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.primaryActionBtnText}>{wrapText(t('history.openFolder'))}</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </View>
    );
  }
);

/* ── OldScreen Hauptkomponente ─────────────────────────────────────────── */
const OldScreen = () => {
  const { t } = useTranslation();
  const { items } = useLocalSearchParams();
  const [entries, setEntries] = useState(() => {
    if (!items) return [];
    try {
      const parsed = JSON.parse(items);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [changeOldScreen, setChangeOldScreen] = useState(false);

  const inputRef = useRef(null);
  const lastOpenClick = useRef(0);
  const lastTemplateClick = useRef(0);
  const kbListenerRef = useRef(null);
  const kbFallbackRef = useRef(null);

  /* ── Animationen ChangeScreenOld & Haupt-Container ── */
  const animProgress = useRef(new Animated.Value(0)).current;
  const animProgressY = useRef(new Animated.Value(0)).current;
  const animProgressOpacity = useRef(new Animated.Value(0)).current;
  const animViewOpacity = useRef(new Animated.Value(1)).current;

  /* ── Animationen CompanySearch Modal ── */
  const nameProgressX = useRef(new Animated.Value(-width)).current;
  const nameProgressY = useRef(new Animated.Value(1)).current;
  const nameOpacity = useRef(new Animated.Value(0)).current;

  /* ── Zentraler Reset auf Standardwerte ── */
  const resetAllToDefaults = useCallback(() => {
    if (kbListenerRef.current) {
      kbListenerRef.current.remove();
      kbListenerRef.current = null;
    }
    if (kbFallbackRef.current) {
      clearTimeout(kbFallbackRef.current);
      kbFallbackRef.current = null;
    }

    setModalVisible(false);
    setChangeOldScreen(false);
    setSelectedEntry(null);

    animProgress.setValue(0);
    animProgressY.setValue(0);
    animProgressOpacity.setValue(0);
    animViewOpacity.setValue(1);

    nameProgressX.setValue(0);
    nameProgressY.setValue(1);
    nameOpacity.setValue(0);
  }, [
    animProgress,
    animProgressY,
    animProgressOpacity,
    animViewOpacity,
    nameProgressX,
    nameProgressY,
    nameOpacity,
  ]);

  useFocusEffect(
    useCallback(() => {
      return () => {
        resetAllToDefaults();
      };
    }, [resetAllToDefaults])
  );

  /* ── CompanySearch Modal: Sanfter Slide-In nach Keyboard-Start ── */
  const triggerNameSlideDown = useCallback(() => {
    if (kbFallbackRef.current) {
      clearTimeout(kbFallbackRef.current);
      kbFallbackRef.current = null;
    }
    if (kbListenerRef.current) {
      kbListenerRef.current.remove();
      kbListenerRef.current = null;
    }

    Animated.parallel([
      Animated.timing(nameProgressX, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(nameOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(animViewOpacity, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, [nameProgressX, nameOpacity, animViewOpacity]);

  const openTemplateModal = useCallback(
    (entry) => {
      setSelectedEntry(entry);
      setModalVisible(true);
      nameProgressX.setValue(0);
      nameProgressY.setValue(1);
      nameOpacity.setValue(0);

      Promise.all([
        EncryptedStorage.setItem('job', entry.job || ''),
        EncryptedStorage.setItem('text', entry.text || ''),
        EncryptedStorage.setItem('subject', entry.subject || ''),
      ]).catch((e) => console.error('Storage error', e));

      const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';

      kbListenerRef.current = Keyboard.addListener(showEvent, () => {
        triggerNameSlideDown();
      });

      kbFallbackRef.current = setTimeout(() => {
        triggerNameSlideDown();
      }, 240);
    },
    [nameProgressX, nameProgressY, nameOpacity, triggerNameSlideDown]
  );

  const closeModal = useCallback(() => {
    Keyboard.dismiss();

    if (kbListenerRef.current) {
      kbListenerRef.current.remove();
      kbListenerRef.current = null;
    }
    if (kbFallbackRef.current) {
      clearTimeout(kbFallbackRef.current);
      kbFallbackRef.current = null;
    }

    Animated.parallel([
      Animated.timing(nameProgressY, {
        toValue: 2,
        duration: 380,
        useNativeDriver: true,
      }),
      Animated.timing(nameOpacity, {
        toValue: 0,
        duration: 320,
        useNativeDriver: true,
      }),
      Animated.timing(animViewOpacity, {
        toValue: 1,
        duration: 380,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) {
        setModalVisible(false);
        nameProgressX.setValue(0);
        nameProgressY.setValue(1);
      }
    });
  }, [nameProgressY, nameOpacity, animViewOpacity, nameProgressX]);

  /* ── Firmenübernahme: Tastatur bleibt oben, synchroner Slide-Übergang zu ChangeScreenOld ── */
  const handleCompanySaved = useCallback(
    (name, street, city) => {
      Promise.all([
        EncryptedStorage.setItem('yourName', name || ''),
        EncryptedStorage.setItem('yourStreet', street || ''),
        EncryptedStorage.setItem('yourCity', city || ''),
        EncryptedStorage.setItem('result', 'changeOld'),
      ]).catch((err) => console.error('Storage error:', err));

      setChangeOldScreen(true);
      animProgress.setValue(0);
      animProgressY.setValue(0);
      animProgressOpacity.setValue(1);

      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });

      Animated.parallel([
        Animated.timing(nameProgressX, {
          toValue: 2,
          duration: 380,
          useNativeDriver: true,
        }),
        Animated.timing(nameOpacity, {
          toValue: 0,
          duration: 320,
          useNativeDriver: true,
        }),
        Animated.timing(animProgress, {
          toValue: 1,
          duration: 380,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) {
          setModalVisible(false);
          nameProgressX.setValue(0);
          nameProgressY.setValue(0);
        }
      });
    },
    [nameProgressX, nameProgressY, nameOpacity, animProgress, animProgressY, animProgressOpacity]
  );

  const closeChangeOldScreen = useCallback(() => {
    Keyboard.dismiss();

    Animated.parallel([
      Animated.timing(animProgressY, {
        toValue: 1,
        duration: 280,
        useNativeDriver: true,
      }),
      Animated.timing(animProgressOpacity, {
        toValue: 0,
        duration: 280,
        useNativeDriver: true,
      }),
      Animated.timing(animViewOpacity, {
        toValue: 1,
        duration: 280,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setChangeOldScreen(false);
      setModalVisible(false);
      setSelectedEntry(null);
      animProgress.setValue(0);
      nameProgressX.setValue(0);
      nameProgressY.setValue(1);
      animProgressY.setValue(0);
    });
  }, [animProgress, animProgressY, animProgressOpacity, animViewOpacity, nameProgressX, nameProgressY]);

  useEffect(() => {
    const onBackPress = () => {
      if (modalVisible) {
        closeModal();
        return true;
      }
      if (changeOldScreen) {
        closeChangeOldScreen();
        return true;
      }
      return false;
    };

    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [modalVisible, changeOldScreen, closeModal, closeChangeOldScreen]);

  const handleUseTemplate = useCallback(
    (entry) => {
      const now = Date.now();
      if (now - lastTemplateClick.current < 450) return;
      lastTemplateClick.current = now;
      openTemplateModal(entry);
    },
    [openTemplateModal]
  );

  const handleOpenApplication = useCallback(async (entry) => {
    const now = Date.now();
    if (now - lastOpenClick.current < 600) return;
    lastOpenClick.current = now;

    const hasLink = Boolean(entry?.link);
    const entryValuesLength = entry ? Object.values(entry).length : 0;
    const conditionMet = hasLink && entryValuesLength > 2;

    if (conditionMet) {
      const pdfTarget = `${entry.link}.pdf`;
      const resultTarget = 'collect';
      const routeTarget = '/collect';

      try {
        await Promise.all([
          EncryptedStorage.setItem('merge', pdfTarget),
          EncryptedStorage.setItem('result', resultTarget),
        ]);
        router.navigate(routeTarget);
      } catch (e) {
        console.error('Routing / Storage Error:', e);
      }
    } else {
      Alert.alert(
        t('history.fileNotFoundTitle'),
        t('history.fileNotFoundMsg'),
        [{ text: t('common.ok') }]
      );
    }
  }, [t]);

  const deleteEntry = useCallback((indexToDelete) => {
    setEntries((prevEntries) => {
      const item = prevEntries[indexToDelete];
      if (!item) return prevEntries;

      Alert.alert(
        t('history.deleteTitle'),
        t('history.deleteConfirm', { job: item.job }),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('delete'),
            style: 'destructive',
            onPress: async () => {
              try {
                const newList = prevEntries.filter((_, idx) => idx !== indexToDelete);
                setEntries(newList);

                const oldParts = newList.map(
                  (entry) =>
                    `${entry.job}#${entry.date}#${entry.myType?.split(' / ')[0] || ''}#${
                      entry.myType?.split(' / ')[1] || ''
                    }#${entry.subject || ''}#${entry.text || ''}`
                );
                const pdfLinks = newList.map((entry) => entry.link || '');
                const key = await EncryptedStorage.getItem('key');

                const encOld =
                  newList.length > 0 ? await encryp(oldParts.join('&') + '&', key) : '';
                const encPdf =
                  newList.length > 0 ? await encryp(pdfLinks.join(','), key) : '';

                const deviceId = await DeviceInfo.getUniqueId();
                const db = await SQLite.openDatabase({ name: DB_NAME, location: 'default' });

                db.transaction((tx) => {
                  tx.executeSql(
                    'UPDATE files SET old = ?, mergePdf = ? WHERE ident = ?;',
                    [encOld, encPdf, deviceId]
                  );
                });
              } catch (error) {
                console.error('Fehler beim Löschen des Eintrags:', error);
              }
            },
          },
        ]
      );
      return prevEntries;
    });
  }, [t]);

  /* ── Gesamten Verlauf leeren ── */
  const clearAllEntries = useCallback(() => {
    if (entries.length === 0) return;

    Alert.alert(
      t('history.clearAllTitle'),
      t('history.clearAllMsg'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('history.clearAllConfirm'),
          style: 'destructive',
          onPress: async () => {
            try {
              setEntries([]);

              const deviceId = await DeviceInfo.getUniqueId();
              const db = await SQLite.openDatabase({ name: DB_NAME, location: 'default' });

              db.transaction((tx) => {
                tx.executeSql(
                  'UPDATE files SET old = ?, mergePdf = ? WHERE ident = ?;',
                  ['', '', deviceId]
                );
              });
            } catch (error) {
              console.error('Fehler beim Löschen aller Einträge:', error);
            }
          },
        },
      ]
    );
  }, [entries.length, t]);

  const renderItem = useCallback(
    ({ item, index }) => (
      <HistoryEntryCard
        entry={item}
        index={index}
        onUseTemplate={handleUseTemplate}
        onOpenApplication={handleOpenApplication}
        onDelete={deleteEntry}
      />
    ),
    [handleUseTemplate, handleOpenApplication, deleteEntry]
  );

  const keyExtractor = useCallback(
    (item, index) => (item.link ? String(item.link) : `${item.job || 'entry'}-${index}`),
    []
  );

  const renderListHeader = useCallback(() => {
    return (
      <View style={styles.listActionBar}>
        <TouchableOpacity
          style={styles.clearAllBtn}
          onPress={clearAllEntries}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <MaterialIcons name="delete-sweep" size={17} color="#EF4444" />
          <Text style={styles.clearAllBtnText}>{t('history.clearAll')}</Text>
        </TouchableOpacity>
        <View style={styles.countBadge}>
          <MaterialIcons name="folder-shared" size={15} color="#60A5FA" />
          <Text style={styles.countBadgeText}>
            {t('history.count', { count: entries.length })}
          </Text>
        </View>
      </View>
    );
  }, [entries.length, clearAllEntries, t]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <Animated.View style={[styles.container, { opacity: animViewOpacity }]}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.titleMain}>{t('history.title')}</Text>
          <Text style={styles.subtitleMain}>{t('history.subtitle')}</Text>
        </View>

        {/* Content */}
        {entries.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconWrap}>
              <MaterialIcons name="history" size={36} color="rgba(255,255,255,0.25)" />
            </View>
            <Text style={styles.emptyTitle}>{t('history.emptyTitle')}</Text>
            <Text style={styles.emptySubtitle}>{t('history.emptySubtitle')}</Text>
            <TouchableOpacity
              style={styles.newAppBtn}
              onPress={() => router.dismissAll('/(tabs)')}
              activeOpacity={0.8}
            >
              <MaterialIcons name="add" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.newAppBtnText}>{t('history.newApplicationBtn')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={entries}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            ListHeaderComponent={renderListHeader}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            initialNumToRender={6}
            maxToRenderPerBatch={6}
            windowSize={5}
            removeClippedSubviews={Platform.OS === 'android'}
          />
        )}
      </Animated.View>

      {/* ══ CompanySearch Modal Overlay ══ */}
      {modalVisible && (
        <View style={styles.modalOverlay} pointerEvents="box-none">
          <Animated.View
            renderToHardwareTextureAndroid={true}
            shouldRasterizeIOS={true}
            style={[
              styles.cardAnimatedWrap,
              {
                opacity: nameOpacity,
                transform: [
                  {
                    translateX: nameProgressX.interpolate({
                      inputRange: [0, 1, 2],
                      outputRange: [width, 0, -width * 0.65],
                      extrapolate: 'clamp',
                    }),
                  },
                  {
                    translateY: nameProgressY.interpolate({
                      inputRange: [0, 1, 2],
                      outputRange: [height, 0, -height],
                      extrapolate: 'clamp',
                    }),
                  },
                ],
              },
            ]}
          >
            <CompanySearchModal
              visible={modalVisible}
              onClose={closeModal}
              onSaved={handleCompanySaved}
              initialName={selectedEntry?.job || ''}
            />
          </Animated.View>
        </View>
      )}

      {/* ══ Overlay & Slide-In Container (ChangeScreenOld) ══ */}
      {changeOldScreen && (
        <View style={styles.changeOverlay}>
          <Animated.View
            style={[
              styles.backdrop,
              {
                opacity: animProgressOpacity.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 1],
                }),
              },
            ]}
          >
            <Pressable style={StyleSheet.absoluteFill} onPress={closeChangeOldScreen} />
          </Animated.View>

          <Animated.View
            renderToHardwareTextureAndroid={true}
            shouldRasterizeIOS={true}
            style={[
              styles.cardAnimatedWrap,
              {
                transform: [
                  {
                    translateX: animProgress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [width, 0],
                      extrapolate: 'clamp',
                    }),
                  },
                  {
                    translateY: animProgressY.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -height],
                      extrapolate: 'clamp',
                    }),
                  },
                ],
              },
            ]}
          >
            <ChangeScreenOld
              visible={changeOldScreen}
              ref={inputRef}
              onClose={closeChangeOldScreen}
              paddingFactor={1.05}
            />
          </Animated.View>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background || '#0F1117',
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  header: {
    marginBottom: 16,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  badgeHub: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#3B82F6',
    marginRight: 6,
  },
  badgeHubText: {
    color: '#60A5FA',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  listActionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
    marginBottom: 12,
  },
  countBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.25)',
  },
  countBadgeText: {
    color: '#60A5FA',
    fontSize: 12.5,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  clearAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  clearAllBtnText: {
    color: '#EF4444',
    fontSize: 11.5,
    fontWeight: '600',
  },
  titleMain: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  subtitleMain: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  cardWrapper: {
    marginBottom: 14,
  },
  entryCard: {
    backgroundColor: '#171B26',
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  cardPressed: {
    backgroundColor: '#1E2433',
    transform: [{ scale: 0.985 }],
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  jobIconWrapper: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  headerTextWrap: {
    flex: 1,
  },
  jobTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  dateText: {
    color: 'rgba(255, 255, 255, 0.45)',
    fontSize: 11.5,
    marginTop: 1,
  },
  deleteBtn: {
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardBody: {
    marginBottom: 14,
    gap: 6,
  },
  subjectText: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 13,
    fontWeight: '500',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  typeBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  typeBadgeText: {
    color: 'rgba(255, 255, 255, 0.55)',
    fontSize: 11,
    fontWeight: '600',
  },
  pdfAttachedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
    gap: 4,
  },
  pdfAttachedText: {
    color: '#60A5FA',
    fontSize: 11,
    fontWeight: '600',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    gap: 10,
  },
  primaryActionBtn: {
    flex: 1.2,
    height: 40,
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  primaryActionBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  secondaryActionBtn: {
    flex: 0.9,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryActionBtnText: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 12.5,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingBottom: 60,
  },
  emptyIconWrap: {
    width: 70,
    height: 70,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 16,
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 6,
  },
  emptySubtitle: {
    color: 'rgba(255, 255, 255, 0.45)',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  newAppBtn: {
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  newAppBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 110,
    elevation: 25,
  },
  changeOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    elevation: 20,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 12, 18, 0.82)',
  },
  cardAnimatedWrap: {
    flex: 1,
  },
});

export default OldScreen;