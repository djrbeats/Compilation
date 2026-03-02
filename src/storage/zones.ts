import AsyncStorage from '@react-native-async-storage/async-storage';

import { Zone, ZoneDraft } from '../types/zone';

export const ZONES_STORAGE_KEY = 'SPY_ZONES_V1';

const safeParseZones = (rawValue: string | null): Zone[] => {
  if (!rawValue) {
    return [];
  }

  try {
    const parsed = JSON.parse(rawValue) as unknown;

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((item): item is Zone => {
      return (
        !!item &&
        typeof item === 'object' &&
        typeof (item as Zone).id === 'string' &&
        typeof (item as Zone).name === 'string' &&
        typeof (item as Zone).latitude === 'number' &&
        typeof (item as Zone).longitude === 'number' &&
        typeof (item as Zone).radius === 'number'
      );
    });
  } catch (error) {
    console.warn('Failed to parse stored zones', error);
    return [];
  }
};

export const listZones = async () => {
  const stored = await AsyncStorage.getItem(ZONES_STORAGE_KEY);
  return safeParseZones(stored);
};

export const saveZones = async (zones: Zone[]) => {
  await AsyncStorage.setItem(ZONES_STORAGE_KEY, JSON.stringify(zones));
};

export const addZone = async (draft: ZoneDraft) => {
  const zones = await listZones();
  const nextZone: Zone = {
    ...draft,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
  };

  const nextZones = [nextZone, ...zones];
  await saveZones(nextZones);
  return nextZone;
};

export const removeZone = async (zoneId: string) => {
  const zones = await listZones();
  const nextZones = zones.filter((zone) => zone.id !== zoneId);
  await saveZones(nextZones);
  return nextZones;
};
