import { Alert, Platform, Vibration } from 'react-native';

export const triggerSpyAlertFeedback = async (zoneName: string) => {
  Vibration.vibrate([0, 250, 120, 250]);

  try {
    throw new Error('No bundled beep asset configured');
  } catch (error) {
    console.warn('Audio fallback active', error);

    if (Platform.OS !== 'web') {
      Alert.alert('Alerta tatico', `Entrou na zona ${zoneName}.`);
    }
  }
};
