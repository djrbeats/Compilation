import AsyncStorage from '@react-native-async-storage/async-storage';

import { Zone, ZoneDraft } from '../types/zone';

const STORAGE_KEY = 'spy-radar-zones';

const isZone = (value: unknown): value is Zone => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const zone = value as Zone;
  return (
    typeof zone.id === 'string' &&
    typeof zone.name === 'string' &&
    typeof zone.lat === 'number' &&
    typeof zone.lng === 'number' &&
    typeof zone.radiusMeters === 'number'
  );
};

export const listZones = async (): Promise<Zone[]> => {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);

  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter(isZone) : [];
  } catch (error) {
    console.warn('Failed to parse zones', error);
    return [];
  }
};

export const saveZones = async (zones: Zone[]) => {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(zones));
};

export const addZone = async (draft: ZoneDraft) => {
  const zones = await listZones();
  const next: Zone = {
    ...draft,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  };
  const result = [next, ...zones];
  await saveZones(result);
  return next;
};

export const removeZone = async (zoneId: string) => {
  const zones = await listZones();
  const result = zones.filter((zone) => zone.id !== zoneId);
  await saveZones(result);
  return result;
};
