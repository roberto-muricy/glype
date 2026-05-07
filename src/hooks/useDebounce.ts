import { useEffect, useState } from 'react';

/** Retorna o valor atrasado por `delay` ms. Cancela o timer se o valor mudar antes. */
export function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
