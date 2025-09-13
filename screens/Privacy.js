import React from 'react';
import { View, Text, ScrollView, StyleSheet, Dimensions, SafeAreaView } from 'react-native';
import { Card } from '@rneui/themed';
import { useTranslation } from 'react-i18next';
import '../local/i18n';
import colors from '../inc/colors.js';
const Privacy = () => {
  const { t } = useTranslation();
  return (
    <ScrollView style={styles.container}>
    <SafeAreaView>
    <Text style={styles.heading}>{t('privacy.heading')}</Text>
    <Card containerStyle={styles.containerStyle}>
    <View style={styles.entry}>
    <Text style={styles.subheading}>{t('privacy.entry1.title')}</Text>
    <Text style={styles.paragraph}>{t('privacy.entry1.text')}</Text>
    </View>
    <View style={styles.entry}>
    <Text style={styles.subheading}>{t('privacy.entry2.title')}</Text>
    <Text style={styles.paragraph}>{t('privacy.entry2.text')}</Text>
    </View>
    <View style={styles.entry}>
    <Text style={styles.subheading}>{t('privacy.entry3.title')}</Text>
    <Text style={styles.paragraph}>{t('privacy.entry3.text')}</Text>
    </View>
    <View style={styles.entry}>
    <Text style={styles.subheading}>{t('privacy.entry4.title')}</Text>
    <Text style={styles.paragraph}>{t('privacy.entry4.text')}</Text>
    </View>
    <View style={styles.entry}>
    <Text style={styles.subheading}>{t('privacy.entry5.title')}</Text>
    <Text style={styles.paragraph}>{t('privacy.entry5.text')}</Text>
    </View>
    <View style={styles.entry}>
    <Text style={styles.subheading}>{t('privacy.entry6.title')}</Text>
    <Text style={styles.paragraph}>{t('privacy.entry6.text')}</Text>
    </View>
    </Card>
    </SafeAreaView>
    </ScrollView>
    );
    };
const {height, width} = Dimensions.get("window")
const styles = StyleSheet.create({
  container: {
    flex: 1,

    backgroundColor: colors.background,
    width: width
  },
  containerStyle: {
    backgroundColor: "transparent",
    elevation: 0,
    shadowOpacity: 0,
    borderWidth: 'none'
  },
  contentContainer: {
    paddingBottom: 50,
  },
  heading: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 1,
    textAlign: 'center',
    color: 'white',
    marginTop: 20,
  },
  subheading: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 1,
    color: 'white',
  },
  paragraph: {
    fontSize: 16,
    marginTop: 5,
    lineHeight: 22,
    color: 'white',
  },
  entry: {
    backgroundColor: colors.card3,
    padding: 20,
    borderRadius: 10,
    marginBottom: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    shadowColor: "gray",
    borderWidth: 1,
    borderColor: 'gray',

  },
});

export default Privacy;