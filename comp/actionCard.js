import React, { memo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MaterialIcons from '@react-native-vector-icons/material-icons';
import { useTheme } from './themeContext';
import { useThemedStyles } from './themeStyles';
import { font } from '../inc/style';

/* ── Document Action Card ───────────────────────────────── */
export const DocumentActionCard = memo(
  ({
    title,
    onIconPress,
    description,
    iconName,
    onPress,
    isPrimary = false,
    badgeText,
    style,
  }) => {
    const { colors } = useTheme();
    const styles = useThemedStyles(createStyles);

    const leadingIconColor = isPrimary
      ? colors.textOnPrimary || '#FFFFFF'
      : colors.accentText || colors.primary || '#3B82F6';

    const chevronColor = isPrimary
      ? colors.accentText || colors.primary || '#3B82F6'
      : colors.textMuted || '#94A3B8';

    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.actionCard,
          isPrimary && styles.primaryActionCard,
          style,
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
              color={leadingIconColor}
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
          <Text style={styles.cardDescription} numberOfLines={3}>
            {description}
          </Text>
        </View>

        <MaterialIcons
          name="chevron-right"
          size={22}
          color={chevronColor}
        />
      </Pressable>
    );
  }
);

/* ── Primary Action Card ────────────────────────────────── */
export const PrimaryActionCard = memo(
  ({
    title,
    description,
    badgeText,
    footerText,
    iconName = 'auto-awesome',
    onPress,
    onIconPress,
    disabled,
    style,
  }) => {
    const { colors } = useTheme();
    const styles = useThemedStyles(createStyles);

    return (
      <Pressable
        onPress={onPress}
        disabled={disabled}
        style={({ pressed }) => [
          styles.primaryCard,
          style,
          pressed && !disabled && styles.cardPressed,
          disabled && { opacity: 0.8 },
        ]}
      >
        <View style={styles.primaryGlowEffect} />

        <View style={styles.primaryTopRow}>
          <View style={styles.primaryBigIconContainer}>
            <Pressable
              disabled={disabled}
              onPress={(e) => {
                e?.stopPropagation?.();
                onIconPress?.();
              }}
              hitSlop={10}
              style={({ pressed }) => pressed && !disabled && { opacity: 0.7 }}
            >
              <MaterialIcons
                name={iconName}
                size={24}
                color={colors.textOnPrimary || '#FFFFFF'}
              />
            </Pressable>
          </View>

          {Boolean(badgeText) && (
            <View style={styles.badgePrimary}>
              <Text style={styles.badgePrimaryText}>{badgeText}</Text>
            </View>
          )}
        </View>

        <View style={styles.cardContent}>
          <Text style={styles.primaryBigCardTitle}>{title}</Text>
          <Text style={styles.primaryCardDescription} numberOfLines={2}>
            {description}
          </Text>
        </View>

        <View style={styles.primaryFooter}>
          <Text style={styles.primaryFooterText}>{footerText}</Text>
          <View style={styles.arrowCircle}>
            <MaterialIcons
              name="arrow-forward"
              size={16}
              color={colors.textOnPrimary || '#FFFFFF'}
            />
          </View>
        </View>
      </Pressable>
    );
  }
);

/* ── Secondary Action Card ──────────────────────────────── */
export const SecondaryActionCard = memo(
  ({
    title,
    description,
    iconName = 'history',
    onPress,
    onIconPress,
    isLoading,
    disabled,
    style,
  }) => {
    const { colors } = useTheme();
    const styles = useThemedStyles(createStyles);

    return (
      <Pressable
        onPress={onPress}
        disabled={disabled || isLoading}
        style={({ pressed }) => [
          styles.secondaryCard,
          style,
          pressed && !disabled && styles.cardPressed,
          (isLoading || disabled) && { opacity: 0.7 },
        ]}
      >
        <View style={styles.secondaryIconContainer}>
          {isLoading ? (
            <ActivityIndicator size="small" color={colors.textMain} />
          ) : (
            <Pressable
              disabled={disabled}
              onPress={(e) => {
                e?.stopPropagation?.();
                onIconPress?.();
              }}
              hitSlop={10}
              style={({ pressed }) => pressed && !disabled && { opacity: 0.7 }}
            >
              <MaterialIcons
                name={iconName}
                size={24}
                color={colors.textMain}
              />
            </Pressable>
          )}
        </View>

        <View style={styles.secondaryTextWrap}>
          <Text style={styles.secondaryCardTitle}>{title}</Text>
          <Text style={styles.secondaryCardDescription} numberOfLines={2}>
            {description}
          </Text>
        </View>

        <MaterialIcons
          name="chevron-right"
          size={22}
          color={colors.textMuted}
        />
      </Pressable>
    );
  }
);

/* ── Settings Card ──────────────────────────────────────── */
export const SettingsCard = memo(
  ({ onIconPress, title, description, iconName, onPress, badgeText, style }) => {
    const { colors } = useTheme();
    const styles = useThemedStyles(createStyles);

    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.settingsCard,
          style,
          pressed && styles.settingsCardPressed,
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={(e) => {
            e?.stopPropagation?.();
            onIconPress?.();
          }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <View style={styles.settingsIconWrap}>
            <MaterialIcons
              name={iconName}
              size={22}
              color={colors.accentText || colors.primary || '#60A5FA'}
            />
          </View>
        </TouchableOpacity>

        <View style={styles.settingsContent}>
          <View style={styles.settingsTitleRow}>
            <Text style={styles.settingsTitle} numberOfLines={1}>
              {title}
            </Text>
            {Boolean(badgeText) && (
              <View style={styles.settingsInlineBadge}>
                <Text style={styles.settingsInlineBadgeText}>{badgeText}</Text>
              </View>
            )}
          </View>
          {Boolean(description) && (
            <Text style={styles.settingsDescription} numberOfLines={1}>
              {description}
            </Text>
          )}
        </View>

        <MaterialIcons
          name="chevron-right"
          size={22}
          color={colors.textMuted || 'rgba(255, 255, 255, 0.3)'}
        />
      </Pressable>
    );
  }
);

export default DocumentActionCard;

/* ── Styles ─────────────────────────────────────────────── */
const createStyles = (colors, fontSize) => ({
  /* ── Shared ── */
  cardPressed: {
    transform: [{ scale: 0.985 }],
    opacity: 0.9,
  },

  /* ── DocumentActionCard ── */
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.actionCard,
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.actionCardBorder,
    shadowColor: colors.shadow || '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: colors.shadowOpacity ?? 0.1,
    shadowRadius: 8,
    elevation: colors.elevation ?? 2,
  },
  primaryActionCard: {
    backgroundColor: colors.actionCard || 'rgba(59, 130, 246, 0.12)',
    borderColor: colors.actionCardBorder || 'rgba(59, 130, 246, 0.35)',
    shadowColor: colors.primary || '#3B82F6',
    shadowOpacity: colors.primaryShadowOpacity ?? 0.15,
    shadowRadius: 12,
    elevation: colors.primaryElevation ?? 3,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.iconBg || 'rgba(59, 130, 246, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  primaryIconContainer: {
    backgroundColor: colors.primary || '#3B82F6',
  },
  cardTextContainer: {
    flex: 1,
    paddingRight: 8,
    alignItems: 'flex-start',
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 3,
  },
  cardTitle: {
    color: colors.titleMain,
    fontSize: font.cardHeadline,
    fontWeight: '700',
  },
  primaryCardTitle: {
    fontWeight: '800',
  },
  inlineBadge: {
    backgroundColor: colors.badgeBg || 'rgba(59, 130, 246, 0.16)',
    borderWidth: 1,
    borderColor: colors.badgeBorder || 'rgba(59, 130, 246, 0.35)',
    paddingVertical: 2,
    paddingHorizontal: 7,
    borderRadius: 6,
  },
  inlineBadgeText: {
    color: colors.subTitleMain,
    fontSize: fontSize?.badgeText,
    fontWeight: '700',
  },
  cardDescription: {
    color: colors.subTitleMain,
    fontSize: font.cardSubline,
    lineHeight: 17,
  },

  /* ── PrimaryActionCard ── */
  primaryCard: {
    position: 'relative',
    backgroundColor: colors.actionCard,
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.35)',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
    overflow: 'hidden',
  },
  primaryGlowEffect: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
  },
  primaryTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  primaryBigIconContainer: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: colors.primary || '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  badgePrimary: {
    backgroundColor: 'rgba(59, 130, 246, 0.18)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  badgePrimaryText: {
    color: '#60A5FA',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  cardContent: {
    marginBottom: 16,
  },
  primaryBigCardTitle: {
    color: colors.titleMain || '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 6,
  },
  primaryCardDescription: {
    color: colors.subTitleMain || 'rgba(255, 255, 255, 0.6)',
    fontSize: 13.5,
    lineHeight: 19,
  },
  primaryFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  primaryFooterText: {
    color: colors.titleMain || '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '600',
  },
  arrowCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* ── SecondaryActionCard ── */
  secondaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.actionCard,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.actionCardBorder || 'rgba(255, 255, 255, 0.08)',
  },
  secondaryIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.iconBg || 'rgba(255, 255, 255, 0.06)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  secondaryTextWrap: {
    flex: 1,
    paddingRight: 8,
  },
  secondaryCardTitle: {
    color: colors.titleMain || '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 3,
  },
  secondaryCardDescription: {
    color: colors.subTitleMain || 'rgba(255, 255, 255, 0.45)',
    fontSize: 12.5,
    lineHeight: 17,
  },

  /* ── SettingsCard ── */
  settingsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  settingsCardPressed: {
    backgroundColor: colors.pressedBg || 'rgba(255, 255, 255, 0.05)',
  },
  settingsIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.iconBg || 'rgba(59, 130, 246, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  settingsContent: {
    flex: 1,
    paddingRight: 8,
  },
  settingsTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  settingsTitle: {
    color: colors.titleMain || '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  settingsInlineBadge: {
    backgroundColor: colors.badgeBg || 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 6,
  },
  settingsInlineBadgeText: {
    color: colors.subTitleMain || 'rgba(255, 255, 255, 0.8)',
    fontSize: 11,
    fontWeight: '700',
  },
  settingsDescription: {
    color: colors.subTitleMain || 'rgba(255, 255, 255, 0.45)',
    fontSize: 12,
    marginTop: 2,
  },
});