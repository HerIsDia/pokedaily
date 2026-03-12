/**
 * Returns true if the current connection is unlimited (not metered / cellular / data-saver).
 * Used to gate bulk image pre-caching after PWA install.
 */
export function isUnlimitedConnection(): boolean {
  if (!navigator.onLine) return false;

  // Network Information API (not yet standardized, but widely supported in Chrome/Android)
  const conn =
    (navigator as Navigator & { connection?: NetworkInformation; mozConnection?: NetworkInformation; webkitConnection?: NetworkInformation }).connection ??
    (navigator as Navigator & { mozConnection?: NetworkInformation }).mozConnection ??
    (navigator as Navigator & { webkitConnection?: NetworkInformation }).webkitConnection;

  if (!conn) return true; // API not available → assume unlimited

  if (conn.saveData) return false;
  if (conn.effectiveType && ['slow-2g', '2g', '3g'].includes(conn.effectiveType)) return false;
  if (conn.type === 'cellular') return false;

  return true;
}

// Minimal typing for the Network Information API
interface NetworkInformation {
  saveData: boolean;
  effectiveType?: '2g' | '3g' | '4g' | 'slow-2g';
  type?: 'bluetooth' | 'cellular' | 'ethernet' | 'none' | 'wifi' | 'wimax' | 'other' | 'unknown';
}
