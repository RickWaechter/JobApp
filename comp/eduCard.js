import React, { memo } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { ScaleDecorator } from 'react-native-draggable-flatlist';

export const EducationCard = memo(function EducationCard({
  item,
  drag,
  isActive,
  getIndex,
  theme,
  onUpdate,
  onRemove,
}) {
  const index = getIndex();

  return (
    <ScaleDecorator activeScale={1.02}>
      <View
        style={[
          styles.entryCard,
          {
            backgroundColor: theme.card,
            borderColor: isActive ? theme.primary : theme.border,
          },
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
            <View
              style={[
                styles.dragGripIconWrap,
                {
                  backgroundColor: theme.badgeBg,
                  borderColor: theme.border,
                },
              ]}
            >
              <Text style={[styles.dragGripIcon, { color: theme.primary }]}>☰</Text>
            </View>
            <View>
              <Text style={[styles.entryCardBadgeText, { color: theme.text }]}>
                Abschluss #{index !== undefined ? index + 1 : ''}
              </Text>
              <Text style={[styles.dragHintText, { color: theme.subtext }]}>
                Halten & Ziehen
              </Text>
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
        <Text style={[styles.fieldLabel, { color: theme.subtext }]}>Abschluss / Zertifikat</Text>
        <TextInput
          value={item.degree}
          onChangeText={(t) => onUpdate(item.id, 'degree', t)}
          placeholder="z.B. B.Sc. Informatik"
          placeholderTextColor={theme.subtext}
          style={[
            styles.input,
            {
              backgroundColor: theme.inputBg,
              color: theme.text,
              borderColor: theme.border,
            },
          ]}
        />

        {/* Schule & Zeitraum */}
        <View style={styles.row}>
          <View style={[styles.flex1, styles.mr8]}>
            <Text style={[styles.fieldLabel, { color: theme.subtext }]}>Schule / Universität</Text>
            <TextInput
              value={item.school}
              onChangeText={(t) => onUpdate(item.id, 'school', t)}
              placeholder="Einrichtung"
              placeholderTextColor={theme.subtext}
              style={[
                styles.input,
                {
                  backgroundColor: theme.inputBg,
                  color: theme.text,
                  borderColor: theme.border,
                },
              ]}
            />
          </View>

          <View style={styles.periodInputWrap}>
            <Text style={[styles.fieldLabel, { color: theme.subtext }]}>Zeitraum</Text>
            <TextInput
              value={item.period}
              onChangeText={(t) => onUpdate(item.id, 'period', t)}
              placeholder="JJJJ – JJJJ"
              placeholderTextColor={theme.subtext}
              style={[
                styles.input,
                {
                  backgroundColor: theme.inputBg,
                  color: theme.text,
                  borderColor: theme.border,
                },
              ]}
            />
          </View>
        </View>
      </View>
    </ScaleDecorator>
  );
});

const styles = StyleSheet.create({
  entryCard: {
    padding: 15,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  entryCardActive: {
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
    borderBottomColor: 'rgba(255, 220, 190, 0.07)',
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
  },
  dragGripIcon: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  entryCardBadgeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  dragHintText: {
    fontSize: 10,
    fontWeight: '500',
  },
  deleteButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(248, 113, 113, 0.10)',
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.40)',
  },
  deleteButtonText: {
    color: '#F87171',
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
  },
  input: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 13.5,
    marginBottom: 8,
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