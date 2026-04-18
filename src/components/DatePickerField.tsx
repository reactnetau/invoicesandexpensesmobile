import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, Modal, Platform, StyleSheet,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { colors, fontSize, spacing, radius, globalStyles } from '../theme';

interface DatePickerFieldProps {
  label: string;
  value: Date;
  onChange: (date: Date) => void;
  minimumDate?: Date;
  maximumDate?: Date;
}

function formatDisplay(date: Date): string {
  return date.toLocaleDateString('en-AU', { year: 'numeric', month: 'long', day: 'numeric' });
}

export function DatePickerField({ label, value, onChange, minimumDate, maximumDate }: DatePickerFieldProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [pendingDate, setPendingDate] = useState(value);

  const handleChange = (_event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
      if (selected) onChange(selected);
    } else {
      if (selected) setPendingDate(selected);
    }
  };

  const handleConfirm = () => {
    onChange(pendingDate);
    setShowPicker(false);
  };

  const handleCancel = () => {
    setPendingDate(value);
    setShowPicker(false);
  };

  if (Platform.OS === 'android') {
    return (
      <View style={globalStyles.inputContainer}>
        <Text style={globalStyles.label}>{label}</Text>
        <TouchableOpacity style={globalStyles.input} onPress={() => setShowPicker(true)}>
          <Text style={{ fontSize: fontSize.base, color: colors.text }}>{formatDisplay(value)}</Text>
        </TouchableOpacity>
        {showPicker && (
          <DateTimePicker
            value={value}
            mode="date"
            display="default"
            onChange={handleChange}
            minimumDate={minimumDate}
            maximumDate={maximumDate}
          />
        )}
      </View>
    );
  }

  return (
    <View style={globalStyles.inputContainer}>
      <Text style={globalStyles.label}>{label}</Text>
      <TouchableOpacity
        style={globalStyles.input}
        onPress={() => { setPendingDate(value); setShowPicker(true); }}
      >
        <Text style={{ fontSize: fontSize.base, color: colors.text }}>{formatDisplay(value)}</Text>
      </TouchableOpacity>

      <Modal visible={showPicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.sheet}>
            <View style={styles.toolbar}>
              <TouchableOpacity onPress={handleCancel}>
                <Text style={styles.toolbarBtn}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleConfirm}>
                <Text style={[styles.toolbarBtn, styles.toolbarConfirm]}>Done</Text>
              </TouchableOpacity>
            </View>
            <DateTimePicker
              value={pendingDate}
              mode="date"
              display="spinner"
              onChange={handleChange}
              minimumDate={minimumDate}
              maximumDate={maximumDate}
              style={styles.picker}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingBottom: spacing.xl,
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  toolbarBtn: {
    fontSize: fontSize.base,
    color: colors.textSecondary,
  },
  toolbarConfirm: {
    color: colors.primary,
    fontWeight: '600',
  },
  picker: {
    width: '100%',
  },
});
