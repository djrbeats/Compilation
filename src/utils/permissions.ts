import { Platform } from 'react-native';
import {
  check,
  Permission,
  PERMISSIONS,
  request,
  requestNotifications,
  RESULTS,
} from 'react-native-permissions';

const requestOne = async (permission: Permission) => {
  const current = await check(permission);

  if (current === RESULTS.GRANTED) {
    return true;
  }

  const next = await request(permission);
  return next === RESULTS.GRANTED;
};

export const ensureLocationPermission = async () => {
  if (Platform.OS !== 'android') {
    return true;
  }

  const fine = await requestOne(PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION);

  if (fine) {
    return true;
  }

  return requestOne(PERMISSIONS.ANDROID.ACCESS_COARSE_LOCATION);
};

export const ensureNotificationPermission = async () => {
  if (Platform.OS !== 'android') {
    return true;
  }

  if (Platform.Version < 33) {
    return true;
  }

  const result = await requestNotifications(['alert', 'sound']);
  return result.status === RESULTS.GRANTED;
};
