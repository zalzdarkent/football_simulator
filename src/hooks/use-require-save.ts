import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useActiveSave } from "../lib/store";
import type { Save } from "../lib/sim/types";

export function useRequireSave(): Save | null {
  const save = useActiveSave();
  const navigate = useNavigate();
  useEffect(() => {
    if (!save) navigate({ to: "/" });
  }, [save, navigate]);
  return save;
}
