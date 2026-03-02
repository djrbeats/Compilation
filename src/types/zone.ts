export type Zone = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius: number;
  createdAt: string;
};

export type ZoneDraft = {
  name: string;
  latitude: number;
  longitude: number;
  radius: number;
};

export type ZonePresenceState = Record<string, boolean>;
