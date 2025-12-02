import { useEffect, useRef } from 'react';
import { Keyboard, KeyboardEvent, Platform } from 'react-native';

interface UseKeyboardHandlerOptions {
  onKeyboardShow?: (event: KeyboardEvent) => void;
  onKeyboardHide?: (event: KeyboardEvent) => void;
}

export function useKeyboardHandler({
  onKeyboardShow,
  onKeyboardHide,
}: UseKeyboardHandlerOptions = {}) {
  const keyboardShowListener = useRef<any>();
  const keyboardHideListener = useRef<any>();

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    keyboardShowListener.current = Keyboard.addListener(showEvent, (event) => {
      onKeyboardShow?.(event);
    });

    keyboardHideListener.current = Keyboard.addListener(hideEvent, (event) => {
      onKeyboardHide?.(event);
    });

    return () => {
      keyboardShowListener.current?.remove();
      keyboardHideListener.current?.remove();
    };
  }, [onKeyboardShow, onKeyboardHide]);
}
