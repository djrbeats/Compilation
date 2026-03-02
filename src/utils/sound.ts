import { Alert, Platform, Vibration } from 'react-native';
import { Audio } from 'expo-av';

let audioPrepared = false;

const prepareAudioAsync = async () => {
  if (audioPrepared) {
    return;
  }

  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
    });
    audioPrepared = true;
  } catch (error) {
    console.warn('Audio mode setup failed', error);
  }
};

export const triggerSpyAlertFeedback = async (zoneName: string) => {
  Vibration.vibrate([0, 250, 120, 250]);

  try {
    await prepareAudioAsync();

    // Expo Go does not bundle a beep asset here, so keep audio optional.
    throw new Error('No bundled beep asset configured');
  } catch (error) {
    console.warn('Audio fallback active', error);

    if (Platform.OS !== 'web') {
      Alert.alert('Alerta tatico', `Entrou na zona ${zoneName}.`);
    }
  }
};
