import { useEffect, useState } from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import MapScreen from './src/screens/MapScreen';
import ZonesScreen from './src/screens/ZonesScreen';
import * as Notifications from './src/native/notifications';
import { Zone } from './src/types/zone';

export type RootStackParamList = {
  Mapa:
    | {
        focusZoneId?: Zone['id'];
      }
    | undefined;
  Zonas: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: '#06110D',
    card: '#081710',
    text: '#B5FFD4',
    border: '#0E3A29',
    primary: '#45FF9A',
    notification: '#8BFF60',
  },
};

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export default function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    const prepareNotifications = async () => {
      try {
        await Notifications.setNotificationChannelAsync('spy-alerts', {
          name: 'Spy Alerts',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 150, 250],
          lightColor: '#45FF9A',
        });
      } catch (error) {
        console.warn('Notification channel setup failed', error);
      } finally {
        if (mounted) {
          setReady(true);
        }
      }
    };

    void prepareNotifications();

    return () => {
      mounted = false;
    };
  }, []);

  if (!ready) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer theme={navTheme}>
        <StatusBar barStyle="light-content" backgroundColor="#06110D" />
        <Stack.Navigator
          initialRouteName="Mapa"
          screenOptions={{
            headerShown: false,
            contentStyle: {
              backgroundColor: '#06110D',
            },
          }}
        >
          <Stack.Screen name="Mapa" component={MapScreen} />
          <Stack.Screen name="Zonas" component={ZonesScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
