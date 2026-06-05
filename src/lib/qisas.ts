// Qisas Library — thin re-export wrapper
// Re-exports all functions from data layer for convenience

export {
  loadQisasBook,
  loadProphetStory,
  loadProphetList,
  loadProphetsByEra,
  loadQisasMetadata,
  clearQisasCache,
} from "../data/qisas/index";

export type {
  QisasBook,
  ProphetStory,
  ProphetSummary,
  QisasMetadata,
} from "../data/qisas/types";
