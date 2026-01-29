import { useState, useEffect, type Dispatch, type SetStateAction } from 'react';

/**
 * Custom hook that debounces a value.
 * @param value The value to debounce.
 * @param delay The delay in milliseconds.
 * @returns The debounced value.
 */
export const useDebounce = <T>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    // Set a timer to update the debounced value after the delay
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Cancel the timeout if value changes (e.g., user keeps typing) or if the component unmounts
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// Also exporting a helper to create a debounced setter for convenience
export const useDebouncedSetter = <T>(
  setter: Dispatch<SetStateAction<T>>,
  delay: number,
  initialValue: T
): [T, Dispatch<SetStateAction<T>>] => {
  const [value, setValue] = useState(initialValue);
  const debouncedValue = useDebounce(value, delay);

  useEffect(() => {
    setter(debouncedValue);
  }, [debouncedValue, setter]);

  return [value, setValue];
};
