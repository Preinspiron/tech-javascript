export type KeyMode = 'offers' | 'companies';

export interface StatBlock {
  clicks: number;
  uniques: number;
  spent: number;
  regs: number;
  depositsSalesCount: number;
  regToDepSalePercent: number;
  uniqueToConvPercent: number;
  costPerConversion: number;
  costPerDepSale: number;
  offerName?: string | null;
  companyName?: string | null;
}

export interface OfferStatItem {
  offerId: string;
  offerName: string | null;
  all: StatBlock;
  yesterday: StatBlock;
  today: StatBlock;
}

export interface CompanyStatItem {
  companyId: string;
  all: StatBlock;
  yesterday: StatBlock;
  today: StatBlock;
}

export interface OfferKeyStatResponse {
  key: string;
  label: string | null;
  type: 'offer';
  offers: OfferStatItem[];
}

export interface CompanyKeyStatResponse {
  key: string;
  label: string | null;
  type: 'company';
  companies: CompanyStatItem[];
}

export interface HistoryItem {
  type: KeyMode;
  key: string;
  label: string | null;
  ts: string;
}
