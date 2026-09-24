import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  View,
} from 'react-native';
import { Theme } from '@/constants/theme';

export interface ButtonProps {
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  children?: React.ReactNode;
  icon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function Button({
  onPress,
  disabled = false,
  loading = false,
  variant = 'default',
  size = 'default',
  children,
  icon,
  style,
  textStyle,
}: ButtonProps) {
  const isDark = true; // Force dark theme

  const getContainerStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 8,
      gap: 8,
    };

    const sizeStyles: Record<string, ViewStyle> = {
      default: { height: 36, paddingHorizontal: 16, paddingVertical: 8 },
      sm: { height: 32, paddingHorizontal: 12, paddingVertical: 4 },
      lg: { height: 40, paddingHorizontal: 24, paddingVertical: 8 },
      icon: { height: 36, width: 36, paddingHorizontal: 0 },
    };

    const variantStyles: Record<string, ViewStyle> = {
      default: {
        backgroundColor: Theme.accent.primary,
      },
      destructive: {
        backgroundColor: 'rgba(239, 68, 68, 0.6)',
      },
      outline: {
        backgroundColor: 'rgba(55, 65, 81, 0.3)',
        borderWidth: 1,
        borderColor: '#374151',
      },
      secondary: {
        backgroundColor: '#374151',
      },
      ghost: {
        backgroundColor: 'transparent',
      },
      link: {
        backgroundColor: 'transparent',
        paddingHorizontal: 0,
      },
    };

    return {
      ...baseStyle,
      ...sizeStyles[size],
      ...variantStyles[variant],
      ...(disabled && { opacity: 0.5 }),
      ...style,
    };
  };

  const getTextStyle = (): TextStyle => {
    const baseStyle: TextStyle = {
      fontSize: 14,
      fontWeight: '500',
      textAlign: 'center',
    };

    const sizeStyles: Record<string, TextStyle> = {
      default: { fontSize: 14 },
      sm: { fontSize: 13 },
      lg: { fontSize: 16 },
      icon: { fontSize: 14 },
    };

    const variantStyles: Record<string, TextStyle> = {
      default: { color: '#ffffff' },
      destructive: { color: '#ffffff' },
      outline: { color: Theme.text.primary },
      secondary: { color: Theme.text.primary },
      ghost: { color: Theme.text.primary },
      link: {
        color: Theme.accent.primary,
        textDecorationLine: 'underline',
      },
    };

    return {
      ...baseStyle,
      ...sizeStyles[size],
      ...variantStyles[variant],
      ...textStyle,
    };
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
      style={getContainerStyle()}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'default' || variant === 'destructive' ? '#ffffff' : Theme.accent.primary}
        />
      ) : (
        <>
          {icon && <View>{icon}</View>}
          {typeof children === 'string' ? (
            <Text style={getTextStyle()}>{children}</Text>
          ) : (
            children
          )}
        </>
      )}
    </TouchableOpacity>
  );
}
