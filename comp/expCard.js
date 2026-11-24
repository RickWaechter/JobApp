import React, { memo, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { ScaleDecorator } from 'react-native-draggable-flatlist';
import { getKeyword } from '../inc/ai';
import { useTheme } from './themeContext';
import { useThemedStyles } from './themeStyles';

export const ExperienceCard = memo(function ExperienceCard({
  item,
  drag,
  isActive,
  getIndex,
  onUpdate,
  onRemove,
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const index = getIndex();
  const [loading, setLoading] = useState(false);

  const handleSend = async (entry) => {
    if (!entry.role) return;
    setLoading(true);
    const keywords = await getKeyword(entry);
    onUpdate(entry.id, 'description', keywords);
    setLoading(false);
  };

  return (
    <ScaleDecorator activeScale={1.0}>
      <View
        style={[
          styles.entryCard,
          isActive && styles.entryCardActive,
        ]}
      >
        {/* Header mit Drag-Handle & Löschen */}
        <View style={styles.entryCardHeader}>
          <TouchableOpacity
            onLongPress={drag}
            delayLongPress={100}
            style={styles.dragHandle}
            activeOpacity={0.7}
          >
            <View style={styles.dragGripIconWrap}>
              <Text style={styles.dragGripIcon}>☰</Text>
            </View>
            <View>
              <Text style={styles.entryCardBadgeText}>
                Position #{index !== undefined ? index + 1 : ''}
              </Text>
              <Text style={styles.dragHintText}>Halten & Ziehen</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => onRemove(item.id)}
            style={styles.deleteButton}
            activeOpacity={0.7}
          >
            <Text style={styles.deleteButtonText}>✕ Löschen</Text>
          </TouchableOpacity>
        </View>

        {/* Jobtitel */}
        <Text style={styles.fieldLabel}>Rolle / Jobtitel</Text>
        <TextInput
          value={item.role}
          onChangeText={(t) => onUpdate(item.id, 'role', t)}
          placeholder="z.B. Mobile App Developer"
          placeholderTextColor={colors.textDim}
          style={styles.input}
        />

        {/* Firma & Zeitraum */}
        <View style={styles.row}>
          <View style={[styles.flex1, styles.mr8]}>
            <Text style={styles.fieldLabel}>Firma</Text>
            <TextInput
              value={item.company}
              onChangeText={(t) => onUpdate(item.id, 'company', t)}
              placeholder="Unternehmen"
              placeholderTextColor={colors.textDim}
              style={styles.input}
            />
          </View>

          <View style={styles.periodInputWrap}>
            <Text style={styles.fieldLabel}>Zeitraum</Text>
            <TextInput
              value={item.period}
              onChangeText={(t) => onUpdate(item.id, 'period', t)}
              placeholder="MM/JJ – Heute"
              placeholderTextColor={colors.textDim}
              style={styles.input}
            />
          </View>
        </View>

        {/* Aufgaben */}
        <Text style={styles.fieldLabel}>Aufgaben & Erfolge</Text>
        <View style={styles.inputWrapper}>
          <TextInput
            value={item.description}
            onChangeText={(t) => onUpdate(item.id, 'description', t)}
            placeholder="Stichpunkte notieren & per ✨ in Sätze verwandeln..."
            placeholderTextColor={colors.textDim}
            multiline
            style={[styles.input, styles.textArea]}
          />

          <TouchableOpacity
            style={styles.sendButton}
            onPress={() => handleSend(item)}
            disabled={loading}
            activeOpacity={0.7}
          >
            {loading ? (
              <ActivityIndicator size="small" color={colors.textOnPrimary} />
            ) : (
              <Text style={styles.sendButtonText}>✨</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </ScaleDecorator>
  );
});

const createStyles = (colors) => ({
  entryCard: {
    padding: 15,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 14,
    backgroundColor: colors.actionCard,
    borderColor: colors.actionCardBorder,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: colors.shadowOpacity ?? 0.25,
    shadowRadius: 6,
    elevation: colors.elevation ?? 3,
  },
  entryCardActive: {
    borderColor: colors.primary,
    shadowOpacity: 0.45,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  entryCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  inputWrapper: {
    position: 'relative',
    width: '100%',
  },
  input: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 13.5,
    marginBottom: 8,
    backgroundColor: colors.inputBg,
    color: colors.titleMain,
    borderColor: colors.inputBorder,
  },
  textArea: {
    minHeight: 110,
    textAlignVertical: 'top',
    paddingBottom: 40,
    paddingRight: 45,
  },
  sendButton: {
    position: 'absolute',
    right: 8,
    bottom: 15,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 1.5,
  },
  sendButtonText: {
    color: colors.textOnPrimary,
    fontSize: 14,
    fontWeight: 'bold',
  },
  dragHandle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dragGripIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 7,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.badgeBg,
    borderColor: colors.actionCardBorder,
  },
  dragGripIcon: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.accentText,
  },
  entryCardBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.titleMain,
  },
  dragHintText: {
    fontSize: 10,
    fontWeight: '500',
    color: colors.subTitleMain,
  },
  deleteButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: colors.errorBg,
    borderWidth: 1,
    borderColor: colors.errorBorder,
  },
  deleteButtonText: {
    color: colors.iconClear,
    fontSize: 11,
    fontWeight: '700',
  },
  fieldLabel: {
    fontSize: 11.5,
    fontWeight: '600',
    marginBottom: 4,
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    color: colors.subTitleMain,
  },
  row: {
    flexDirection: 'row',
  },
  flex1: {
    flex: 1,
  },
  mr8: {
    marginRight: 8,
  },
  periodInputWrap: {
    width: '38%',
  },
});