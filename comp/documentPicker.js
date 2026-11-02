// comp/ServerSuffixPicker.js (bzw. comp/documentPicker.js)
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet } from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';

export const EMAIL_SERVERS_SHORT = [
  // Beliebteste deutsche Provider
  { label: '@gmail.com', value: 'smtp.gmail.com' },
  { label: '@web.de', value: 'smtp.web.de' },
  { label: '@gmx.net', value: 'smtp.gmx.net' },
  { label: '@t-online.de', value: 'securesmtp.t-online.de' },
  { label: '@mail.de', value: 'smtp.mail.de' },
  { label: '@freenet.de', value: 'mx.freenet.de' },
  
  // Microsoft (Outlook / Hotmail / Live)
  { label: '@outlook.de', value: 'smtp-mail.outlook.com' },
  { label: '@outlook.com', value: 'smtp.office365.com' },
  { label: '@hotmail.com', value: 'smtp.live.com' },

  // Apple & International
  { label: '@icloud.com', value: 'smtp.mail.me.com' },
  { label: '@yahoo.de', value: 'smtp.mail.yahoo.de' },
  { label: '@yahoo.com', value: 'smtp.mail.yahoo.com' },
  { label: '@aol.de', value: 'smtp.de.aol.com' },
  { label: '@aol.com', value: 'smtp.aol.com' },
  { label: '@googlemail.com', value: 'smtp.googlemail.com' },


  // Datenschutz- & Regionale Provider (DE / AT / CH)
  { label: '@posteo.de', value: 'posteo.de' },
  { label: '@mailbox.org', value: 'smtp.mailbox.org' },
  { label: '@vodafone.de', value: 'smtp.vodafone.de' },
  { label: '@bluewin.ch', value: 'smtpauths.bluewin.ch' },
];
export const EMAIL_SERVERS_FULL = [
  { label: 'smtp.mail.de', value: 'smtp.mail.de' },
  { label: 'Smtp.web.de', value: 'Smtp.web.de' },
  { label: 'Securesmtp.t-online.de', value: 'Securesmtp.t-online.de' },
  { label: 'Smtp.gmail.com', value: 'Smtp.gmail.com' },
];

// Hilfsfunktion: Berechnet die Breite anhand der Zeichenanzahl
const calcTargetWidth = (text) => {
  const charCount = (text || '').length;
  const ICON_AND_PADDING_OFFSET = 26; // Platz für Pfeil-Icon (16px) + Padding
  return charCount * 10 + ICON_AND_PADDING_OFFSET;
};

const DocPicker = memo(
  ({
    items = EMAIL_SERVERS_SHORT,
    placeholder = 'Server',
    disabled = false,

    /* kontrolliert (optional) */
    open: openProp,
    setOpen: setOpenProp,
    value: valueProp,
    setValue: setValueProp,
  }) => {
    /* ── open: kontrolliert, sonst interner State ── */
    const isOpenControlled = openProp !== undefined && setOpenProp !== undefined;
    const [internalOpen, setInternalOpen] = useState(false);
    const open = isOpenControlled ? openProp : internalOpen;
    const setOpen = isOpenControlled ? setOpenProp : setInternalOpen;

    /* ── value: kontrolliert, sonst interner State ── */
    const isValueControlled = valueProp !== undefined && setValueProp !== undefined;
    const [internalValue, setInternalValue] = useState('smtp.mail.de');
    const value = isValueControlled ? valueProp : internalValue;
    const setValue = isValueControlled ? setValueProp : setInternalValue;

    /* ── Aktuelles Label ermitteln (falls nichts gewählt -> placeholder) ── */
    const currentLabel = useMemo(() => {
      const found = items.find((item) => item.value === value);
      return found ? found.label : placeholder;
    }, [items, value, placeholder]);

    /* ── Animated.Value für die Breite ── */
    const animatedWidth = useRef(
      new Animated.Value(calcTargetWidth(currentLabel))
    ).current;

    /* ── Bei Änderung des gewählten Anbieters Breite animieren ── */
    useEffect(() => {
      const nextWidth = calcTargetWidth(currentLabel);

      Animated.timing(animatedWidth, {
        toValue: nextWidth,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false, // WICHTIG: Muss für 'width' zwingend false sein!
      }).start();
    }, [currentLabel, animatedWidth]);

    /* ── bei Auswahl automatisch schließen ── */
    const handleSetValue = useCallback(
      (cb) => {
        const next = typeof cb === 'function' ? cb(value) : cb;
        setValue(next);
        setOpen(false);
      },
      [setOpen, setValue, value]
    );

    return (
      <Animated.View
        style={[
          styles.wrapper,
          {
            width: animatedWidth, // <-- Animierte Breite sitzt auf dem Wrapper
            zIndex: open ? 6000 : 10,
          },
        ]}
      >
        <DropDownPicker
          open={open}
          setOpen={setOpen}
          value={value}
          setValue={handleSetValue}
          items={items}
          placeholder={placeholder}
          disabled={disabled}
          searchable={false}
          zIndex={6000}
          zIndexInverse={1000}
          /* ── Füllt die animierte Breite der Eltern-Animated.View zu 100% aus ── */
          containerStyle={styles.pickerContainer}
          style={styles.picker}
          textStyle={styles.pickerText}
          labelStyle={styles.pickerText}
          labelProps={{ numberOfLines: 1 }}
          placeholderStyle={styles.pickerPlaceholder}
          arrowIconStyle={styles.pickerArrow}
          tickIconStyle={styles.pickerTick}
          /* ── Aufgeklapptes Menü behält eine feste Mindestbreite, damit lange Einträge reinpassen ── */
          dropDownContainerStyle={styles.pickerDropDown}
          listItemContainerStyle={styles.listItem}
          listItemLabelStyle={styles.listLabel}
          selectedItemContainerStyle={styles.itemSelected}
          selectedItemLabelStyle={styles.itemSelectedLabel}
        />
      </Animated.View>
    );
  }
);

const styles = StyleSheet.create({
  wrapper: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerContainer: {
    width: '100%',
    borderLeftWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.1)',
  
  },
  /* ── geschlossenes Feld (sitzt nahtlos im ModalInput) ── */
  picker: {
    width: '100%',
    height: 36,
    minHeight: 36,
    borderWidth: 0,
    borderRadius: 10,
    backgroundColor: 'transparent',
    paddingHorizontal: 8,
    paddingVertical: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },
  /* ── Exakt gleiche Schrift & Größe wie styles.textInputField (14.5) ── */
  pickerText: {
    fontSize: 14.5,
    fontWeight: '400',
    color: '#FFFFFF',
    flexShrink: 1,
  },
  pickerPlaceholder: {
    fontSize: 14.5,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.35)',
    flexShrink: 1,
  },
  pickerArrow: {
    tintColor: 'rgba(255, 255, 255, 0.55)',
    width: 16,
    height: 16,
    marginLeft: 2,
  },
  pickerTick: {
    tintColor: '#3B82F6',
    width: 16,
    height: 16,
  },
  /* ── Aufgeklappte Liste ── */
  pickerDropDown: {
    width: 120, // Feste Breite für das aufgeklappte Menü, damit "@t-online.de" immer Platz hat
    backgroundColor: '#1A1E29',
    borderColor: 'rgba(255, 255, 255, 0.14)',
    borderWidth: 1,
    borderRadius: 12,
    maxHeight: 100,
    marginTop: 6,
    paddingVertical: 4,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  listItem: {
    height: 38,
  },
  listLabel: {
    fontSize: 14.5,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.85)',
  },
  itemSelected: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
  },
  itemSelectedLabel: {
    fontSize: 14.5,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});

export default DocPicker;