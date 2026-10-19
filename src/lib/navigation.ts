import type { NavigateFunction } from "react-router-dom";

export function goBackOrFallback(navigate: NavigateFunction, fallback: string) {
  navigate(fallback, { replace: true });
}
