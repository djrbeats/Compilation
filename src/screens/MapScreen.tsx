import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import MapView, { Circle, LongPressEvent, Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import AddZoneModal from './AddZoneModal';
import RadarHud from '../components/RadarHud';
import SpyHeader from '../components/SpyHeader';
import * as Location from '../native/location';
import * as Notifications from '../native/notifications';
import { addZone, listZones } from '../storage/zones';
import { Zone, ZoneDraft, ZonePresenceState } from '../types/zone';
import { findNearestZone, formatDistance, getThreatStatus, haversineDistance } from '../utils/geo';
import { triggerSpyAlertFeedback } from '../utils/sound';
import { RootStackParamList } from '../../App';

type Props = NativeStackScreenProps<RootStackParamList, 'Mapa'>;

const defaultDraft: ZoneDraft = {
  name: '',
  latitude: -23.55052,
  longitude: -46.633308,
  radius: 250,
};

const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#04100B' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#74B590' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#04100B' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#0A2418' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#0F2B1F' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#133624' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#061E26' }] },
];

export default function MapScreen({ navigation, route }: Props) {
  const mapRef = useRef<MapView | null>(null);
  const presenceRef = useRef<ZonePresenceState>({});
  const [zones, setZones] = useState<Zone[]>([]);
  const [location, setLocation] = useState<Location.LocationObjectCoords | null>(null);
  const [watching, setWatching] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [draft, setDraft] = useState<ZoneDraft>(defaultDraft);

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
    let isMounted = true;
    let subscription: Location.LocationSubscription | null = null;

    const bootstrap = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        await Notifications.requestPermissionsAsync();

        if (status !== Location.PermissionStatus.GRANTED) {
          Alert.alert(
            'Permissao necessaria',
            'Ative a localizacao para monitorar zonas de risco.',
          );
          return;
        }

        const current = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        if (isMounted) {
          setLocation(current.coords);
          setDraft((currentDraft) => ({
            ...currentDraft,
            latitude: current.coords.latitude,
            longitude: current.coords.longitude,
          }));
        }

        subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            timeInterval: 4000,
            distanceInterval: 8,
          },
          (nextLocation) => {
            setLocation(nextLocation.coords);
            setWatching(true);
          },
        );
      } catch (error) {
        console.warn('Location bootstrap failed', error);
      }
    };

    void bootstrap();

    return () => {
      isMounted = false;
      subscription?.remove();
    };
  }, []);

  useEffect(() => {
    const focusZoneId = route.params?.focusZoneId;

    if (!focusZoneId || !zones.length || !mapRef.current) {
      return;
    }

    const zone = zones.find((item) => item.id === focusZoneId);

    if (!zone) {
      return;
    }

    mapRef.current.animateToRegion(
      {
        latitude: zone.latitude,
        longitude: zone.longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      },
      900,
    );
  }, [route.params?.focusZoneId, zones]);

  useEffect(() => {
    if (!location || !zones.length) {
      return;
    }

    zones.forEach((zone) => {
      const distance = haversineDistance(location, zone);
      const isInside = distance <= zone.radius;
      const wasInside = presenceRef.current[zone.id] ?? false;

      if (isInside && !wasInside) {
        presenceRef.current[zone.id] = true;

        void Notifications.scheduleNotificationAsync({
          content: {
            title: 'ENTROU NA ZONA',
            body: `${zone.name} | raio ${Math.round(zone.radius)}m`,
            sound: false,
          },
          trigger: null,
        });

        void triggerSpyAlertFeedback(zone.name);
        return;
      }

      if (!isInside && wasInside) {
        presenceRef.current[zone.id] = false;
      }
    });
  }, [location, zones]);

  const nearest = useMemo(() => {
    if (!location) {
      return null;
    }

    return findNearestZone(location, zones);
  }, [location, zones]);

  const status = getThreatStatus(nearest?.distance ?? null, nearest?.zone.radius ?? null);

  const openCreateZone = () => {
    if (location) {
      setDraft((currentDraft) => ({
        ...currentDraft,
        latitude: location.latitude,
        longitude: location.longitude,
      }));
    }

    setModalVisible(true);
  };

  const handleMapLongPress = (event: LongPressEvent) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;

    setDraft((currentDraft) => ({
      ...currentDraft,
      latitude,
      longitude,
    }));
    setModalVisible(true);
  };

  const handleSaveZone = async () => {
    const trimmedName = draft.name.trim();

    if (!trimmedName) {
      Alert.alert('Nome obrigatorio', 'Informe um nome para a zona.');
      return;
    }

    try {
      const nextZone = await addZone({
        ...draft,
        name: trimmedName,
      });

      setZones((current) => [nextZone, ...current]);
      setModalVisible(false);
      setDraft((currentDraft) => ({
        ...currentDraft,
        name: '',
      }));
    } catch (error) {
      console.warn('Failed to save zone', error);
      Alert.alert('Falha ao salvar', 'Nao foi possivel salvar a zona agora.');
    }
  };

  return (
    <View style={styles.container}>
      <SpyHeader
        title="Mapa Tatico"
        subtitle="Toque e segure para marcar um alvo"
        rightLabel="Zonas"
        onRightPress={() => navigation.navigate('Zonas')}
      />

      <View style={styles.mapShell}>
        <MapView
          ref={mapRef}
          provider={PROVIDER_DEFAULT}
          customMapStyle={darkMapStyle}
          style={styles.map}
          onLongPress={handleMapLongPress}
          showsUserLocation
          showsMyLocationButton
          initialRegion={{
            latitude: location?.latitude ?? defaultDraft.latitude,
            longitude: location?.longitude ?? defaultDraft.longitude,
            latitudeDelta: 0.045,
            longitudeDelta: 0.045,
          }}
        >
          {zones.map((zone) => (
            <Circle
              key={zone.id}
              center={{
                latitude: zone.latitude,
                longitude: zone.longitude,
              }}
              radius={zone.radius}
              fillColor="rgba(69, 255, 154, 0.12)"
              strokeColor="#45FF9A"
              strokeWidth={2}
            />
          ))}

          {zones.map((zone) => (
            <Marker
              key={`${zone.id}-marker`}
              coordinate={{
                latitude: zone.latitude,
                longitude: zone.longitude,
              }}
              title={zone.name}
              description={`Raio ${Math.round(zone.radius)}m`}
              pinColor="#45FF9A"
            />
          ))}
        </MapView>

        <View style={styles.overlayTop}>
          <RadarHud
            status={status}
            distance={nearest?.distance ?? null}
            zoneName={nearest?.zone.name}
          />
        </View>

        <View style={styles.overlayBottom}>
          <View style={styles.legend}>
            <Text style={styles.legendText}>
              {watching ? 'SINAL AO VIVO' : 'AGUARDANDO GPS'} | PROXIMO:{' '}
              {nearest ? `${nearest.zone.name} (${formatDistance(nearest.distance)})` : 'NENHUM'}
            </Text>
          </View>

          <View style={styles.buttons}>
            <Pressable style={styles.secondaryButton} onPress={() => navigation.navigate('Zonas')}>
              <Text style={styles.secondaryButtonText}>Abrir zonas</Text>
            </Pressable>
            <Pressable style={styles.primaryButton} onPress={openCreateZone}>
              <Text style={styles.primaryButtonText}>+ Zona</Text>
            </Pressable>
          </View>
        </View>
      </View>

      <AddZoneModal
        visible={modalVisible}
        draft={draft}
        onChange={setDraft}
        onClose={() => setModalVisible(false)}
        onSave={handleSaveZone}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#06110D',
  },
  mapShell: {
    flex: 1,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  overlayTop: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  overlayBottom: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 18,
    gap: 12,
  },
  legend: {
    backgroundColor: 'rgba(6, 17, 13, 0.94)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#173726',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  legendText: {
    color: '#B5FFD4',
    fontFamily: 'monospace',
    fontSize: 12,
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
  },
  secondaryButton: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#365A47',
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: 'rgba(9, 18, 14, 0.94)',
  },
  primaryButton: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#45FF9A',
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: 'rgba(19, 56, 37, 0.96)',
  },
  secondaryButtonText: {
    color: '#D3FFE5',
    fontFamily: 'monospace',
    fontWeight: '700',
  },
  primaryButtonText: {
    color: '#45FF9A',
    fontFamily: 'monospace',
    fontWeight: '700',
    fontSize: 16,
  },
});
