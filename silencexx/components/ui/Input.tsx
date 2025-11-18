import React, { forwardRef, useState } from 'react';
import {
  TextInput,
  View,
  Text,
  ViewStyle,
  TextStyle,
  TextInputProps,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/utils/ThemeContext';

export interface InputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode | string;
  rightIcon?: React.ReactNode | string;
  onRightIconPress?: () => void;
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
  labelStyle?: TextStyle;
  errorStyle?: TextStyle;
}

export const Input = forwardRef<TextInput, InputProps>(
  (
    {
      label,
      error,
      leftIcon,
      rightIcon,
      onRightIconPress,
      containerStyle,
      inputStyle,
      labelStyle,
      errorStyle,
      editable = true,
      ...props
    },
    ref
  ) => {
    const { activeTheme } = useTheme();
    const isDark = activeTheme === 'dark';
    const [isFocused, setIsFocused] = useState(false);
    const focusAnim = React.useRef(new Animated.Value(0)).current;

    const handleFocus = () => {
      setIsFocused(true);
      Animated.spring(focusAnim, {
        toValue: 1,
        useNativeDriver: false,
        tension: 40,
        friction: 7,
      }).start();
    };

    const handleBlur = () => {
      setIsFocused(false);
      Animated.spring(focusAnim, {
        toValue: 0,
        useNativeDriver: false,
        tension: 40,
        friction: 7,
      }).start();
    };

    const borderColor = focusAnim.interpolate({
      inputRange: [0, 1],
      outputRange: error
        ? [isDark ? 'rgba(239, 68, 68, 0.4)' : '#ef4444', isDark ? 'rgba(239, 68, 68, 0.6)' : '#dc2626']
        : [isDark ? 'rgba(139, 92, 246, 0.2)' : 'rgba(139, 92, 246, 0.3)', isDark ? '#a78bfa' : '#8b5cf6'],
    });

    const shadowOpacity = focusAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, isDark ? 0.3 : 0.15],
    });

    const getInputContainerStyle = (): ViewStyle => ({
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 48,
      borderRadius: 16,
      paddingHorizontal: 16,
      gap: 12,
      backgroundColor: isDark ? 'rgba(30, 41, 59, 0.5)' : 'rgba(255, 255, 255, 0.7)',
    });

    const getInputTextStyle = (): TextStyle => ({
      flex: 1,
      fontSize: 15,
      color: isDark ? '#f1f5f9' : '#1e293b',
      fontWeight: '400',
      paddingVertical: 12,
    });

    const getLabelTextStyle = (): TextStyle => ({
      fontSize: 14,
      fontWeight: '600',
      color: isDark ? '#e2e8f0' : '#475569',
      marginBottom: 8,
    });

    const getErrorTextStyle = (): TextStyle => ({
      fontSize: 12,
      color: isDark ? '#f87171' : '#dc2626',
      marginTop: 6,
    });

    const renderIcon = (icon: React.ReactNode | string, size: number = 22) => {
      if (typeof icon === 'string') {
        return (
          <Ionicons
            name={icon as any}
            size={size}
            color={isDark ? '#94a3b8' : '#64748b'}
          />
        );
      }
      return icon;
    };

    return (
      <View style={containerStyle}>
        {label && <Text style={[getLabelTextStyle(), labelStyle]}>{label}</Text>}
        <Animated.View
          style={[
            getInputContainerStyle(),
            {
              borderWidth: 2,
              borderColor: borderColor,
              shadowColor: isDark ? '#a78bfa' : '#8b5cf6',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: shadowOpacity,
              shadowRadius: 12,
              elevation: isFocused ? 8 : 2,
            },
          ]}
        >
          {leftIcon && renderIcon(leftIcon)}
          <TextInput
            ref={ref}
            style={[getInputTextStyle(), inputStyle]}
            placeholderTextColor={isDark ? '#64748b' : '#94a3b8'}
            editable={editable}
            onFocus={handleFocus}
            onBlur={handleBlur}
            textContentType="none"
            importantForAutofill="no"
            autoComplete="off"
            {...props}
          />
          {rightIcon && onRightIconPress ? (
            <TouchableOpacity onPress={onRightIconPress} activeOpacity={0.6}>
              {renderIcon(rightIcon)}
            </TouchableOpacity>
          ) : rightIcon ? (
            renderIcon(rightIcon)
          ) : null}
        </Animated.View>
        {error && <Text style={[getErrorTextStyle(), errorStyle]}>{error}</Text>}
      </View>
    );
  }
);


Input.displayName = 'Input';

