import notifee, {
  AndroidImportance,
  AuthorizationStatus,
} from '@notifee/react-native';

const CHANNEL_ID = 'zone-alerts';

export const createNotificationChannel = async () => {
  await notifee.requestPermission();

  const settings = await notifee.getNotificationSettings();
  if (settings.authorizationStatus === AuthorizationStatus.DENIED) {
    return null;
  }

  return notifee.createChannel({
    id: CHANNEL_ID,
    name: 'Zone Alerts',
    importance: AndroidImportance.HIGH,
    vibration: true,
  });
};

export const displayZoneNotification = async (zoneName: string, radiusMeters: number) => {
  await notifee.displayNotification({
    title: 'Entrou na zona',
    body: `${zoneName} | raio ${Math.round(radiusMeters)}m`,
    android: {
      channelId: CHANNEL_ID,
      pressAction: {
        id: 'default',
      },
      smallIcon: 'ic_launcher',
    },
  });
};
