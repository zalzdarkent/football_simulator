import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useActiveSave, useStore } from "../lib/store";
import type { Save } from "../lib/sim/types";

export function useRequireSave(): Save | null {
  const save = useActiveSave();
  const hydrated = useStore((s) => s.hydrated);
  const navigate = useNavigate();
  useEffect(() => {
    if (hydrated && !save) navigate({ to: "/" });
  }, [save, hydrated, navigate]);
  return save;
}
