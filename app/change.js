// ChangeScreen.js
import MaterialIcons from '@react-native-vector-icons/material-icons';
import { router } from 'expo-router';
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useFocusEffect } from 'expo-router';
import { InteractionManager } from 'react-native';
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
import EncryptedStorage from 'react-native-encrypted-storage';
import { SafeAreaView } from 'react-native-safe-area-context';

import { downloader } from '../inc/downloader.js';
import { generate } from '../inc/generate.js';

const ChangeScreen = forwardRef(({ visible, onClose }, ref) => {
  const { t } = useTranslation();

  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [section, setSection] = useState({ start: 0, end: 0 });

  const inputRef = useRef(null);
  const currentTextRef = useRef('');
  currentTextRef.current = text;

  /* ── Ref nach außen bereitstellen ── */
  useImperativeHandle(ref, () => ({
    focus: () => {
      inputRef.current?.focus();

      inputRef.current?.setNativeProps({
        selection: { start: 0, end: 0 },
      });

      setTimeout(() => {
        inputRef.current?.setNativeProps({
          selection: { start: 0, end: 0 },
        });
      }, 60);
    },
    blur: () => {
      inputRef.current?.blur();
    },
  }));

  /* ── Dynamische Anpassung an die Tastaturhöhe ── */
  const keyboardPadding = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const onKeyboardShow = (event) => {
      Animated.timing(keyboardPadding, {
        toValue: event.endCoordinates.height * 0.9,
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

  /* ── Text laden & Persistenz ── */
  useEffect(() => {
    const loadText = async () => {
      try {

       const [
  anredeRaw,
  nameRaw,
  myText,
  savedEditedText,
  closing,
] = await Promise.all([
  EncryptedStorage.getItem('anrede'),
  EncryptedStorage.getItem('name'),
  EncryptedStorage.getItem('text'),
  EncryptedStorage.getItem('editedCoverLetter'),
  EncryptedStorage.getItem('closing'),
]);

const anrede = anredeRaw || '';
const name = nameRaw || '';
        console.log("myText", myText);

        if (myText) {
          const composed = `${anrede}\n\n${myText}\n\n${closing}\n\n${name}`.trim();
          console.log("composed", composed);
          setText(composed);
          console.log("text", text);
          currentTextRef.current = composed;
          await EncryptedStorage.setItem('editedCoverLetter', composed);
        } else if (savedEditedText) {
          setText(savedEditedText);
          currentTextRef.current = savedEditedText;
        }
      } catch (error) {
        console.error('Error loading text in ChangeScreen:', error);
      }
    };

    if (visible !== false) {
      loadText();
    }

    return () => {
      if (currentTextRef.current) {
        EncryptedStorage.setItem('editedCoverLetter', currentTextRef.current).catch(() => {});
      }
    };
  }, [visible]);
/* ── Tastatur nach Screen-Wechsel sofort wieder herholen ── */


  const handleTextChange = useCallback((newText) => {
    setText(newText);
    currentTextRef.current = newText;
    EncryptedStorage.setItem('editedCoverLetter', newText).catch(() => {});
  }, []);

  const wordCount = useMemo(() => {
    if (!text.trim()) return 0;
    return text.trim().split(/\s+/).length;
  }, [text]);

  /* ── PDF Generierung & Weiterleitung per Button ── */
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
                {t('editor.headerTitle')}
              </Text>
            </View>

            <View style={styles.editorHeaderRight}>
              <View style={styles.wordBadge}>
                <Text style={styles.wordBadgeText}>
                  {t('editor.wordCount', { count: wordCount })}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.closeBtn}
                onPress={onClose}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                activeOpacity={0.7}
              >
                <MaterialIcons name="close" size={17} color="rgba(255, 255, 255, 0.7)" />
              </TouchableOpacity>
            </View>
          </View>

          <TextInput
  ref={inputRef}
  style={styles.textArea}
  value={text}
  onChangeText={handleTextChange}
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
                <ActivityIndicator style={{ marginRight: 8 }} size="small" color="#FFFFFF" />
                <Text style={styles.generateBtnText}>
                  {t('editor.creatingFolder')}
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
                  {t('editor.generateButton')}
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

export default ChangeScreen;

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