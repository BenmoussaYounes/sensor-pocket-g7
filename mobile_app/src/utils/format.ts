/**
 * Formate un timestamp (ms epoch) en durée relative courte, en français.
 * Exemples : "à l'instant", "il y a 3 min", "il y a 2 h", "il y a 5 j".
 */
export function formatRelativeTime(timestampMs: number | null | undefined): string {
  if (!timestampMs || !Number.isFinite(timestampMs)) {
    return "Jamais";
  }

  const diffMs = Date.now() - timestampMs;
  if (diffMs < 0) {
    return "à l'instant";
  }

  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 45) {
    return "à l'instant";
  }

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) {
    return `il y a ${diffMin} min`;
  }

  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) {
    return `il y a ${diffHour} h`;
  }

  const diffDay = Math.floor(diffHour / 24);
  return `il y a ${diffDay} j`;
}
