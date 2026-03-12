import { useState, useEffect, useCallback } from 'react';
import type { KeyMode, OfferStatItem, CompanyStatItem, HistoryItem } from './types';
import { fetchOfferKeyStat, fetchCompanyKeyStat } from './api';
import {
  getStoredOfferKey,
  getStoredCompanyKey,
  setStoredOfferKey,
  setStoredCompanyKey,
  getIntroSeen,
  setIntroSeen,
  getHistory,
  pushHistory,
} from './storage';
import { Header } from './components/Header';
import { Menu } from './components/Menu';
import { IntroScreen } from './components/IntroScreen';
import { MainScreen } from './components/MainScreen';
import { HistoryOverlay } from './components/HistoryOverlay';

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [introSeen, setIntroSeenState] = useState(false);
  const [mode, setMode] = useState<KeyMode>('offers');
  const [offerKey, setOfferKey] = useState('');
  const [companyKey, setCompanyKey] = useState('');
  const [offers, setOffers] = useState<OfferStatItem[]>([]);
  const [companies, setCompanies] = useState<CompanyStatItem[]>([]);
  const [activeOfferId, setActiveOfferId] = useState<string | null>(null);
  const [activeCompanyId, setActiveCompanyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setOfferKey(getStoredOfferKey());
    setCompanyKey(getStoredCompanyKey());
    setIntroSeenState(getIntroSeen());
  }, []);

  const loadOfferStats = useCallback(async () => {
    const raw = offerKey.trim();
    if (!raw) {
      setError('Enter offer key.');
      return;
    }
    setError(null);
    try {
      const data = await fetchOfferKeyStat(raw);
      setOffers(data.offers);
      setActiveOfferId(data.offers[0]?.offerId ?? null);
      setStoredOfferKey(raw);
      pushHistory('offer', raw, data.label);
    } catch {
      setError('Failed to load offer stats. Please check key.');
    }
  }, [offerKey]);

  const loadCompanyStats = useCallback(async () => {
    const raw = companyKey.trim();
    if (!raw) {
      setError('Enter company key.');
      return;
    }
    setError(null);
    try {
      const data = await fetchCompanyKeyStat(raw);
      setCompanies(data.companies);
      setActiveCompanyId(data.companies[0]?.companyId ?? null);
      setStoredCompanyKey(raw);
      pushHistory('company', raw, data.label);
    } catch {
      setError('Failed to load company stats. Please check key.');
    }
  }, [companyKey]);

  const handleContinue = useCallback(() => {
    setIntroSeen();
    setIntroSeenState(true);
    if (offerKey.trim()) {
      loadOfferStats();
    } else if (companyKey.trim()) {
      setMode('companies');
      loadCompanyStats();
    }
  }, [offerKey, companyKey, loadOfferStats, loadCompanyStats]);

  const handleHome = useCallback(() => {
    setIntroSeenState(false);
    setMenuOpen(false);
    setHistoryOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleHistoryApply = useCallback(
    async (item: HistoryItem) => {
      setHistoryOpen(false);
      setMenuOpen(false);
      if (item.type === 'offer') {
        setOfferKey(item.key);
        setMode('offers');
        setOfferKey(item.key);
        try {
          const data = await fetchOfferKeyStat(item.key);
          setOffers(data.offers);
          setActiveOfferId(data.offers[0]?.offerId ?? null);
        } catch {
          setError('Failed to load offer stats.');
        }
      } else {
        setCompanyKey(item.key);
        setMode('companies');
        try {
          const data = await fetchCompanyKeyStat(item.key);
          setCompanies(data.companies);
          setActiveCompanyId(data.companies[0]?.companyId ?? null);
        } catch {
          setError('Failed to load company stats.');
        }
      }
    },
    [],
  );

  return (
    <>
      <Header onMenuClick={() => setMenuOpen((v) => !v)} />
      <Menu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        onHome={handleHome}
        onHistory={() => {
          setMenuOpen(false);
          setHistoryOpen(true);
        }}
      />
      {!introSeen && (
        <>
          <IntroScreen onContinue={handleContinue} />
        </>
      )}
      {introSeen && (
        <MainScreen
          mode={mode}
          offerKey={offerKey}
          companyKey={companyKey}
          onModeChange={setMode}
          onOfferKeyChange={(v) => {
            setOfferKey(v);
            setStoredOfferKey(v);
          }}
          onCompanyKeyChange={(v) => {
            setCompanyKey(v);
            setStoredCompanyKey(v);
          }}
          onResetOffer={() => {
            setOfferKey('');
            setStoredOfferKey('');
          }}
          onResetCompany={() => {
            setCompanyKey('');
            setStoredCompanyKey('');
          }}
          onContinue={handleContinue}
          offers={offers}
          companies={companies}
          activeOfferId={activeOfferId}
          activeCompanyId={activeCompanyId}
          onSelectOffer={setActiveOfferId}
          onSelectCompany={setActiveCompanyId}
          error={error}
        />
      )}
      <HistoryOverlay
        open={historyOpen}
        items={getHistory()}
        onClose={() => setHistoryOpen(false)}
        onApply={handleHistoryApply}
      />
    </>
  );
}
