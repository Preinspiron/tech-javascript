import type { KeyMode, HistoryItem } from './types';

const STORAGE_KEYS = {
  offerKey: 'baff_offer_key',
  companyKey: 'baff_company_key',
  history: 'baff_keys_history',
  introSeen: 'baff_intro_seen',
} as const;

export function getStoredOfferKey(): string {
  try {
    return localStorage.getItem(STORAGE_KEYS.offerKey) || '';
  } catch {
    return '';
  }
}

export function getStoredCompanyKey(): string {
  try {
    return localStorage.getItem(STORAGE_KEYS.companyKey) || '';
  } catch {
    return '';
  }
}

export function setStoredOfferKey(key: string): void {
  try {
    if (key) localStorage.setItem(STORAGE_KEYS.offerKey, key);
    else localStorage.removeItem(STORAGE_KEYS.offerKey);
  } catch {}
}

export function setStoredCompanyKey(key: string): void {
  try {
    if (key) localStorage.setItem(STORAGE_KEYS.companyKey, key);
    else localStorage.removeItem(STORAGE_KEYS.companyKey);
  } catch {}
}

export function getIntroSeen(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEYS.introSeen) === '1';
  } catch {
    return false;
  }
}

export function setIntroSeen(): void {
  try {
    localStorage.setItem(STORAGE_KEYS.introSeen, '1');
  } catch {}
}

export function getHistory(): HistoryItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.history) || '[]';
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function pushHistory(type: KeyMode, key: string, label: string | null): void {
  try {
    const list = getHistory();
    const item: HistoryItem = { type, key, label, ts: new Date().toISOString() };
    const filtered = list.filter((x) => x.key !== key);
    filtered.unshift(item);
    const limited = filtered.slice(0, 20);
    localStorage.setItem(STORAGE_KEYS.history, JSON.stringify(limited));
  } catch {}
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** Build share URL with type and key so opener gets the key pre-filled. */
export function getShareUrl(type: 'offer' | 'company', key: string): string {
  const base = typeof window !== 'undefined'
    ? `${window.location.origin}${window.location.pathname}`
    : '';
  const params = new URLSearchParams({ type, key });
  return `${base}?${params.toString()}`;
}
