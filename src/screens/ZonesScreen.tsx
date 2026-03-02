import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';
import * as Location from 'expo-location';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import SpyHeader from '../components/SpyHeader';
import ZoneCard from '../components/ZoneCard';
import { listZones, removeZone } from '../storage/zones';
import { Zone } from '../types/zone';
import { haversineDistance } from '../utils/geo';
import { RootStackParamList } from '../../App';

type Props = NativeStackScreenProps<RootStackParamList, 'Zonas'>;

export default function ZonesScreen({ navigation }: Props) {
  const [zones, setZones] = useState<Zone[]>([]);
  const [location, setLocation] = useState<Location.LocationObjectCoords | null>(null);

  const loadZones = useCallback(async () => {
    try {
      const storedZones = await listZones();
      setZones(storedZones);
    } catch (error) {
      console.warn('Failed to load zones', error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadZones();
    }, [loadZones]),
  );

  useEffect(() => {
    let active = true;

    const loadLocation = async () => {
      try {
        const { status } = await Location.getForegroundPermissionsAsync();

        if (status !== Location.PermissionStatus.GRANTED) {
          return;
        }

        const current = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        if (active) {
          setLocation(current.coords);
        }
      } catch (error) {
        console.warn('Failed to resolve current location', error);
      }
    };

    void loadLocation();

    return () => {
      active = false;
    };
  }, []);

  const distances = useMemo(() => {
    const map = new Map<string, number>();

    if (!location) {
      return map;
    }

    zones.forEach((zone) => {
      map.set(zone.id, haversineDistance(location, zone));
    });

    return map;
  }, [location, zones]);

  const handleDelete = async (zoneId: string) => {
    try {
      const nextZones = await removeZone(zoneId);
      setZones(nextZones);
    } catch (error) {
      console.warn('Failed to delete zone', error);
      Alert.alert('Falha ao apagar', 'Nao foi possivel remover a zona.');
    }
  };

  return (
    <View style={styles.container}>
      <SpyHeader
        title="Zonas Salvas"
        subtitle={`${zones.length} alvos registrados localmente`}
        rightLabel="Voltar"
        onRightPress={() => navigation.goBack()}
      />

      <FlatList
        data={zones}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        renderItem={({ item }) => (
          <ZoneCard
            zone={item}
            distance={distances.get(item.id)}
            onCenter={() => navigation.navigate('Mapa', { focusZoneId: item.id })}
            onDelete={() => void handleDelete(item.id)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Nenhuma zona cadastrada</Text>
            <Text style={styles.emptyText}>
              Volte ao mapa, toque em + Zona ou segure um ponto para criar o primeiro alvo.
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#06110D',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  emptyState: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#173726',
    backgroundColor: '#0A1711',
    padding: 20,
    marginTop: 12,
  },
  emptyTitle: {
    color: '#E7FFF0',
    fontFamily: 'monospace',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptyText: {
    color: '#A2CDB1',
    fontFamily: 'monospace',
    fontSize: 13,
    lineHeight: 20,
  },
});
