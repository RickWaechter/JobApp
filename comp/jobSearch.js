import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Keyboard,
} from 'react-native';
import MaterialIcons from '@react-native-vector-icons/material-icons';

const JobSearch = ({ onSearch, loading }) => {
  const [jobTitle, setJobTitle] = useState('Programmierer');
  const [locationText, setLocationText] = useState('Stuttgart');
  const [locating, setLocating] = useState(false);

  // GPS-Koordinaten holen & per OpenStreetMap (Nominatim) in Stadt umwandeln
  const handleLocateMe = async () => {
   
  };

  const triggerSearch = () => {
    Keyboard.dismiss();
    onSearch({
      was: jobTitle.trim(),
      wo: locationText.trim(),
    });
  };

  return (
    <View style={styles.container}>
      {/* Reihe 1: Breites Suchfeld für Jobtitel */}
      <View style={styles.jobInputWrapper}>
        <MaterialIcons name="search" size={20} color="#38bdf8" style={styles.iconLeft} />
        <TextInput
          style={styles.jobInput}
          value={jobTitle}
          onChangeText={setJobTitle}
          placeholder="Jobtitel, Beruf oder Stichwort..."
          placeholderTextColor="#64748b"
          returnKeyType="search"
          onSubmitEditing={triggerSearch}
        />
        {jobTitle.length > 0 && (
          <TouchableOpacity onPress={() => setJobTitle('')} hitSlop={8}>
            <MaterialIcons name="close" size={18} color="#64748b" />
          </TouchableOpacity>
        )}
      </View>

      {/* Reihe 2: Kleineres Ortsfeld + GPS-Button + Suchen-Button */}
      <View style={styles.bottomRow}>
        <View style={styles.locationInputWrapper}>
          <MaterialIcons name="place" size={18} color="#94a3b8" style={styles.iconLeft} />
          <TextInput
            style={styles.locationInput}
            value={locationText}
            onChangeText={setLocationText}
            placeholder="Ort oder PLZ"
            placeholderTextColor="#64748b"
            returnKeyType="search"
            onSubmitEditing={triggerSearch}
          />
          <TouchableOpacity
            style={styles.gpsButton}
            onPress={handleLocateMe}
            disabled={locating}
            activeOpacity={0.7}
          >
            {locating ? (
              <ActivityIndicator size="small" color="#38bdf8" />
            ) : (
              <MaterialIcons name="my-location" size={18} color="#38bdf8" />
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.searchButton, loading && styles.searchButtonDisabled]}
          onPress={triggerSearch}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <>
              <MaterialIcons name="search" size={18} color="#ffffff" />
              <Text style={styles.searchButtonText}>Suchen</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
    gap: 8,
  },
  jobInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 12,
    height: 48,
  },
  iconLeft: {
    marginRight: 8,
  },
  jobInput: {
    flex: 1,
    color: '#f8fafc',
    fontSize: 15.5,
    fontWeight: '500',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  locationInputWrapper: {
    flex: 1.4, // Kleiner/kompakter neben dem Suchen-Button
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    paddingLeft: 10,
    paddingRight: 6,
    height: 42,
  },
  locationInput: {
    flex: 1,
    color: '#e2e8f0',
    fontSize: 14,
  },
  gpsButton: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#0284c7',
    height: 42,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  searchButtonDisabled: {
    opacity: 0.6,
  },
  searchButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14.5,
  },
});

export default JobSearch;