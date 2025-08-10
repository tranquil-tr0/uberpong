import { useEffect, useRef, type RefObject } from "react";

export function useKeyInterval(
  fn: (keys: Set<string>) => void,
  timeout: number
) {
  const keys: RefObject<Set<string>> = useRef(new Set());

  useEffect(() => {
    const keyDown = (event: KeyboardEvent) => {
      keys.current.add(event.key);
    };

    const keyUp = (event: KeyboardEvent) => {
      keys.current.delete(event.key);
    };

    document.addEventListener("keydown", keyDown);
    document.addEventListener("keyup", keyUp);
    const interval = setInterval(() => {
      fn(keys.current);
    }, timeout);

    return () => {
      clearInterval(interval);
      document.removeEventListener("keydown", keyDown);
      document.removeEventListener("keyup", keyUp);
    };
  }, [fn, timeout]);
}
