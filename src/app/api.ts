import type { OfferKeyStatResponse, CompanyKeyStatResponse } from './types';

const BASE = '';

export async function fetchOfferKeyStat(key: string): Promise<OfferKeyStatResponse> {
  const res = await fetch(`${BASE}/bot/offer-key-stat?key=${encodeURIComponent(key)}`);
  if (!res.ok) throw new Error('Request failed: ' + res.status);
  return res.json();
}

export async function fetchCompanyKeyStat(key: string): Promise<CompanyKeyStatResponse> {
  const res = await fetch(`${BASE}/bot/company-key-stat?key=${encodeURIComponent(key)}`);
  if (!res.ok) throw new Error('Request failed: ' + res.status);
  return res.json();
}
