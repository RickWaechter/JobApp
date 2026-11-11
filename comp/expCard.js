import React, { memo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { ScaleDecorator } from 'react-native-draggable-flatlist';
import { getKeyword } from '../inc/ai';
export const ExperienceCard = memo(function ExperienceCard({
  item,
  drag,
  isActive,
  getIndex,
  theme,
  onUpdate,
  onRemove,
}) {
  const index = getIndex();
const [loading, setLoading] = useState(false);
const handleSend = async (item) => {
  console.log('Sending:', item);
  setLoading(true);
  const keywords = await getKeyword(item);
  onUpdate(item.id, 'description', keywords);
  setLoading(false);
}

  return (
    <ScaleDecorator activeScale={1.0}>
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
                Position #{index !== undefined ? index + 1 : ''}
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

        {/* Jobtitel */}
        <Text style={[styles.fieldLabel, { color: theme.subtext }]}>Rolle / Jobtitel</Text>
        <TextInput
          value={item.role}
          onChangeText={(t) => onUpdate(item.id, 'role', t)}
          placeholder="z.B. Mobile App Developer"
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

        {/* Firma & Zeitraum */}
        <View style={styles.row}>
          <View style={[styles.flex1, styles.mr8]}>
            <Text style={[styles.fieldLabel, { color: theme.subtext }]}>Firma</Text>
            <TextInput
              value={item.company}
              onChangeText={(t) => onUpdate(item.id, 'company', t)}
              placeholder="Unternehmen"
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
              placeholder="MM/JJ – Heute"
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

        {/* Aufgaben */}
        <Text style={[styles.fieldLabel, { color: theme.subtext }]}>Aufgaben & Erfolge</Text>
  <View style={styles.inputWrapper}>
    <TextInput
      value={item.description}
      onChangeText={(t) => onUpdate(item.id, 'description', t)}
      placeholder="Stichpunkte notieren & per ✨ in Sätze verwandeln..."
      placeholderTextColor={theme.subtext}
      multiline
      style={[
        styles.input,
        styles.textArea,
        {
          backgroundColor: theme.inputBg,
          color: theme.text,
          borderColor: theme.border,
          paddingBottom: 40, // Platzhalter unten, damit langer Text nicht hinter dem Button verschwindet
          paddingRight: 45,
        },
      ]}
    />

    <TouchableOpacity
      style={[
        styles.sendButton,
        { backgroundColor: theme.primary || '#007AFF' },
      ]}
      onPress={() => handleSend(item)}
      disabled={loading || !item.description?.trim()}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator size="small" color="#fff" />
      ) : (
        <Text style={styles.sendButtonText}>✨</Text>
        // Oder ein Vektor-Icon, z. B.: <Ionicons name="send" size={16} color="#fff" />
      )}
    </TouchableOpacity>
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
  inputWrapper: {
    position: 'relative',
    width: '100%',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
  },
  textArea: {
    minHeight: 110,
    textAlignVertical: 'top', // Wichtig für Android, damit der Text oben startet
  },
  sendButton: {
    position: 'absolute',
    right: 8,
    bottom: 15,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2, // Android Schatten
    shadowColor: '#000', // iOS Schatten
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  sendButtonText: {
    color: '#fff',
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
  textArea: {
    minHeight: 70,
    textAlignVertical: 'top',
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