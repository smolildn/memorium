import { useCallback, useState } from "react";

export function useLocalFlag(key: string): [boolean, () => void] {
  const [done, setDone] = useState(() => localStorage.getItem(key) === "1");

  const markDone = useCallback(() => {
    localStorage.setItem(key, "1");
    setDone(true);
  }, [key]);

  return [done, markDone];
}
