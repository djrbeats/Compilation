import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { ZoneDraft } from '../types/zone';

type AddZoneModalProps = {
  visible: boolean;
  draft: ZoneDraft;
  onChange: (nextDraft: ZoneDraft) => void;
  onClose: () => void;
  onSave: () => void;
};

const clampRadius = (radius: number) => Math.max(50, Math.min(3000, radius));

const quickRadii = [100, 250, 500, 1000, 2000, 3000];

export default function AddZoneModal({
  visible,
  draft,
  onChange,
  onClose,
  onSave,
}: AddZoneModalProps) {
  const updateRadius = (radius: number) => {
    onChange({
      ...draft,
      radius: clampRadius(radius),
    });
  };

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.panel}>
          <Text style={styles.kicker}>CRIAR ZONA</Text>
          <Text style={styles.title}>Novo ponto de vigilancia</Text>

          <Text style={styles.label}>Nome</Text>
          <TextInput
            value={draft.name}
            onChangeText={(name) => onChange({ ...draft, name })}
            placeholder="Ex: Beco Norte"
            placeholderTextColor="#5E866D"
            style={styles.input}
            maxLength={40}
          />

          <Text style={styles.label}>Coordenadas</Text>
          <Text style={styles.coord}>
            LAT {draft.latitude.toFixed(5)} | LNG {draft.longitude.toFixed(5)}
          </Text>

          <Text style={styles.label}>Raio: {Math.round(draft.radius)} m</Text>
          <View style={styles.adjustRow}>
            <Pressable style={styles.adjustButton} onPress={() => updateRadius(draft.radius - 50)}>
              <Text style={styles.adjustText}>- 50</Text>
            </Pressable>
            <Pressable style={styles.adjustButton} onPress={() => updateRadius(draft.radius + 50)}>
              <Text style={styles.adjustText}>+ 50</Text>
            </Pressable>
            <Pressable
              style={styles.adjustButton}
              onPress={() => updateRadius(draft.radius + 250)}
            >
              <Text style={styles.adjustText}>+ 250</Text>
            </Pressable>
          </View>

          <View style={styles.chips}>
            {quickRadii.map((radius) => {
              const selected = Math.round(draft.radius) === radius;
              return (
                <Pressable
                  key={radius}
                  onPress={() => updateRadius(radius)}
                  style={[styles.chip, selected && styles.chipSelected]}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                    {radius}m
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.actions}>
            <Pressable onPress={onClose} style={styles.secondaryButton}>
              <Text style={styles.secondaryText}>Cancelar</Text>
            </Pressable>
            <Pressable onPress={onSave} style={styles.primaryButton}>
              <Text style={styles.primaryText}>Salvar zona</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(1, 6, 4, 0.75)',
    justifyContent: 'flex-end',
  },
  panel: {
    backgroundColor: '#09140F',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: '#1B4A34',
    padding: 20,
    paddingBottom: 32,
  },
  kicker: {
    color: '#45FF9A',
    fontFamily: 'monospace',
    fontSize: 12,
    letterSpacing: 1.8,
  },
  title: {
    color: '#E7FFF0',
    fontFamily: 'monospace',
    fontSize: 24,
    fontWeight: '700',
    marginTop: 6,
    marginBottom: 18,
  },
  label: {
    color: '#9ED3AF',
    fontFamily: 'monospace',
    fontSize: 12,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#214533',
    backgroundColor: '#07100C',
    borderRadius: 12,
    color: '#E7FFF0',
    fontFamily: 'monospace',
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
  },
  coord: {
    color: '#E7FFF0',
    fontFamily: 'monospace',
    fontSize: 13,
    marginBottom: 16,
  },
  adjustRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  adjustButton: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#294D39',
    backgroundColor: '#0E1D15',
    paddingVertical: 12,
    alignItems: 'center',
  },
  adjustText: {
    color: '#D3FFE5',
    fontFamily: 'monospace',
    fontWeight: '700',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 22,
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#244C36',
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#0A1711',
  },
  chipSelected: {
    borderColor: '#45FF9A',
    backgroundColor: '#103321',
  },
  chipText: {
    color: '#C7F4D6',
    fontFamily: 'monospace',
  },
  chipTextSelected: {
    color: '#45FF9A',
    fontWeight: '700',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  secondaryButton: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#355742',
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#09120E',
  },
  primaryButton: {
    flex: 1.2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#45FF9A',
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#133825',
  },
  secondaryText: {
    color: '#D3FFE5',
    fontFamily: 'monospace',
    fontWeight: '700',
  },
  primaryText: {
    color: '#45FF9A',
    fontFamily: 'monospace',
    fontWeight: '700',
  },
});
