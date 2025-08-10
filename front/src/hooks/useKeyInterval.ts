import { useEffect, useRef } from "react";

export function useKeyInterval(fn: () => void, timeout: number) {
  const keys = useRef(new Set());

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
      fn();
    }, timeout);

    return () => {
      clearInterval(interval);
      document.removeEventListener("keydown", keyDown);
      document.removeEventListener("keyup", keyUp);
    };
  });
}
