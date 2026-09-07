// OldScreen.js
import MaterialIcons from '@react-native-vector-icons/material-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  PanResponder,
  Pressable,
  ScrollView,
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

const { width } = Dimensions.get('window');
const DB_NAME = 'firstNew.db';
const SWIPE_THRESHOLD = 80;

/* ── History Card Komponente ────────────────────────────── */
const HistoryEntryCard = memo(
  ({ entry, index, onUseTemplate, onOpenApplication, onDelete, panHandlers }) => (
    <View style={styles.cardWrapper} {...panHandlers}>
      <Pressable
        onPress={() => onUseTemplate(entry)}
        onLongPress={() => onOpenApplication(entry)}
        delayLongPress={280}
        style={({ pressed }) => [styles.entryCard, pressed && styles.cardPressed]}
      >
        <View style={styles.cardHeader}>
          <View style={styles.jobIconWrapper}>
            <MaterialIcons name="work-outline" size={20} color="#60A5FA" />
          </View>

          <View style={styles.headerTextWrap}>
            <Text style={styles.jobTitle} numberOfLines={1}>
              {entry.job || 'Unbenannte Bewerbung'}
            </Text>
            {Boolean(entry.date) && <Text style={styles.dateText}>{entry.date}</Text>}
          </View>

          <TouchableOpacity
            onPress={() => onDelete(index)}
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
                  <Text style={styles.pdfAttachedText}>PDF vorhanden</Text>
                </View>
              )}
            </View>
          )}
        </View>

        <View style={styles.cardFooter}>
          <TouchableOpacity
            style={styles.primaryActionBtn}
            onPress={() => onOpenApplication(entry)}
            activeOpacity={0.8}
          >
            <MaterialIcons name="folder-open" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.primaryActionBtnText}>Mappe öffnen</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryActionBtn}
            onPress={() => onUseTemplate(entry)}
            activeOpacity={0.7}
          >
            <MaterialIcons
              name="auto-awesome"
              size={15}
              color="rgba(255,255,255,0.8)"
              style={{ marginRight: 5 }}
            />
            <Text style={styles.secondaryActionBtnText}>Neu verwenden</Text>
          </TouchableOpacity>
        </View>
      </Pressable>
    </View>
  )
);

const OldScreen = () => {
  const { t } = useTranslation();
  const { items } = useLocalSearchParams();

  const [entries, setEntries] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [changeOldScreen, setChangeOldScreen] = useState(false);

  const lastTimeClick = useRef(0);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (items) {
      try {
        const parsed = JSON.parse(items);
        setEntries(Array.isArray(parsed) ? parsed : []);
      } catch (err) {
        console.error('Fehler beim Parsen der Items:', err);
        setEntries([]);
      }
    }
    setLoading(false);
  }, [items]);

  const resetCardAnimation = useCallback(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [slideAnim, fadeAnim]);

  useFocusEffect(
    useCallback(() => {
      resetCardAnimation();
    }, [resetCardAnimation])
  );

  const handleOpenApplication = async (entry) => {
    const now = Date.now();
    if (now - lastTimeClick.current < 600) return;
    lastTimeClick.current = now;

    if (entry.link && Object.values(entry).length > 2) {
      try {
        await EncryptedStorage.setItem('merge', `${entry.link}.pdf`);
        await EncryptedStorage.setItem('result', 'collect');
        router.push('/collect');
      } catch (e) {
        console.error('Routing error to collect:', e);
      }
    } else {
      Alert.alert(
        'Datei nicht gefunden',
        'Die PDF-Bewerbungsmappe ist nicht mehr im Speicher vorhanden.'
      );
    }
  };

  const triggerSwipeRightAndOpenModal = (entry) => {
    setSelectedEntry(entry);
    setTimeout(() => setModalVisible(true), 80);

    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -width * 0.9,
        duration: 320,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0.2,
        duration: 320,
        useNativeDriver: true,
      }),
    ]).start(async () => {
      await EncryptedStorage.setItem('job', entry.job || '');
      await EncryptedStorage.setItem('text', entry.text || '');
      await EncryptedStorage.setItem('subject', entry.subject || '');
    });
  };

  const handleCardPress = (entry) => {
    const now = Date.now();
    if (now - lastTimeClick.current < 800) return;
    lastTimeClick.current = now;
    triggerSwipeRightAndOpenModal(entry);
  };

  const createPanResponder = (entry) =>
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) =>
        Math.abs(gestureState.dx) > 15 && Math.abs(gestureState.dy) < 20,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dx > 0) {
          slideAnim.setValue(gestureState.dx);
          fadeAnim.setValue(Math.max(0.2, 1 - gestureState.dx / width));
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx > SWIPE_THRESHOLD || gestureState.vx > 0.5) {
          triggerSwipeRightAndOpenModal(entry);
        } else {
          resetCardAnimation();
        }
      },
      onPanResponderTerminate: resetCardAnimation,
    });

  const deleteEntry = (indexToDelete) => {
    const item = entries[indexToDelete];
    Alert.alert(
      'Eintrag löschen',
      `Möchtest du die Bewerbung für "${item.job}" wirklich aus der Historie entfernen?`,
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Löschen',
          style: 'destructive',
          onPress: async () => {
            try {
              const newList = [...entries];
              newList.splice(indexToDelete, 1);
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
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.badgeHub}>
            <View style={styles.statusDot} />
            <Text style={styles.badgeHubText}>HISTORIE & VORLAGEN</Text>
          </View>
          <Text style={styles.titleMain}>Frühere Bewerbungen</Text>
          <Text style={styles.subtitleMain}>
            Öffne fertige Mappen oder passe bestehende Texte für eine neue Firma an.
          </Text>

          {/* ── Gesamtanzahl Badge ── */}
          {!loading && entries.length > 0 && (
            <View style={styles.counterRow}>
              <View style={styles.counterBadge}>
                <MaterialIcons name="folder-open" size={14} color="#60A5FA" />
                <Text style={styles.counterText}>
                  <Text style={styles.counterHighlight}>{entries.length}</Text>{' '}
                  {entries.length === 1 ? 'Bewerbung insgesamt' : 'Bewerbungen insgesamt'}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Content */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3B82F6" />
          </View>
        ) : entries.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconWrap}>
              <MaterialIcons name="history" size={36} color="rgba(255,255,255,0.25)" />
            </View>
            <Text style={styles.emptyTitle}>Keine Vorlagen vorhanden</Text>
            <Text style={styles.emptySubtitle}>
              Sobald du deine erste Bewerbung erstellst, wird sie hier automatisch gespeichert.
            </Text>
            <TouchableOpacity
              style={styles.newAppBtn}
              onPress={() => router.push('/first')}
              activeOpacity={0.8}
            >
              <MaterialIcons name="add" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.newAppBtnText}>Neue Bewerbung starten</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <Animated.View style={{ opacity: fadeAnim, transform: [{ translateX: slideAnim }] }}>
              {entries.map((entry, index) => {
                const cardPanResponder = createPanResponder(entry);
                return (
                  <HistoryEntryCard
                    key={`${entry.job}-${index}`}
                    entry={entry}
                    index={index}
                    onUseTemplate={handleCardPress}
                    onOpenApplication={handleOpenApplication}
                    onDelete={deleteEntry}
                    panHandlers={cardPanResponder.panHandlers}
                  />
                );
              })}
            </Animated.View>
          </ScrollView>
        )}
      </View>

      {/* Firmen-Such Modal */}
      <CompanySearchModal
        visible={modalVisible}
        nextScreen={changeOldScreen}
        initialName={selectedEntry?.job || ''}
        onClose={() => {
          setModalVisible(false);
          resetCardAnimation();
        }}
        onSaved={async () => {
          setChangeOldScreen(true);

          setModalVisible(false);
          await EncryptedStorage.setItem('result', 'changeOld');
        }}
      />

      {/* Editor Overlay für Altdaten */}
      <ChangeScreenOld
        visible={changeOldScreen}
        onClose={() => {setChangeOldScreen(false);
          setModalVisible(false);
        }
        }
        
      />
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
  badgeHub: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 8,
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  counterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.25)',
    gap: 6,
  },
  counterText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    fontWeight: '500',
  },
  counterHighlight: {
    color: '#60A5FA',
    fontWeight: '800',
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
  scrollView: {
    flex: 1,
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default OldScreen;