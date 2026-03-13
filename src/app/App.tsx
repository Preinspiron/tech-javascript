import { useState, useEffect, useCallback, useRef } from 'react';
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
  getShareUrl,
  copyToClipboard,
} from './storage';
import { track } from './tracking';
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
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  const didTrackOpen = useRef(false);
  useEffect(() => {
    if (!didTrackOpen.current) {
      didTrackOpen.current = true;
      track('app', 'app', 'app_open');
    }
  }, []);

  useEffect(() => {
    const storedOffer = getStoredOfferKey();
    const storedCompany = getStoredCompanyKey();
    const params = new URLSearchParams(window.location.search);
    const urlType = params.get('type');
    const urlKey = params.get('key');

    if (urlKey && (urlType === 'offer' || urlType === 'company')) {
      track(urlKey, urlType, 'app_link_open');
      if (urlType === 'offer') {
        setOfferKey(urlKey);
        setMode('offers');
        setStoredOfferKey(urlKey);
      } else {
        setCompanyKey(urlKey);
        setMode('companies');
        setStoredCompanyKey(urlKey);
      }
      setIntroSeenState(true);
      setIntroSeen();
      window.history.replaceState({}, '', window.location.pathname);
    } else {
      setOfferKey(storedOffer);
      setCompanyKey(storedCompany);
      setIntroSeenState(getIntroSeen());
    }
  }, []);

  const loadOfferStats = useCallback(async () => {
    const raw = offerKey.trim();
    if (!raw) {
      setError('Enter offer key.');
      return;
    }
    setError(null);
    setIsLoadingStats(true);
    try {
      const data = await fetchOfferKeyStat(raw);
      setOffers(data.offers);
      setActiveOfferId(data.offers[0]?.offerId ?? null);
      setStoredOfferKey(raw);
      pushHistory('offers', raw, data.label);
      track(raw, 'offer', 'stats_loaded');
    } catch {
      setError('Failed to load offer stats. Please check key.');
    } finally {
      setIsLoadingStats(false);
    }
  }, [offerKey]);

  const loadCompanyStats = useCallback(async () => {
    const raw = companyKey.trim();
    if (!raw) {
      setError('Enter company key.');
      return;
    }
    setError(null);
    setIsLoadingStats(true);
    try {
      const data = await fetchCompanyKeyStat(raw);
      setCompanies(data.companies);
      setActiveCompanyId(data.companies[0]?.companyId ?? null);
      setStoredCompanyKey(raw);
      pushHistory('companies', raw, data.label);
      track(raw, 'company', 'stats_loaded');
    } catch {
      setError('Failed to load company stats. Please check key.');
    } finally {
      setIsLoadingStats(false);
    }
  }, [companyKey]);

  const handleContinue = useCallback(() => {
    track('intro', 'intro', 'intro_continue');
    track(offerKey.trim() || companyKey.trim() || 'app', 'app', 'continue_click');
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
    track('app', 'menu', 'menu_home');
    setIntroSeenState(false);
    setMenuOpen(false);
    setHistoryOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleShareOffer = useCallback(async () => {
    const key = offerKey.trim();
    if (!key) return;
    track(key, 'offer', 'share');
    const url = getShareUrl('offer', key);
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ url, title: 'BAFF Stats' });
        return;
      } catch {}
    }
    await copyToClipboard(url);
  }, [offerKey]);

  const handleShareCompany = useCallback(async () => {
    const key = companyKey.trim();
    if (!key) return;
    track(key, 'company', 'share');
    const url = getShareUrl('company', key);
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ url, title: 'BAFF Stats' });
        return;
      } catch {}
    }
    await copyToClipboard(url);
  }, [companyKey]);

  const handleHistoryApply = useCallback(
    async (item: HistoryItem) => {
      track(item.key, item.type === 'offers' ? 'offer' : 'company', 'history_apply');
      setHistoryOpen(false);
      setMenuOpen(false);
      setIsLoadingStats(true);
      try {
        if (item.type === 'offers') {
          setOfferKey(item.key);
          setMode('offers');
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
      } finally {
        setIsLoadingStats(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (historyOpen) track('app', 'history', 'history_open');
  }, [historyOpen]);

  return (
    <>
      <Header
        onMenuClick={() => {
          setMenuOpen((v) => {
            if (!v) track('app', 'menu', 'menu_open');
            return !v;
          });
        }}
      />
      <Menu
        open={menuOpen}
        onClose={() => {
          track('app', 'menu', 'menu_close');
          setMenuOpen(false);
        }}
        onHome={handleHome}
        onHistory={() => {
          track('app', 'menu', 'menu_history');
          setMenuOpen(false);
          setHistoryOpen(true);
        }}
        onSupportClick={() => track('app', 'menu', 'menu_support')}
      />
      {!introSeen && (
        <>
          <IntroScreen onContinue={handleContinue} onSupportClick={() => track('intro', 'intro', 'intro_support_click')} />
        </>
      )}
      {introSeen && (
        <MainScreen
          isLoadingStats={isLoadingStats}
          mode={mode}
          offerKey={offerKey}
          companyKey={companyKey}
          onModeChange={(m) => {
            setMode(m);
            track('app', 'app', m === 'offers' ? 'tab_offers' : 'tab_companies');
          }}
          onOfferKeyChange={(v) => {
            setOfferKey(v);
            setStoredOfferKey(v);
          }}
          onCompanyKeyChange={(v) => {
            setCompanyKey(v);
            setStoredCompanyKey(v);
          }}
          onResetOffer={() => {
            track(offerKey || 'empty', 'offer', 'key_reset');
            setOfferKey('');
            setStoredOfferKey('');
          }}
          onResetCompany={() => {
            track(companyKey || 'empty', 'company', 'key_reset');
            setCompanyKey('');
            setStoredCompanyKey('');
          }}
          onKeyEnter={(value: string, kind: KeyMode) => track(value, kind === 'offers' ? 'offer' : 'company', 'key_entered')}
          onShareOffer={handleShareOffer}
          onShareCompany={handleShareCompany}
          onContinue={handleContinue}
          offers={offers}
          companies={companies}
          activeOfferId={activeOfferId}
          activeCompanyId={activeCompanyId}
          onSelectOffer={(id) => {
            setActiveOfferId(id);
            track(offerKey || 'unknown', 'offer', `stats_tab_${id}`);
          }}
          onSelectCompany={(id) => {
            setActiveCompanyId(id);
            track(companyKey || 'unknown', 'company', `stats_tab_${id}`);
          }}
          error={error}
        />
      )}
      <HistoryOverlay
        open={historyOpen}
        items={getHistory()}
        onClose={() => {
          track('app', 'history', 'history_close');
          setHistoryOpen(false);
        }}
        onApply={handleHistoryApply}
        onCopyTrack={(key: string, type: KeyMode) => track(key, type === 'offers' ? 'offer' : 'company', 'history_copy')}
      />
    </>
  );
}
