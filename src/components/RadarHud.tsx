import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

import { formatDistance } from '../utils/geo';

type RadarHudProps = {
  status: string;
  distance: number | null;
  zoneName?: string;
};

export default function RadarHud({
  status,
  distance,
  zoneName,
}: RadarHudProps) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1200,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1200,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );

    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const ringScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.9, 1.4],
  });

  const ringOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.28, 0.04],
  });

  return (
    <View style={styles.shell}>
      <View style={styles.row}>
        <View style={styles.radar}>
          <Animated.View
            style={[
              styles.ring,
              {
                opacity: ringOpacity,
                transform: [{ scale: ringScale }],
              },
            ]}
          />
          <View style={styles.dot} />
        </View>

        <View style={styles.copy}>
          <Text style={styles.label}>RADAR STATUS</Text>
          <Text style={styles.status}>{status}</Text>
          <Text style={styles.meta}>ALVO: {zoneName ?? 'NENHUM'}</Text>
          <Text style={styles.meta}>DISTANCIA: {formatDistance(distance)}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    backgroundColor: 'rgba(7, 20, 14, 0.94)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#1B4A34',
    padding: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  radar: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 68,
    width: 68,
    marginRight: 14,
  },
  ring: {
    position: 'absolute',
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2,
    borderColor: '#45FF9A',
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#8BFF60',
    shadowColor: '#8BFF60',
    shadowOpacity: 0.8,
    shadowRadius: 10,
  },
  copy: {
    flex: 1,
  },
  label: {
    color: '#79C896',
    fontFamily: 'monospace',
    fontSize: 11,
    letterSpacing: 1.8,
  },
  status: {
    color: '#E7FFF0',
    fontFamily: 'monospace',
    fontSize: 22,
    fontWeight: '700',
    marginVertical: 2,
  },
  meta: {
    color: '#B5FFD4',
    fontFamily: 'monospace',
    fontSize: 12,
    marginTop: 2,
  },
});
