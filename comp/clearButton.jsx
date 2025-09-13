import React, { useEffect } from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import MaterialIcons from '@react-native-vector-icons/material-icons';

const ClearButton = ({ value, setValue, top = 16 }) => {
  const [isFocused, setIsFocused] = React.useState(false);
  const [tempValue, setTempValue] = React.useState(value);
  if (!value) return null;
  useEffect(() => {
    setTempValue(value);
  }
  , [value]);
  return (
    
    <TouchableOpacity onPress={() => {setValue(''); setIsFocused(true);}} style={[styles.clearButton, { top }]}>
      <MaterialIcons name="cancel" size={25} color="gray" />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  clearButton: {
    position: 'absolute',
    right: 12,
    padding: 5,
    zIndex: 1,
  },
});

export default ClearButton;