import { useEffect } from "react";
import { useStore } from "../lib/store";

export function StoreHydrator() {
  const hydrate = useStore((s) => s.hydrate);
  const hydrated = useStore((s) => s.hydrated);

  useEffect(() => {
    if (!hydrated) hydrate();
  }, [hydrate, hydrated]);

  return null;
}
