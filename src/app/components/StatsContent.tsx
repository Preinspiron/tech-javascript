import type { KeyMode, OfferStatItem, CompanyStatItem } from '../types';
import { StatCard } from './StatCard';

interface StatsContentProps {
  mode: KeyMode;
  offers: OfferStatItem[];
  companies: CompanyStatItem[];
  activeOfferId: string | null;
  activeCompanyId: string | null;
  onSelectOffer: (id: string) => void;
  onSelectCompany: (id: string) => void;
}

export function StatsContent({
  mode, offers, companies, activeOfferId, activeCompanyId, onSelectOffer, onSelectCompany,
}: StatsContentProps) {
  const items = mode === 'offers' ? offers : companies;
  if (!items.length) return null;
  const activeOffer = mode === 'offers' ? offers.find((o) => o.offerId === activeOfferId) : null;
  const activeCompany = mode === 'companies' ? companies.find((c) => c.companyId === activeCompanyId) : null;
  const active = mode === 'offers' ? activeOffer : activeCompany;

  return (
    <>
      <div className="tabs">
        {mode === 'offers' && offers.map((o) => (
          <button
            key={o.offerId}
            type="button"
            className={`tab ${o.offerId === activeOfferId ? 'active' : ''}`}
            onClick={() => onSelectOffer(o.offerId)}
          >
            {o.offerName ? `${o.offerId} | ${o.offerName}` : `Offer ${o.offerId}`}
          </button>
        ))}
        {mode === 'companies' && companies.map((c) => (
          <button
            key={c.companyId}
            type="button"
            className={`tab ${c.companyId === activeCompanyId ? 'active' : ''}`}
            onClick={() => onSelectCompany(c.companyId)}
          >
            {c.all.companyName ? `${c.companyId} | ${c.all.companyName}` : `Company ${c.companyId}`}
          </button>
        ))}
      </div>
      <div className="periods">
        {active && (
          <>
            <StatCard title="All time" data={active.all} />
            <StatCard title="Yesterday" data={active.yesterday} />
            <StatCard title="Today" data={active.today} />
          </>
        )}
      </div>
    </>
  );
}
