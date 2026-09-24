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
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '@/constants/theme';

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
  onInputFocus?: () => void;
  onInputBlur?: () => void;
}

export const Input = forwardRef<TextInput, InputProps>(
  (
    {
      label,
      error,
      leftIcon,
      rightIcon,
      onRightIconPress,
      onInputFocus,
      onInputBlur,
      containerStyle,
      inputStyle,
      labelStyle,
      errorStyle,
      editable = true,
      ...props
    },
    ref
  ) => {
    const isDark = true; // Force dark theme
    const [isFocused, setIsFocused] = useState(false);
    const focusAnim = React.useRef(new Animated.Value(0)).current;

    const handleFocus = () => {
      setIsFocused(true);
      onInputFocus?.();
      Animated.spring(focusAnim, {
        toValue: 1,
        useNativeDriver: false,
        tension: 40,
        friction: 7,
      }).start();
    };

    const handleBlur = () => {
      setIsFocused(false);
      onInputBlur?.();
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
        ? [Theme.status.error, Theme.status.error]
        : [Theme.border.primary, Theme.accent.primary],
    });

    const shadowOpacity = focusAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 0.35],
    });

    const getInputContainerStyle = (): ViewStyle => ({
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 58,
      borderRadius: Theme.radius.lg,
      paddingHorizontal: 18,
      gap: 14,
      backgroundColor: Theme.background.tertiary,
    });

    const getInputTextStyle = (): TextStyle => ({
      flex: 1,
      fontSize: 16,
      color: Theme.text.primary,
      fontWeight: '400',
      paddingVertical: 16,
    });

    const getLabelTextStyle = (): TextStyle => ({
      fontSize: 14,
      fontWeight: '600',
      color: Theme.text.secondary,
      marginBottom: 10,
    });

    const getErrorTextStyle = (): TextStyle => ({
      fontSize: 12,
      color: Theme.status.error,
      marginTop: 8,
    });

    const renderIcon = (icon: React.ReactNode | string, size: number = 22) => {
      if (typeof icon === 'string') {
        return (
          <Ionicons
            name={icon as any}
            size={size}
            color={Theme.text.secondary}
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
              borderWidth: 1.5,
              borderColor: borderColor,
              shadowColor: Theme.accent.primary,
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: Platform.OS === 'ios' ? shadowOpacity : 0,
              shadowRadius: 18,
              elevation: Platform.OS === 'ios' ? (isFocused ? 10 : 3) : 0,
            },
          ]}
        >
          {leftIcon && renderIcon(leftIcon)}
          <TextInput
            ref={ref}
            style={[getInputTextStyle(), inputStyle]}
            placeholderTextColor={Theme.text.tertiary}
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

