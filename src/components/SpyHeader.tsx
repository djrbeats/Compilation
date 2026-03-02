import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type SpyHeaderProps = {
  title: string;
  subtitle?: string;
  rightLabel?: string;
  onRightPress?: () => void;
};

export default function SpyHeader({
  title,
  subtitle,
  rightLabel,
  onRightPress,
}: SpyHeaderProps) {
  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.row}>
        <View style={styles.copy}>
          <Text style={styles.kicker}>SPY RADAR</Text>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>

        {rightLabel && onRightPress ? (
          <Pressable onPress={onRightPress} style={styles.button}>
            <Text style={styles.buttonLabel}>{rightLabel}</Text>
          </Pressable>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: 'rgba(6, 17, 13, 0.96)',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingBottom: 14,
    paddingTop: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#123322',
  },
  copy: {
    flex: 1,
    paddingRight: 12,
  },
  kicker: {
    color: '#45FF9A',
    fontFamily: 'monospace',
    fontSize: 12,
    letterSpacing: 2,
  },
  title: {
    color: '#E7FFF0',
    fontFamily: 'monospace',
    fontSize: 24,
    fontWeight: '700',
    marginTop: 2,
  },
  subtitle: {
    color: '#87C7A0',
    fontFamily: 'monospace',
    fontSize: 12,
    marginTop: 4,
  },
  button: {
    borderWidth: 1,
    borderColor: '#45FF9A',
    backgroundColor: '#0B2218',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  buttonLabel: {
    color: '#45FF9A',
    fontFamily: 'monospace',
    fontWeight: '700',
  },
});
