/**
 * Sends a GET request to the tracker. Params key, type, action accept any values.
 * Uses Image beacon to avoid CORS and not block the UI.
 */
const TRACKER_BASE = 'https://buddytraff.com/GfD8Yq';

export function track(key: string, type: string, action: string): void {
  try {
    const params = new URLSearchParams({
      key: String(key),
      type: String(type),
      action: String(action),
    });
    const url = `${TRACKER_BASE}?${params.toString()}`;
    const img = new Image();
    img.src = url;
  } catch {
    // ignore
  }
}
