import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useStore } from "../lib/store";

export const Route = createFileRoute("/dashboard")({
  component: () => <Outlet />,
  beforeLoad: () => {
    // Cannot read store during SSR safely; guard in component instead.
  },
});
