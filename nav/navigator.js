import React, { useEffect, useState, useRef } from 'react';
import { Alert, AppState, Text } from 'react-native';
import EncryptedStorage from 'react-native-encrypted-storage';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { createStackNavigator } from '@react-navigation/stack';
import SQLite from 'react-native-sqlite-storage';
import DeviceInfo from 'react-native-device-info';
import { decryptAndStore } from '../inc/cryp.js';
import { secureStore, removeStorage } from '../inc/db.js';
import * as Keychain from 'react-native-keychain';
import MaterialIcons from '@react-native-vector-icons/material-icons';
import { sha256, sha256Bytes } from 'react-native-sha256';
import '../local/i18n';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import colors from '../inc/colors.js';
// Screens
import HomeScreen from '../screens/Home.js';
import NameScreen from '../screens/Name.js';
import ApplicationScreen from '../screens/Application.js';
import ChangeScreen from '../screens/Change.js';
import UploadScreen from '../screens/Upload.js';
import EmailScreen from '../screens/Email.js';

import CollectScreen from '../screens/Collect.js';
import ProfilScreen from '../screens/Profil.js';
import TestScreen from '../screens/Test.js';
import OldScreen from '../screens/Old.js';
import ChangeOld from '../screens/ChangeOld.js';
import NameOld from '../screens/NameOld.js';
import StartApp from '../screens/StartApp.js';
import InfoScreen from '../screens/Info.js';
import AGB from "../screens/Agb.js";
import Privacy from "../screens/Privacy.js";
import Impressum from '../screens/Impressum.js';
import Faq from '../screens/Faq.js';
import Contact from '../screens/Contact.js';
import Setting from '../screens/Setting.js';
import ownApp from '../screens/ownApplication.js';
import First from '../screens/First.js';
import Offline from '../screens/offApplication.js';
import NameOff from '../screens/NameOff.js';


const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();
const Drawer = createDrawerNavigator();
const DB_NAME = "firstNew.db";






// 🔹 App-Navigator mit `AppState`-Überwachung
const AppNavigator = () => {
  const { i18n, t } = useTranslation();
  const appState = useRef(AppState.currentState);
  const [appStateVisible, setAppStateVisible] = useState(appState.current);
  const credentials = Keychain.getGenericPassword()
  useEffect(() => {
    if (AppState.currentState === 'active') {
      secureStore();
      console.log("App ist aktiv");
    } else if (AppState.currentState === 'background') {
      console.log("App ist im Hintergrund");
    }

    const handleAppStateChange = async (nextAppState) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {

        console.log("App ist im Hintergrund");
      } else {
        secureStore();
        console.log("App ist aktiv");
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, []);


  return (
    <NavigationContainer>
      <StackNavigator /> {/* Statt DrawerNavigator */}
    </NavigationContainer>
  );
}


// 🔹 Stack-Navigator
function StackNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="MainTabs" component={TabNavigator} options={{ headerShown: false }} />
      <Stack.Screen name="Change" component={ChangeScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Collect" component={CollectScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Application" component={ApplicationScreen} options={{ headerShown: false }} />
      <Stack.Screen name="ChangeOld" component={ChangeOld} options={{ headerShown: false }} />
      <Stack.Screen name="Old" component={OldScreen} options={{ headerShown: false }} />
      <Stack.Screen name="NameOld" component={NameOld} options={{ headerShown: false }} />
      <Stack.Screen name="Name" component={NameScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Email" component={EmailScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Upload" component={UploadScreen} options={{ headerShown: false }} />
      <Stack.Screen name="AGB" component={AGB} options={{ headerShown: false }} />
      <Stack.Screen name="Privacy" component={Privacy} options={{ headerShown: false }} />
      <Stack.Screen name="Impressum" component={Impressum} options={{ headerShown: false }} />
      <Stack.Screen name="Faq" component={Faq} options={{ headerShown: false }} />
      <Stack.Screen name="Contact" component={Contact} options={{ headerShown: false }} />
      <Stack.Screen name="ownApplication" component={ownApp} options={{ headerShown: false }} />
      <Stack.Screen name="Test" component={TestScreen} options={{ headerShown: false }} />
      <Stack.Screen name="First" component={First} options={{ headerShown: false }} />
      <Stack.Screen name="Setting" component={Setting} options={{ headerShown: false }} />
      <Stack.Screen name="Offline" component={Offline} options={{ headerShown: false }} />
      <Stack.Screen name="NameOff" component={NameOff} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}

// 🔹 Tab-Navigator
function TabNavigator() {
  const { i18n, t } = useTranslation();
  return (
    <Tab.Navigator

      screenOptions={{
    
        tabBarStyle: {
          backgroundColor: colors.card4,
          
          borderTopWidth: 0,

        },
      }}
    >
      <Tab.Screen name={t('Bewerbung')} component={StartApp}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Text><MaterialIcons name="post-add" color={color} size={size} /></Text>
          ),
          headerShown: false
        }} />
      <Tab.Screen name={t('Profil')} component={ProfilScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="person" color={color} size={size} />
          ),
          headerShown: false
        }} />

      <Tab.Screen name={t('Anlagen')} component={UploadScreen} options={{
        tabBarIcon: ({ color, size }) => (
          <MaterialIcons name="upload" color={color} size={size} />
        ),
        headerShown: false
      }} />
      <Tab.Screen name={t('Info')} component={First} options={{
        tabBarIcon: ({ color, size }) => (
          <MaterialIcons name="info" color={color} size={size} />
        ),
        headerShown: false
      }} />
     

    </Tab.Navigator>
  );
}

// 🔹 Drawer-Navigator


// 🔹 App.js (Startet die App mit `AppNavigator`)
export default function App() {
  return <AppNavigator />;
}