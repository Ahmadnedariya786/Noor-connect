import type { NavigateFunction } from "react-router-dom";

export function goBackOrFallback(navigate: NavigateFunction, fallback: string) {
  const historyState = window.history.state as { idx?: number } | null;

  if (typeof historyState?.idx === "number" && historyState.idx > 0) {
    navigate(-1);
    return;
  }

  navigate(fallback, { replace: true });
}
