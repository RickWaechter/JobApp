import React, { memo } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { ScaleDecorator } from 'react-native-draggable-flatlist';
import { useTheme } from './themeContext';
import { useThemedStyles } from './themeStyles';

export const EducationCard = memo(function EducationCard({
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

  return (
    <ScaleDecorator activeScale={1.02}>
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
                Abschluss #{index !== undefined ? index + 1 : ''}
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

        {/* Abschluss / Titel */}
        <Text style={styles.fieldLabel}>Abschluss / Zertifikat</Text>
        <TextInput
          value={item.degree}
          onChangeText={(t) => onUpdate(item.id, 'degree', t)}
          placeholder="z.B. B.Sc. Informatik"
          placeholderTextColor={colors.textDim}
          style={styles.input}
        />

        {/* Schule & Zeitraum */}
        <View style={styles.row}>
          <View style={[styles.flex1, styles.mr8]}>
            <Text style={styles.fieldLabel}>Schule / Universität</Text>
            <TextInput
              value={item.school}
              onChangeText={(t) => onUpdate(item.id, 'school', t)}
              placeholder="Einrichtung"
              placeholderTextColor={colors.textDim}
              style={styles.input}
            />
          </View>

          <View style={styles.periodInputWrap}>
            <Text style={styles.fieldLabel}>Zeitraum</Text>
            <TextInput
              value={item.period}
              onChangeText={(t) => onUpdate(item.id, 'period', t)}
              placeholder="JJJJ – JJJJ"
              placeholderTextColor={colors.textDim}
              style={styles.input}
            />
          </View>
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