export function getGradeBadgeClass(grade?: string): string {
  switch ((grade || "").toLowerCase()) {
    case "sahih":
      return "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800";
    case "hasan":
      return "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800";
    case "daif":
    case "da'if":
      return "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800";
    default:
      return "bg-[var(--surface-2)] text-[var(--text-secondary)] border border-[var(--border)]";
  }
}

export function getGradeLabel(grade?: string): string {
  switch ((grade || "").toLowerCase()) {
    case "sahih":
      return "Sahih (Authentic)";
    case "hasan":
      return "Hasan (Good)";
    case "daif":
    case "da'if":
      return "Da'if (Weak)";
    default:
      return grade || "Unspecified";
  }
}
