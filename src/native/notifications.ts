import { NativeModules, PermissionsAndroid, Platform } from 'react-native';

export const AndroidImportance = {
  HIGH: 4,
} as const;

type NotificationChannelInput = {
  name: string;
  importance: number;
  vibrationPattern?: number[];
  lightColor?: string;
};

type NotificationContentInput = {
  title: string;
  body: string;
  sound?: boolean;
};

type NotificationRequestInput = {
  content: NotificationContentInput;
  trigger: null;
};

type NotificationHandler = {
  handleNotification: () => Promise<{
    shouldPlaySound: boolean;
    shouldSetBadge: boolean;
    shouldShowBanner: boolean;
    shouldShowList: boolean;
  }>;
};

type NativeNotificationsModule = {
  setNotificationChannel: (
    channelId: string,
    name: string,
    importance: number,
    lightColor: string,
    vibrationPattern: number[],
  ) => Promise<void>;
  presentNotification: (channelId: string, title: string, body: string) => Promise<void>;
};

const nativeNotifications = NativeModules.SpyRadarNotifications as
  | NativeNotificationsModule
  | undefined;

let currentChannelId = 'default';

export const setNotificationHandler = (_handler: NotificationHandler) => {};

export const requestPermissionsAsync = async () => {
  if (Platform.OS !== 'android' || Platform.Version < 33) {
    return { status: 'granted' as const };
  }

  const result = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
  );

  return {
    status: result === PermissionsAndroid.RESULTS.GRANTED ? 'granted' : 'denied',
  };
};

export const setNotificationChannelAsync = async (
  channelId: string,
  input: NotificationChannelInput,
) => {
  currentChannelId = channelId;

  if (!nativeNotifications) {
    return;
  }

  await nativeNotifications.setNotificationChannel(
    channelId,
    input.name,
    input.importance,
    input.lightColor ?? '#FFFFFF',
    input.vibrationPattern ?? [],
  );
};

export const scheduleNotificationAsync = async (request: NotificationRequestInput) => {
  if (request.trigger !== null) {
    throw new Error('Only immediate notifications are supported');
  }

  if (!nativeNotifications) {
    return;
  }

  await nativeNotifications.presentNotification(
    currentChannelId,
    request.content.title,
    request.content.body,
  );
};
