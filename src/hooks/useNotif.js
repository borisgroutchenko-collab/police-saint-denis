import { useState, useCallback } from 'react';

export function useNotif() {
  const [notif, setNotif] = useState({ msg: '', isError: false, visible: false });

  const showNotif = useCallback((msg, isError = false) => {
    setNotif({ msg, isError, visible: true });
    setTimeout(() => setNotif(n => ({ ...n, visible: false })), 3500);
  }, []);

  return { notif, showNotif };
}
