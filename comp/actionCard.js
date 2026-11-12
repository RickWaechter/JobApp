import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import MaterialIcons from '@react-native-vector-icons/material-icons';

export const DocumentActionCard = memo(
  ({
    title,
    onIconPress,
    description,
    iconName,
    onPress,
    isPrimary = false,
    badgeText,
  }) => (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionCard,
        isPrimary && styles.primaryActionCard,
        pressed && styles.cardPressed,
      ]}
    >
      <View
        style={[
          styles.iconContainer,
          isPrimary && styles.primaryIconContainer,
        ]}
      >
        <Pressable
          onPress={(e) => {
            e?.stopPropagation?.();
            onIconPress?.();
          }}
        >
          <MaterialIcons
            name={iconName}
            size={22}
            color={isPrimary ? '#FFFFFF' : '#60A5FA'}
          />
        </Pressable>
      </View>

      <View style={styles.cardTextContainer}>
        <View style={styles.cardTitleRow}>
          <Text
            style={[styles.cardTitle, isPrimary && styles.primaryCardTitle]}
            numberOfLines={1}
          >
            {title}
          </Text>
          {Boolean(badgeText) && (
            <View style={styles.inlineBadge}>
              <Text style={styles.inlineBadgeText}>{badgeText}</Text>
            </View>
          )}
        </View>
        <Text style={styles.cardDescription} numberOfLines={2}>
          {description}
        </Text>
      </View>

      <MaterialIcons
        name="chevron-right"
        size={22}
        color={
          isPrimary ? 'rgba(255,255,255,0.7)' : 'rgba(255, 255, 255, 0.3)'
        }
      />
    </Pressable>
  )
);

export default DocumentActionCard;

const styles = StyleSheet.create({
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#171B26',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryActionCard: {
    backgroundColor: 'rgba(59, 130, 246, 0.14)',
    borderColor: 'rgba(59, 130, 246, 0.4)',
    shadowColor: '#3B82F6',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 5,
  },
  cardPressed: {
    transform: [{ scale: 0.985 }],
    opacity: 0.9,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  primaryIconContainer: {
    backgroundColor: '#3B82F6',
  },
  cardTextContainer: {
    flex: 1,
    paddingRight: 8,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 3,
  },
  cardTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  primaryCardTitle: {
    fontWeight: '800',
  },
  inlineBadge: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.35)',
    paddingVertical: 2,
    paddingHorizontal: 7,
    borderRadius: 6,
  },
  inlineBadgeText: {
    color: '#93C5FD',
    fontSize: 10.5,
    fontWeight: '700',
  },
  cardDescription: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12.5,
    lineHeight: 17,
  },
});