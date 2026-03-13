import type { KeyMode, OfferStatItem, CompanyStatItem } from '../types';
import { KeyInputPanel } from './KeyInputPanel';
import { StatsContent } from './StatsContent';

interface MainScreenProps {
  mode: KeyMode;
  offerKey: string;
  companyKey: string;
  onModeChange: (mode: KeyMode) => void;
  onOfferKeyChange: (value: string) => void;
  onCompanyKeyChange: (value: string) => void;
  onResetOffer: () => void;
  onResetCompany: () => void;
  onShareOffer?: () => void;
  onShareCompany?: () => void;
  onContinue: () => void;
  offers: OfferStatItem[];
  companies: CompanyStatItem[];
  activeOfferId: string | null;
  activeCompanyId: string | null;
  onSelectOffer: (id: string) => void;
  onSelectCompany: (id: string) => void;
  error: string | null;
}

export function MainScreen({
  mode, offerKey, companyKey, onModeChange, onOfferKeyChange, onCompanyKeyChange,
  onResetOffer, onResetCompany, onShareOffer, onShareCompany, onContinue, offers, companies,
  activeOfferId, activeCompanyId, onSelectOffer, onSelectCompany, error,
}: MainScreenProps) {
  const hasStats = mode === 'offers' ? offers.length > 0 : companies.length > 0;
  return (
    <>
      <div className="top-tabs">
        <button type="button" className={`top-tab ${mode === 'offers' ? 'active' : ''}`} onClick={() => onModeChange('offers')}>Offers</button>
        <button type="button" className={`top-tab ${mode === 'companies' ? 'active' : ''}`} onClick={() => onModeChange('companies')}>Companies</button>
      </div>
      {mode === 'offers' && (
        <KeyInputPanel mode="offers" value={offerKey} onChange={onOfferKeyChange} onReset={onResetOffer} onShare={onShareOffer} placeholder="Paste offer key" label="Offer key" />
      )}
      {mode === 'companies' && (
        <KeyInputPanel mode="companies" value={companyKey} onChange={onCompanyKeyChange} onReset={onResetCompany} onShare={onShareCompany} placeholder="Paste company key" label="Company key" />
      )}
      <button type="button" className="btn-primary" onClick={onContinue}>Continue</button>
      {error && <div className="error">{error}</div>}
      {hasStats ? (
        <StatsContent mode={mode} offers={offers} companies={companies} activeOfferId={activeOfferId} activeCompanyId={activeCompanyId} onSelectOffer={onSelectOffer} onSelectCompany={onSelectCompany} />
      ) : (
        <div className="empty">Enter key and tap Continue.</div>
      )}
    </>
  );
}
