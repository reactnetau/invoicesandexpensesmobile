import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, radius, spacing, globalStyles } from '../theme';

interface Props {
  visible: boolean;
  answer: string | null;
  error: string | null;
  loading: boolean;
  financialYearLabel: string;
  onAsk: (question: string) => void;
  onClose: () => void;
}

const SUGGESTIONS = [
  'How is my cash flow looking?',
  'What should I focus on next?',
  'How much unpaid work is outstanding?',
];

export function AskAiModal({ visible, answer, error, loading, financialYearLabel, onAsk, onClose }: Props) {
  const [question, setQuestion] = useState('');

  useEffect(() => {
    if (!visible) setQuestion('');
  }, [visible]);

  const submit = (nextQuestion = question) => {
    const trimmed = nextQuestion.trim();
    if (!trimmed || loading) return;
    onAsk(trimmed);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Ask AI</Text>
              <Text style={styles.subtitle}>Uses totals only for {financialYearLabel}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.input}
            value={question}
            onChangeText={setQuestion}
            placeholder="Ask about income, expenses, profit, or unpaid invoices"
            placeholderTextColor={colors.textMuted}
            multiline
            maxLength={500}
            returnKeyType="send"
          />

          <View style={styles.suggestions}>
            {SUGGESTIONS.map((suggestion) => (
              <TouchableOpacity
                key={suggestion}
                style={styles.suggestion}
                onPress={() => {
                  setQuestion(suggestion);
                  submit(suggestion);
                }}
                disabled={loading}
              >
                <Text style={styles.suggestionText}>{suggestion}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[globalStyles.primaryButton, loading && styles.disabled]}
            onPress={() => submit()}
            disabled={loading || !question.trim()}
          >
            {loading ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Text style={globalStyles.primaryButtonText}>Ask</Text>
            )}
          </TouchableOpacity>

          {(answer || error || loading) && (
            <View style={[styles.answer, error && styles.errorAnswer]}>
              <View style={styles.answerHeader}>
                <Ionicons
                  name={error ? 'alert-circle-outline' : 'sparkles'}
                  size={16}
                  color={error ? colors.error : colors.primary}
                />
                <Text style={[styles.answerTitle, error && styles.errorTitle]}>
                  {error ? 'Something went wrong' : 'Answer'}
                </Text>
              </View>
              <Text style={styles.answerText}>
                {loading ? 'Thinking...' : error ?? answer}
              </Text>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  handle: {
    width: 42,
    height: 4,
    borderRadius: radius.full,
    backgroundColor: colors.border,
    alignSelf: 'center',
  },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  title: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
  closeButton: { padding: spacing.xs },
  input: {
    minHeight: 92,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    color: colors.text,
    fontSize: fontSize.base,
    textAlignVertical: 'top',
    backgroundColor: colors.surfaceSecondary,
  },
  suggestions: { gap: spacing.xs },
  suggestion: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primaryLight,
  },
  suggestionText: { fontSize: fontSize.sm, color: colors.primary, fontWeight: '600' },
  answer: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    backgroundColor: colors.surfaceSecondary,
  },
  errorAnswer: {
    backgroundColor: colors.errorLight,
    borderColor: colors.errorBorder,
  },
  answerHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.xs },
  answerTitle: { fontSize: fontSize.sm, fontWeight: '700', color: colors.primary },
  errorTitle: { color: colors.error },
  answerText: { fontSize: fontSize.base, color: colors.text, lineHeight: 22 },
  disabled: { opacity: 0.6 },
});
