import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, SafeAreaView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Checkbox from 'expo-checkbox';

interface InputValidationWarningProps {
  visible: boolean;
  message: string;
  hasProblematicContent: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const InputValidationWarning: React.FC<InputValidationWarningProps> = ({
  visible,
  message,
  hasProblematicContent,
  onConfirm,
  onCancel,
}) => {
  const [understood, setUnderstood] = React.useState(false);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onCancel}
    >
      <View style={styles.backdrop}>
        <SafeAreaView style={styles.centeredView}>
          <LinearGradient
            colors={hasProblematicContent ? ['#FEE2E2', '#FCA5A5'] : ['#DBEAFE', '#93C5FD']}
            style={styles.modalContent}
          >
            <View style={styles.header}>
              <Text style={styles.title}>
                {hasProblematicContent ? '⚠️ Внимание' : 'ℹ️ Уведомление'}
              </Text>
            </View>

            <View style={styles.body}>
              <Text style={styles.message}>
                {hasProblematicContent
                  ? 'Ваше сообщение содержит чувствительный контент. Если вы переживаете кризис, пожалуйста, свяжитесь с горячей линией помощи.'
                  : 'Спасибо за вашу заботу о благополучии. Помните, что это приложение — дополнение, а не замена профессиональной помощи.'}
              </Text>

              <View style={styles.checkboxContainer}>
                <Checkbox
                  value={understood}
                  onValueChange={setUnderstood}
                  color={understood ? '#3B82F6' : '#D1D5DB'}
                  style={styles.checkbox}
                />
                <Text style={styles.checkboxText}>
                  {hasProblematicContent
                    ? 'Я понимаю и хочу продолжить'
                    : 'Я прочитал(а) и готов(а) продолжить'}
                </Text>
              </View>
            </View>

            <View style={styles.footer}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={onCancel}
              >
                <Text style={styles.cancelButtonText}>Отмена</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.button,
                  styles.confirmButton,
                  !understood && styles.disabledButton,
                ]}
                onPress={onConfirm}
                disabled={!understood}
              >
                <Text style={styles.confirmButtonText}>Продолжить</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    borderRadius: 16,
    overflow: 'hidden',
    width: '100%',
    maxWidth: 360,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  body: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  message: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 21,
    marginBottom: 16,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    marginRight: 10,
    borderRadius: 4,
  },
  checkboxText: {
    fontSize: 13,
    color: '#1F2937',
    flex: 1,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
  },
  button: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  confirmButton: {
    backgroundColor: '#10B981',
  },
  confirmButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  disabledButton: {
    backgroundColor: '#D1D5DB',
    opacity: 0.6,
  },
});
