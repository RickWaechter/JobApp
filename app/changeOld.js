// changeOld.js
import MaterialIcons from '@react-native-vector-icons/material-icons';
import { router } from 'expo-router';
import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Animated,
  Keyboard,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {generate} from '../inc/generate.js';
import EncryptedStorage from 'react-native-encrypted-storage';
import { SafeAreaView } from 'react-native-safe-area-context';


const DB_NAME = 'firstNew.db';

const ChangeScreenOld = forwardRef(({paddingFactor , visible = false, onClose }, ref) => {
  const { t } = useTranslation();

  const [text, setText] = useState('');
  const [subject, setSubject] = useState('');
  const [loading, setLoading] = useState(false);
  const [dots, setDots] = useState('');
  const [section, setSection] = useState({ start: 0, end: 0 });

  const textAreaRef = useRef(null);

  /* ── Ref nach außen bereitstellen (analog zu ChangeScreen.js) ── */
  useImperativeHandle(ref, () => ({
    focus: () => {
      textAreaRef.current?.focus();
        textAreaRef.current?.setNativeProps({
        selection: { start: 0, end: 0 },
      });

      setTimeout(() => {
        textAreaRef.current?.setNativeProps({
          selection: { start: 0, end: 0 },
        });
      }, 60);
    },
    blur: () => {
      textAreaRef.current?.blur();
    },
    clear: () => {
      textAreaRef.current?.clear();
    },
    inputRef: textAreaRef.current,
  }));

  /* ── Dynamische Anpassung an die Tastaturhöhe (aus ChangeScreen.js) ── */
  // Falls die Tastatur durch CompanySearchModal bereits offen ist, greift sofort der Startwert:
  const keyboardPadding = useRef(
    new Animated.Value((Keyboard.metrics?.()?.height || 0)  )
  ).current;

  useEffect(() => {
    // Synchronisiert die Höhe sofort beim Einblenden, falls das Event vor dem Mounten lief
    if (visible) {
      const currentHeight = Keyboard.metrics?.()?.height || 0;
      if (currentHeight > 0) {
        keyboardPadding.setValue(currentHeight* paddingFactor);
      }
    }
  }, [visible, keyboardPadding]);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const onKeyboardShow = (event) => {
      Animated.timing(keyboardPadding, {
        toValue: event.endCoordinates.height * paddingFactor,
        duration: Platform.OS === 'ios' ? event.duration || 250 : 180,
        useNativeDriver: false,
      }).start();
    };

    const onKeyboardHide = (event) => {
      Animated.timing(keyboardPadding, {
        toValue: 0,
        duration: Platform.OS === 'ios' ? event?.duration || 250 : 180,
        useNativeDriver: false,
      }).start();
    };

    const subShow = Keyboard.addListener(showEvent, onKeyboardShow);
    const subHide = Keyboard.addListener(hideEvent, onKeyboardHide);

    return () => {
      subShow.remove();
      subHide.remove();
    };
  }, [keyboardPadding]);

  /* ── Text laden ── */
  useEffect(() => {
    const loadText = async () => {
      try {
        const [, , subj, myText] = await Promise.all([
          EncryptedStorage.getItem('anrede'),
          EncryptedStorage.getItem('name'),
          EncryptedStorage.getItem('subject'),
          EncryptedStorage.getItem('text'),
        ]);

        if (subj) setSubject(subj);

        if (myText) {
          const newText = myText
            .replace(/\u202F/g, ' ')
            .replace(/[\u2010-\u2015]/g, '-')
            .replace(/[\u201C\u201D\u201E]/g, '"')
            .replace(/\*/g, '')
              .replace(/\u00a0/g, ' ');
          setText(newText);
        }
      } catch (error) {
        console.error('Fehler beim Laden des Textes:', error);
      }
    };

    if (visible !== false) {
      loadText();
    }
  }, [visible]);

  const wordCount = useMemo(() => {
    if (!text.trim()) return 0;
    return text.trim().split(/\s+/).length;
  }, [text]);

  const handleGenerate = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await generate({ text, router });
    } catch (err) {
      console.error('Generierungsfehler:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Animated.View
        style={[
          styles.container,
          {
            paddingBottom: Animated.add(
              keyboardPadding,
              Platform.OS === 'ios' ? 0 : 0
            ),
          },
        ]}
      >
        <View style={styles.editorCard}>
          <View style={styles.editorHeader}>
            <View style={styles.editorHeaderLeft}>
              <MaterialIcons name="edit-note" size={20} color="#60A5FA" />
              <Text style={styles.editorHeaderText}>
                {t('changeOld.editorHeader')}
              </Text>
            </View>

            <View style={styles.editorHeaderRight}>
              <View style={styles.wordBadge}>
                <Text style={styles.wordBadgeText}>
                  {t('changeOld.wordCount', { count: wordCount })}
                </Text>
              </View>

              {onClose && (
                <TouchableOpacity
                  style={styles.closeBtn}
                  onPress={onClose}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  activeOpacity={0.7}
                >
                  <MaterialIcons name="close" size={17} color="rgba(255, 255, 255, 0.7)" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          <TextInput
            style={styles.subjectInput}
            value={subject}
            onChangeText={setSubject}
            placeholder={t('changeOld.subjectPlaceholder')}
            placeholderTextColor="rgba(255, 255, 255, 0.35)"
            multiline={false}
            returnKeyType="next"
          />

          <View style={styles.divider} />

          <TextInput
  ref={textAreaRef}
  style={styles.textArea}
  value={text}
  onChangeText={setText}
  placeholder={t('editor.placeholder')}
  placeholderTextColor="rgba(255, 255, 255, 0.35)"
  multiline={true}
  textAlignVertical="top"
  scrollEnabled={true}
  showsVerticalScrollIndicator={true}
/>
        
        </View>

        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={styles.generateButton}
            disabled={loading}
            onPress={handleGenerate}
            activeOpacity={0.85}
          >
            {loading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text style={styles.generateBtnText}>
                  {t('changeOld.creatingFolder', { dots })}
                </Text>
              </View>
            ) : (
              <View style={styles.loadingRow}>
                <MaterialIcons
                  name="picture-as-pdf"
                  size={20}
                  color="#FFFFFF"
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.generateBtnText}>
                  {t('changeOld.submitButton')}
                </Text>
                <MaterialIcons
                  name="arrow-forward"
                  size={18}
                  color="#FFFFFF"
                  style={{ marginLeft: 6 }}
                />
              </View>
            )}
          </TouchableOpacity>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
});

export default ChangeScreenOld;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
    justifyContent: 'space-between',
  },
  editorCard: {
    flex: 1,
    backgroundColor: '#171B26',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  editorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  editorHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editorHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  editorHeaderText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  wordBadge: {
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.25)',
  },
  wordBadgeText: {
    color: '#60A5FA',
    fontSize: 11,
    fontWeight: '700',
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  subjectInput: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginHorizontal: 14,
  },
  textArea: {
    flex: 1,
    padding: 14,
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 21,
  },
  actionContainer: {
    marginTop: 6,
  },
  generateButton: {
    width: '100%',
    height: 50,
    backgroundColor: '#3B82F6',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
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
  },
});