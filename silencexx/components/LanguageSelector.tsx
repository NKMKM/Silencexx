import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  SafeAreaView,
} from 'react-native';
import { SUPPORTED_LANGUAGES, SupportedLanguage, LanguageConfig } from '../services/VoiceService';

interface LanguageSelectorProps {
  selectedLanguage: SupportedLanguage;
  onLanguageChange: (language: SupportedLanguage) => void;
  isDark?: boolean;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  selectedLanguage,
  onLanguageChange,
  isDark = false,
}) => {
  const [isModalVisible, setIsModalVisible] = useState(false);

  const handleLanguageSelect = (language: SupportedLanguage) => {
    onLanguageChange(language);
    setIsModalVisible(false);
  };

  const selectedConfig = SUPPORTED_LANGUAGES[selectedLanguage];
  const languages = Object.values(SUPPORTED_LANGUAGES);

  const renderLanguageItem = ({ item }: { item: LanguageConfig }) => (
    <TouchableOpacity
      style={[
        styles.languageItem,
        {
          backgroundColor:
            item.code === selectedLanguage
              ? isDark
                ? '#2a2a2a'
                : '#e3f2fd'
              : isDark
              ? '#1a1a1a'
              : '#fff',
          borderLeftColor:
            item.code === selectedLanguage ? '#2196f3' : 'transparent',
        },
      ]}
      onPress={() => handleLanguageSelect(item.code)}
    >
      <View style={styles.languageItemContent}>
        <Text
          style={[
            styles.languageItemName,
            {
              color: isDark ? '#e0e0e0' : '#333',
              fontWeight: item.code === selectedLanguage ? 'bold' : '600',
            },
          ]}
        >
          {item.nativeName}
        </Text>
        <Text
          style={[
            styles.languageItemCode,
            { color: isDark ? '#b0b0b0' : '#666' },
          ]}
        >
          {item.name}
        </Text>
      </View>
      {item.code === selectedLanguage && (
        <Text style={styles.checkmark}>✓</Text>
      )}
    </TouchableOpacity>
  );

  return (
    <>
      {/* Кнопка выбора языка */}
      <TouchableOpacity
        style={[
          styles.languageButton,
          { backgroundColor: isDark ? '#2a2a2a' : '#f5f5f5' },
        ]}
        onPress={() => setIsModalVisible(true)}
      >
        <Text style={[styles.languageButtonText, { color: isDark ? '#e0e0e0' : '#333' }]}>
          🌐 {selectedConfig.nativeName}
        </Text>
        <Text style={{ color: isDark ? '#b0b0b0' : '#666' }}>▼</Text>
      </TouchableOpacity>

      {/* Модальное окно выбора языка */}
      <Modal
        visible={isModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <SafeAreaView
          style={[
            styles.modalContainer,
            { backgroundColor: isDark ? '#1a1a1a' : '#fff' },
          ]}
        >
          <View style={styles.modalHeader}>
            <Text
              style={[
                styles.modalTitle,
                { color: isDark ? '#e0e0e0' : '#333' },
              ]}
            >
              Выберите язык
            </Text>
            <TouchableOpacity
              onPress={() => setIsModalVisible(false)}
              style={styles.closeButton}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={languages}
            renderItem={renderLanguageItem}
            keyExtractor={(item) => item.code}
            scrollEnabled
            style={{ flex: 1 }}
          />
        </SafeAreaView>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  languageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },

  languageButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },

  modalContainer: {
    flex: 1,
  },

  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },

  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },

  closeButton: {
    padding: 8,
  },

  closeButtonText: {
    fontSize: 24,
    color: '#f44336',
    fontWeight: 'bold',
  },

  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderLeftWidth: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },

  languageItemContent: {
    flex: 1,
  },

  languageItemName: {
    fontSize: 16,
  },

  languageItemCode: {
    fontSize: 12,
    marginTop: 4,
  },

  checkmark: {
    fontSize: 20,
    color: '#2196f3',
    fontWeight: 'bold',
    marginLeft: 8,
  },
});
