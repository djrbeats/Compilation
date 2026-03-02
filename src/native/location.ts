import {
  NativeEventEmitter,
  NativeModules,
  PermissionsAndroid,
  Platform,
} from 'react-native';

export const PermissionStatus = {
  GRANTED: 'granted',
  DENIED: 'denied',
} as const;

export const Accuracy = {
  Balanced: 'balanced',
} as const;

export type LocationObjectCoords = {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  altitude?: number | null;
  heading?: number | null;
  speed?: number | null;
};

export type LocationObject = {
  coords: LocationObjectCoords;
  timestamp: number;
};

export type LocationSubscription = {
  remove: () => void;
};

type PermissionResponse = {
  status: (typeof PermissionStatus)[keyof typeof PermissionStatus];
};

type WatchOptions = {
  accuracy?: (typeof Accuracy)[keyof typeof Accuracy];
  timeInterval?: number;
  distanceInterval?: number;
};

type NativeLocationModule = {
  getCurrentPosition: () => Promise<LocationObject>;
  startWatching: (timeInterval: number, distanceInterval: number) => Promise<void>;
  stopWatching: () => void;
};

const nativeLocation = NativeModules.SpyRadarLocation as NativeLocationModule | undefined;
const emitter = nativeLocation ? new NativeEventEmitter(NativeModules.SpyRadarLocation) : null;

const resolveStatus = async (): Promise<PermissionResponse> => {
  if (Platform.OS !== 'android') {
    return { status: PermissionStatus.DENIED };
  }

  const granted = await PermissionsAndroid.check(
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
  );

  return {
    status: granted ? PermissionStatus.GRANTED : PermissionStatus.DENIED,
  };
};

export const getForegroundPermissionsAsync = async () => resolveStatus();

export const requestForegroundPermissionsAsync = async (): Promise<PermissionResponse> => {
  if (Platform.OS !== 'android') {
    return { status: PermissionStatus.DENIED };
  }

  const result = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
  );

  return {
    status:
      result === PermissionsAndroid.RESULTS.GRANTED
        ? PermissionStatus.GRANTED
        : PermissionStatus.DENIED,
  };
};

export const getCurrentPositionAsync = async (_options?: WatchOptions) => {
  if (!nativeLocation) {
    throw new Error('SpyRadarLocation native module unavailable');
  }

  return nativeLocation.getCurrentPosition();
};

export const watchPositionAsync = async (
  options: WatchOptions,
  callback: (location: LocationObject) => void,
): Promise<LocationSubscription> => {
  if (!nativeLocation || !emitter) {
    throw new Error('SpyRadarLocation native module unavailable');
  }

  const subscription = emitter.addListener('SpyRadarLocationUpdate', callback);

  try {
    await nativeLocation.startWatching(
      options.timeInterval ?? 4000,
      options.distanceInterval ?? 0,
    );
  } catch (error) {
    subscription.remove();
    throw error;
  }

  return {
    remove: () => {
      subscription.remove();
      nativeLocation.stopWatching();
    },
  };
};
