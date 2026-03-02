import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import MapView, { Circle, Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import Geolocation, {
  GeoPosition,
} from 'react-native-geolocation-service';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import {
  ensureLocationPermission,
  ensureNotificationPermission,
} from './src/utils/permissions';
import {
  createNotificationChannel,
  displayZoneNotification,
} from './src/utils/notifications';
import {
  addZone,
  listZones,
  removeZone,
} from './src/storage/zones';
import { findNearestZone, formatDistance, haversineDistance } from './src/utils/geo';
import { Zone, ZoneDraft } from './src/types/zone';

type Tab = 'map' | 'zones';

const DEFAULT_COORDS = {
  latitude: -23.55052,
  longitude: -46.633308,
};

const DEFAULT_DRAFT: ZoneDraft = {
  name: '',
  lat: DEFAULT_COORDS.latitude,
  lng: DEFAULT_COORDS.longitude,
  radiusMeters: 250,
};

const CHECK_INTERVAL_MS = 15000;
const ZONE_COOLDOWN_MS = 5 * 60 * 1000;

function App(): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<Tab>('map');
  const [zones, setZones] = useState<Zone[]>([]);
  const [currentLocation, setCurrentLocation] = useState<GeoPosition['coords'] | null>(null);
  const [focusedZoneId, setFocusedZoneId] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [draft, setDraft] = useState<ZoneDraft>(DEFAULT_DRAFT);
  const [watchLabel, setWatchLabel] = useState('AGUARDANDO GPS');

  const mapRef = useRef<MapView | null>(null);
  const insideZonesRef = useRef<Record<string, boolean>>({});
  const cooldownRef = useRef<Record<string, number>>({});

  useEffect(() => {
    const loadInitialState = async () => {
      await createNotificationChannel();

      const storedZones = await listZones();
      setZones(storedZones);
    };

    loadInitialState().catch((error) => {
      console.warn('Failed to load initial state', error);
    });
  }, []);

  useEffect(() => {
    if (!focusedZoneId || !mapRef.current) {
      return;
    }

    const zone = zones.find((item) => item.id === focusedZoneId);

    if (!zone) {
      return;
    }

    mapRef.current.animateToRegion(
      {
        latitude: zone.lat,
        longitude: zone.lng,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      },
      800,
    );
  }, [focusedZoneId, zones]);

  useEffect(() => {
    let mounted = true;

    const bootstrap = async () => {
      const hasLocation = await ensureLocationPermission();
      const hasNotifications = await ensureNotificationPermission();

      if (!hasLocation) {
        Alert.alert(
          'Permissao de localizacao',
          'Ative a localizacao para visualizar sua posicao e monitorar zonas.',
        );
        return;
      }

      if (!hasNotifications) {
        console.warn('Notification permission not granted');
      }

      const resolveAndCheck = async () => {
        try {
          const position = await getCurrentPosition();

          if (!mounted) {
            return;
          }

          setCurrentLocation(position.coords);
          setWatchLabel('SINAL AO VIVO');

          await checkZoneEntries(position.coords, zones, insideZonesRef, cooldownRef);
        } catch (error) {
          console.warn('Failed to get current location', error);
          if (mounted) {
            setWatchLabel('GPS INDISPONIVEL');
          }
        }
      };

      await resolveAndCheck();

      const intervalId = setInterval(() => {
        resolveAndCheck().catch((error) => {
          console.warn('Failed interval location check', error);
        });
      }, CHECK_INTERVAL_MS);

      return () => clearInterval(intervalId);
    };

    let cleanup: (() => void) | undefined;

    bootstrap()
      .then((fn) => {
        cleanup = fn;
      })
      .catch((error) => {
        console.warn('Failed to bootstrap tracking', error);
      });

    return () => {
      mounted = false;
      cleanup?.();
    };
  }, [zones]);

  const nearest = useMemo(() => {
    if (!currentLocation) {
      return null;
    }

    return findNearestZone(
      { latitude: currentLocation.latitude, longitude: currentLocation.longitude },
      zones,
    );
  }, [currentLocation, zones]);

  const openZoneModal = () => {
    setDraft({
      ...DEFAULT_DRAFT,
      lat: currentLocation?.latitude ?? DEFAULT_DRAFT.lat,
      lng: currentLocation?.longitude ?? DEFAULT_DRAFT.lng,
    });
    setModalVisible(true);
  };

  const saveNewZone = async () => {
    const name = draft.name.trim();

    if (!name) {
      Alert.alert('Nome obrigatorio', 'Informe um nome para a zona.');
      return;
    }

    if (draft.radiusMeters <= 0) {
      Alert.alert('Raio invalido', 'Informe um raio maior que zero.');
      return;
    }

    const nextZone = await addZone({
      ...draft,
      name,
    });

    setZones((current) => [nextZone, ...current]);
    setDraft(DEFAULT_DRAFT);
    setModalVisible(false);
  };

  const deleteZone = async (zoneId: string) => {
    const next = await removeZone(zoneId);
    setZones(next);
    delete insideZonesRef.current[zoneId];
    delete cooldownRef.current[zoneId];
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor="#06110D" />
        <View style={styles.container}>
          <View style={styles.tabBar}>
            <TabButton
              active={activeTab === 'map'}
              label="Mapa"
              onPress={() => setActiveTab('map')}
            />
            <TabButton
              active={activeTab === 'zones'}
              label="Zonas"
              onPress={() => setActiveTab('zones')}
            />
          </View>

          {activeTab === 'map' ? (
            <View style={styles.screen}>
              <Header
                title="Mapa Tatico"
                subtitle="Localizacao atual, proximidade e zonas salvas"
                rightLabel="Nova zona"
                onRightPress={openZoneModal}
              />

              <View style={styles.mapWrapper}>
                <MapView
                  ref={mapRef}
                  provider={PROVIDER_DEFAULT}
                  style={styles.map}
                  showsUserLocation
                  followsUserLocation
                  initialRegion={{
                    latitude: currentLocation?.latitude ?? DEFAULT_COORDS.latitude,
                    longitude: currentLocation?.longitude ?? DEFAULT_COORDS.longitude,
                    latitudeDelta: 0.03,
                    longitudeDelta: 0.03,
                  }}
                >
                  {zones.map((zone) => (
                    <React.Fragment key={zone.id}>
                      <Circle
                        center={{ latitude: zone.lat, longitude: zone.lng }}
                        radius={zone.radiusMeters}
                        fillColor="rgba(69, 255, 154, 0.12)"
                        strokeColor="#45FF9A"
                        strokeWidth={2}
                      />
                      <Marker
                        coordinate={{ latitude: zone.lat, longitude: zone.lng }}
                        title={zone.name}
                        description={`Raio ${zone.radiusMeters}m`}
                      />
                    </React.Fragment>
                  ))}
                </MapView>

                <View style={styles.overlayTop}>
                  <View style={styles.hudCard}>
                    <Text style={styles.hudLabel}>STATUS</Text>
                    <Text style={styles.hudTitle}>{watchLabel}</Text>
                    <Text style={styles.hudText}>
                      PROXIMA: {nearest ? nearest.zone.name : 'NENHUMA'}
                    </Text>
                    <Text style={styles.hudText}>
                      DISTANCIA: {formatDistance(nearest?.distance)}
                    </Text>
                  </View>
                </View>

                <View style={styles.overlayBottom}>
                  <Pressable style={styles.secondaryButton} onPress={() => setActiveTab('zones')}>
                    <Text style={styles.secondaryButtonText}>Abrir zonas</Text>
                  </Pressable>
                  <Pressable style={styles.primaryButton} onPress={openZoneModal}>
                    <Text style={styles.primaryButtonText}>+ Zona</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.screen}>
              <Header
                title="Zonas Salvas"
                subtitle={`${zones.length} zonas locais em AsyncStorage`}
                rightLabel="Criar"
                onRightPress={openZoneModal}
              />

              <FlatList
                contentContainerStyle={styles.listContent}
                data={zones}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => {
                  const distance = currentLocation
                    ? haversineDistance(
                        {
                          latitude: currentLocation.latitude,
                          longitude: currentLocation.longitude,
                        },
                        {
                          latitude: item.lat,
                          longitude: item.lng,
                        },
                      )
                    : null;

                  return (
                    <View style={styles.zoneCard}>
                      <Text style={styles.zoneTitle}>{item.name}</Text>
                      <Text style={styles.zoneMeta}>
                        {item.lat.toFixed(5)}, {item.lng.toFixed(5)}
                      </Text>
                      <Text style={styles.zoneMeta}>Raio {item.radiusMeters}m</Text>
                      <Text style={styles.zoneMeta}>
                        Distancia {formatDistance(distance)}
                      </Text>
                      <View style={styles.zoneActions}>
                        <Pressable
                          style={styles.secondaryButton}
                          onPress={() => {
                            setFocusedZoneId(item.id);
                            setActiveTab('map');
                          }}
                        >
                          <Text style={styles.secondaryButtonText}>Ver no mapa</Text>
                        </Pressable>
                        <Pressable
                          style={styles.deleteButton}
                          onPress={() => {
                            deleteZone(item.id).catch((error) => {
                              console.warn('Failed to delete zone', error);
                            });
                          }}
                        >
                          <Text style={styles.deleteButtonText}>Remover</Text>
                        </Pressable>
                      </View>
                    </View>
                  );
                }}
                ListEmptyComponent={
                  <View style={styles.emptyState}>
                    <Text style={styles.zoneTitle}>Nenhuma zona cadastrada</Text>
                    <Text style={styles.zoneMeta}>
                      Crie uma zona para ativar o monitoramento de entrada por distancia.
                    </Text>
                  </View>
                }
              />
            </View>
          )}

          <Modal
            animationType="slide"
            transparent
            visible={modalVisible}
            onRequestClose={() => setModalVisible(false)}
          >
            <View style={styles.modalBackdrop}>
              <View style={styles.modalCard}>
                <Text style={styles.modalTitle}>Nova zona</Text>
                <ZoneInput
                  label="Nome"
                  value={draft.name}
                  onChangeText={(value) => setDraft((current) => ({ ...current, name: value }))}
                />
                <ZoneInput
                  label="Latitude"
                  keyboardType="numeric"
                  value={String(draft.lat)}
                  onChangeText={(value) =>
                    setDraft((current) => ({ ...current, lat: parseNumber(value, current.lat) }))
                  }
                />
                <ZoneInput
                  label="Longitude"
                  keyboardType="numeric"
                  value={String(draft.lng)}
                  onChangeText={(value) =>
                    setDraft((current) => ({ ...current, lng: parseNumber(value, current.lng) }))
                  }
                />
                <ZoneInput
                  label="Raio (m)"
                  keyboardType="numeric"
                  value={String(draft.radiusMeters)}
                  onChangeText={(value) =>
                    setDraft((current) => ({
                      ...current,
                      radiusMeters: parseNumber(value, current.radiusMeters),
                    }))
                  }
                />

                <View style={styles.modalActions}>
                  <Pressable
                    style={styles.secondaryButton}
                    onPress={() => setModalVisible(false)}
                  >
                    <Text style={styles.secondaryButtonText}>Cancelar</Text>
                  </Pressable>
                  <Pressable
                    style={styles.primaryButton}
                    onPress={() => {
                      saveNewZone().catch((error) => {
                        console.warn('Failed to save zone', error);
                      });
                    }}
                  >
                    <Text style={styles.primaryButtonText}>Salvar</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </Modal>
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

type HeaderProps = {
  title: string;
  subtitle: string;
  rightLabel: string;
  onRightPress: () => void;
};

function Header({ title, subtitle, rightLabel, onRightPress }: HeaderProps) {
  return (
    <View style={styles.header}>
      <View style={styles.headerCopy}>
        <Text style={styles.headerTitle}>{title}</Text>
        <Text style={styles.headerSubtitle}>{subtitle}</Text>
      </View>
      <Pressable style={styles.headerButton} onPress={onRightPress}>
        <Text style={styles.headerButtonText}>{rightLabel}</Text>
      </Pressable>
    </View>
  );
}

type TabButtonProps = {
  active: boolean;
  label: string;
  onPress: () => void;
};

function TabButton({ active, label, onPress }: TabButtonProps) {
  return (
    <Pressable
      style={[styles.tabButton, active && styles.tabButtonActive]}
      onPress={onPress}
    >
      <Text style={[styles.tabButtonText, active && styles.tabButtonTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

type ZoneInputProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: 'default' | 'numeric';
};

function ZoneInput({ label, value, onChangeText, keyboardType = 'default' }: ZoneInputProps) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        keyboardType={keyboardType}
        onChangeText={onChangeText}
        style={styles.input}
        value={value}
        placeholder={label}
        placeholderTextColor="#78937F"
      />
    </View>
  );
}

const parseNumber = (value: string, fallback: number) => {
  const parsed = Number(value.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : fallback;
};

const getCurrentPosition = () =>
  new Promise<GeoPosition>((resolve, reject) => {
    Geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 5000,
      forceRequestLocation: true,
      showLocationDialog: true,
    });
  });

const checkZoneEntries = async (
  coords: GeoPosition['coords'],
  zones: Zone[],
  insideZonesRef: React.MutableRefObject<Record<string, boolean>>,
  cooldownRef: React.MutableRefObject<Record<string, number>>,
) => {
  const now = Date.now();

  for (const zone of zones) {
    const distance = haversineDistance(
      { latitude: coords.latitude, longitude: coords.longitude },
      { latitude: zone.lat, longitude: zone.lng },
    );
    const isInside = distance <= zone.radiusMeters;
    const wasInside = insideZonesRef.current[zone.id] ?? false;
    const cooldownUntil = cooldownRef.current[zone.id] ?? 0;

    if (isInside && !wasInside && now >= cooldownUntil) {
      insideZonesRef.current[zone.id] = true;
      cooldownRef.current[zone.id] = now + ZONE_COOLDOWN_MS;

      await displayZoneNotification(zone.name, zone.radiusMeters);
      continue;
    }

    if (!isInside && wasInside) {
      insideZonesRef.current[zone.id] = false;
    }
  }
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#06110D',
  },
  container: {
    flex: 1,
    backgroundColor: '#06110D',
  },
  screen: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 12,
    padding: 6,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#173726',
    backgroundColor: '#091811',
    gap: 8,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 14,
    paddingVertical: 12,
  },
  tabButtonActive: {
    backgroundColor: '#123A25',
    borderWidth: 1,
    borderColor: '#45FF9A',
  },
  tabButtonText: {
    color: '#8CB59E',
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
    fontWeight: '700',
  },
  tabButtonTextActive: {
    color: '#E6FFF0',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 14,
  },
  headerCopy: {
    flex: 1,
  },
  headerTitle: {
    color: '#E7FFF0',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  headerSubtitle: {
    color: '#95C4A8',
    fontSize: 13,
    lineHeight: 18,
  },
  headerButton: {
    alignSelf: 'flex-start',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#224B33',
    backgroundColor: '#0B1D15',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  headerButtonText: {
    color: '#D1FFE3',
    fontWeight: '700',
  },
  mapWrapper: {
    flex: 1,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  overlayTop: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  hudCard: {
    alignSelf: 'flex-start',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#173726',
    backgroundColor: 'rgba(6, 17, 13, 0.92)',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  hudLabel: {
    color: '#95C4A8',
    fontSize: 11,
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  hudTitle: {
    color: '#45FF9A',
    fontSize: 21,
    fontWeight: '700',
    marginBottom: 4,
  },
  hudText: {
    color: '#D9FFE9',
    fontSize: 12,
  },
  overlayBottom: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 18,
    flexDirection: 'row',
    gap: 12,
  },
  primaryButton: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#45FF9A',
    backgroundColor: 'rgba(19, 56, 37, 0.96)',
    paddingVertical: 15,
  },
  primaryButtonText: {
    color: '#45FF9A',
    fontWeight: '700',
  },
  secondaryButton: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#365A47',
    backgroundColor: 'rgba(9, 18, 14, 0.94)',
    paddingVertical: 15,
  },
  secondaryButtonText: {
    color: '#D3FFE5',
    fontWeight: '700',
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  zoneCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#173726',
    backgroundColor: '#0A1711',
    padding: 16,
    marginBottom: 12,
  },
  zoneTitle: {
    color: '#E7FFF0',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  zoneMeta: {
    color: '#A2CDB1',
    fontSize: 13,
    lineHeight: 18,
  },
  zoneActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
  },
  deleteButton: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#824F4F',
    backgroundColor: '#2A1111',
    paddingVertical: 15,
  },
  deleteButtonText: {
    color: '#FFB2B2',
    fontWeight: '700',
  },
  emptyState: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#173726',
    backgroundColor: '#0A1711',
    padding: 20,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(3, 8, 6, 0.72)',
    padding: 16,
  },
  modalCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#173726',
    backgroundColor: '#07120E',
    padding: 18,
  },
  modalTitle: {
    color: '#E7FFF0',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    color: '#95C4A8',
    fontSize: 12,
    marginBottom: 6,
  },
  input: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1E402D',
    backgroundColor: '#0B1A13',
    color: '#E7FFF0',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
});

export default App;
