import { Zone } from '../types/zone';

type Coordinates = {
  latitude: number;
  longitude: number;
};

const EARTH_RADIUS_METERS = 6371000;

const toRadians = (value: number) => (value * Math.PI) / 180;

export const haversineDistance = (from: Coordinates, to: Coordinates) => {
  const latitudeDelta = toRadians(to.latitude - from.latitude);
  const longitudeDelta = toRadians(to.longitude - from.longitude);

  const startLatitude = toRadians(from.latitude);
  const endLatitude = toRadians(to.latitude);

  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(startLatitude) *
      Math.cos(endLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;

  return 2 * EARTH_RADIUS_METERS * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export const findNearestZone = (coordinates: Coordinates, zones: Zone[]) => {
  if (!zones.length) {
    return null;
  }

  return zones.reduce<{
    zone: Zone;
    distance: number;
  } | null>((closest, zone) => {
    const distance = haversineDistance(coordinates, zone);

    if (!closest || distance < closest.distance) {
      return { zone, distance };
    }

    return closest;
  }, null);
};

export const formatDistance = (distance: number | null | undefined) => {
  if (distance == null || Number.isNaN(distance)) {
    return '--';
  }

  if (distance < 1000) {
    return `${Math.round(distance)} m`;
  }

  return `${(distance / 1000).toFixed(2)} km`;
};

export const getThreatStatus = (
  nearestDistance: number | null,
  zoneRadius: number | null,
) => {
  if (nearestDistance == null || zoneRadius == null) {
    return 'SEM SINAL';
  }

  if (nearestDistance <= zoneRadius) {
    return 'PERIGO';
  }

  if (nearestDistance <= zoneRadius * 2) {
    return 'ATENCAO';
  }

  return 'SEGURO';
};
