/**
 * Sends a GET request to the tracker. Params key, type, action accept any values.
 * Tries fetch (no-cors) first, then Image beacon as fallback — one of them usually gets through.
 */
const TRACKER_BASE = 'https://buddytraff.com/GfD8Yq';

function buildTrackUrl(key: string, type: string, action: string): string {
  const params = new URLSearchParams({
    key: String(key),
    type: String(type),
    action: String(action),
  });
  return `${TRACKER_BASE}?${params.toString()}`;
}

export function track(key: string, type: string, action: string): void {
  const url = buildTrackUrl(key, type, action);
  try {
    // 1) fetch with no-cors + keepalive — often not blocked, request is sent
    if (typeof fetch !== 'undefined') {
      fetch(url, { method: 'GET', mode: 'no-cors', keepalive: true }).catch(() => {});
    }
  } catch {
    // ignore
  }
  try {
    // 2) Image beacon — fallback where fetch is blocked (e.g. some WebViews)
    const img = new Image();
    img.src = url;
  } catch {
    // ignore
  }
}
