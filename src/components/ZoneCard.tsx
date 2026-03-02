import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Zone } from '../types/zone';
import { formatDistance } from '../utils/geo';

type ZoneCardProps = {
  zone: Zone;
  distance?: number | null;
  onCenter: () => void;
  onDelete: () => void;
};

export default function ZoneCard({
  zone,
  distance,
  onCenter,
  onDelete,
}: ZoneCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.name}>{zone.name}</Text>
        <Text style={styles.radius}>{Math.round(zone.radius)} m</Text>
      </View>

      <Text style={styles.meta}>Distancia aprox.: {formatDistance(distance)}</Text>
      <Text style={styles.meta}>
        Lat {zone.latitude.toFixed(4)} | Lng {zone.longitude.toFixed(4)}
      </Text>

      <View style={styles.actions}>
        <Pressable onPress={onCenter} style={[styles.button, styles.primary]}>
          <Text style={[styles.buttonText, styles.primaryText]}>Centralizar</Text>
        </Pressable>
        <Pressable onPress={onDelete} style={styles.button}>
          <Text style={styles.buttonText}>Apagar</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#0A1711',
    borderColor: '#173726',
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 14,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  name: {
    color: '#E7FFF0',
    fontFamily: 'monospace',
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
    paddingRight: 12,
  },
  radius: {
    color: '#45FF9A',
    fontFamily: 'monospace',
    fontSize: 13,
    fontWeight: '700',
  },
  meta: {
    color: '#8EBC9F',
    fontFamily: 'monospace',
    fontSize: 12,
    marginBottom: 6,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  button: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#244C36',
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: 'center',
    backgroundColor: '#09120E',
  },
  primary: {
    borderColor: '#45FF9A',
    backgroundColor: '#103321',
  },
  buttonText: {
    color: '#D3FFE5',
    fontFamily: 'monospace',
    fontWeight: '700',
  },
  primaryText: {
    color: '#45FF9A',
  },
});
