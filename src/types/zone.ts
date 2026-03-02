export type Zone = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  radiusMeters: number;
};

export type ZoneDraft = Omit<Zone, 'id'>;
