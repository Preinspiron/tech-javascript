import { useState, useCallback, useEffect, useMemo, useRef } from 'react';

import aviatorImg from './assets/aviator.png';
import chickenImg from './assets/chicken.webp';

const PREDICTION_DURATION_MS = 1000;

type MenuTab = 'signals' | 'share';

const WELCOME_STORAGE_KEY = 'baff_predict_welcome_seen';
type SignalGame = 'aviator' | 'chicken' | null;
type Corner = 'left' | 'right';
type PredictionPhase = 'idle' | 'running' | 'done';

function getUrlParams(): {
  link: string | null;
  registerUrl: string | null;
  corner: Corner;
  topPercent: number;
  limit: number;
} {
  if (typeof window === 'undefined') return { link: null, registerUrl: null, corner: 'right', topPercent: 0, limit: 3 };
  const params = new URLSearchParams(window.location.search);
  let link: string | null = params.get('link') || params.get('url') || null;
  if (link) {
    link = link.trim();
    if (link.startsWith('t.me/')) link = 'https://' + link;
    else if (!link.startsWith('http')) link = null;
  }
  let registerUrl: string | null = params.get('register') || params.get('registerUrl') || null;
  if (registerUrl) {
    registerUrl = registerUrl.trim();
    if (registerUrl.startsWith('t.me/')) registerUrl = 'https://' + registerUrl;
    else if (!registerUrl.startsWith('http')) registerUrl = null;
  }
  const cornerRaw = params.get('corner')?.toLowerCase() || 'right';
  const cornerMatch = cornerRaw.match(/^(left|right)(?:_(\d+))?$/);
  const corner = (cornerMatch?.[1] === 'left' ? 'left' : 'right') as Corner;
  const topPercent = Math.min(100, Math.max(0, parseInt(cornerMatch?.[2] ?? '0', 10) || 0));
  const limit = Math.min(10, Math.max(1, parseInt(params.get('limit') ?? '3', 10) || 3));
  return { link, registerUrl, corner, topPercent, limit };
}

function randomInRange(min: number, max: number): number {
  return Math.round((min + Math.random() * (max - min)) * 100) / 100;
}

const INSTRUCTION = (
  <>
    <strong>Instruction:</strong>
    <br />
    1. Open the game.
    <br />
    2. Start prediction and wait for the AI.
    <br />
    3. Press &quot;Back to game&quot; to place your bet.
  </>
);

export default function AppCasino() {
  const { link, registerUrl, corner, topPercent, limit } = useMemo(getUrlParams, []);

  const [showWelcome, setShowWelcome] = useState(() => {
    if (typeof window === 'undefined') return false;
    return !window.localStorage.getItem(WELCOME_STORAGE_KEY);
  });
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<MenuTab>('signals');
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [overlayGame, setOverlayGame] = useState<SignalGame>(null);
  const [shareOverlayOpen, setShareOverlayOpen] = useState(false);
  const [copyDone, setCopyDone] = useState(false);

  const [predictionPhase, setPredictionPhase] = useState<PredictionPhase>('idle');
  const [displayValue, setDisplayValue] = useState(0);
  const [targetValue, setTargetValue] = useState(0);
  const [countdownSeconds, setCountdownSeconds] = useState(0);
  const animRef = useRef<number | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const openSignalOverlay = useCallback((game: 'aviator' | 'chicken') => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    setCountdownSeconds(0);
    setOverlayGame(game);
    setDisplayValue(0);
    setTargetValue(0);
    setPredictionPhase('idle');
    setOverlayOpen(true);
    setMenuOpen(false);
  }, []);

  const closeOverlay = useCallback(() => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    setCountdownSeconds(0);
    if (animRef.current != null) cancelAnimationFrame(animRef.current);
    setOverlayOpen(false);
    setOverlayGame(null);
    setPredictionPhase('idle');
  }, []);

  const startPrediction = useCallback(() => {
    if (predictionPhase === 'done' && countdownSeconds > 0) return;
    const target = limit <= 1 ? 1 : randomInRange(1, limit);
    setTargetValue(target);
    setPredictionPhase('running');
    setDisplayValue(0);
  }, [limit, predictionPhase, countdownSeconds]);

  useEffect(() => {
    if (predictionPhase !== 'running') return;
    const start = performance.now();
    const run = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(1, elapsed / PREDICTION_DURATION_MS);
      const eased = 1 - (1 - progress) * (1 - progress);
      setDisplayValue(targetValue * eased);
      if (progress < 1) {
        animRef.current = requestAnimationFrame(run);
      } else {
        setDisplayValue(targetValue);
        setPredictionPhase('done');
        setCountdownSeconds(5);
        animRef.current = null;
      }
    };
    animRef.current = requestAnimationFrame(run);
    return () => {
      if (animRef.current != null) cancelAnimationFrame(animRef.current);
    };
  }, [predictionPhase, targetValue]);

  useEffect(() => {
    if (countdownSeconds !== 5 || countdownRef.current) return;
    countdownRef.current = setInterval(() => {
      setCountdownSeconds((prev) => {
        if (prev <= 1) {
          if (countdownRef.current) {
            clearInterval(countdownRef.current);
            countdownRef.current = null;
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [countdownSeconds]);

  const openMenu = useCallback(() => {
    setMenuOpen((v) => !v);
    setActiveTab('signals');
  }, []);

  const selectTab = useCallback((tab: MenuTab) => {
    if (tab === 'share') {
      setShareOverlayOpen(true);
      setMenuOpen(false);
      setCopyDone(false);
      return;
    }
    setActiveTab(tab);
  }, []);

  const closeMenu = useCallback(() => setMenuOpen(false), []);

  const handleCopyLink = useCallback(async () => {
    const urlToCopy = link || (typeof window !== 'undefined' ? window.location.href : '');
    if (!urlToCopy) return;
    try {
      await navigator.clipboard.writeText(urlToCopy);
      setCopyDone(true);
      setTimeout(() => setCopyDone(false), 2000);
    } catch {
      setCopyDone(false);
    }
  }, [link]);

  const handleNativeShare = useCallback(async () => {
    const urlToShare = link || (typeof window !== 'undefined' ? window.location.href : '');
    if (!urlToShare) return;
    try {
      if (navigator.share) {
        await navigator.share({
          url: urlToShare,
          title: link ? 'Channel' : document.title || 'Share',
          text: link ? 'Check out this channel' : undefined,
        });
      } else {
        await handleCopyLink();
      }
    } catch {
      /* cancelled */
    }
  }, [link, handleCopyLink]);

  const closeShareOverlay = useCallback(() => setShareOverlayOpen(false), []);

  const closeWelcome = useCallback(() => {
    try {
      window.localStorage.setItem(WELCOME_STORAGE_KEY, '1');
    } catch {
      /* ignore */
    }
    setShowWelcome(false);
  }, []);

  const closeWelcomeAndOpenMenu = useCallback(() => {
    closeWelcome();
    setMenuOpen(true);
  }, [closeWelcome]);

  const gameLabel = overlayGame === 'aviator' ? 'Aviator' : overlayGame === 'chicken' ? 'Chicken Road' : '';
  const gameImage = overlayGame === 'aviator' ? aviatorImg : overlayGame === 'chicken' ? chickenImg : '';

  const tabs: { id: MenuTab; label: string; labelTwoLines?: boolean }[] = [
    { id: 'signals', label: 'Choose signal', labelTwoLines: true },
    { id: 'share', label: 'Share' },
  ];

  const menuTriggerStyle = useMemo(
    () => ({ top: topPercent ? `${topPercent}%` : undefined }) as React.CSSProperties,
    [topPercent],
  );

  return (
    <>
      {showWelcome && (
        <div
          className="casino-welcome-overlay"
          onClick={(e) => { if (e.target === e.currentTarget) closeWelcome(); }}
          role="presentation"
        >
          <div className="casino-welcome-content" onClick={(e) => e.stopPropagation()}>
            <h1 className="casino-welcome-title">New Gen Prediction 2.0</h1>
            <div className="casino-welcome-links">
              <a
                href={registerUrl || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="casino-welcome-link"
              >
                Register
              </a>
              <span className="casino-welcome-sep">|</span>
              <button type="button" className="casino-welcome-link casino-welcome-btn" onClick={closeWelcome}>
                Go to game
              </button>
              <span className="casino-welcome-sep">|</span>
              <button type="button" className="casino-welcome-link casino-welcome-btn" onClick={closeWelcomeAndOpenMenu}>
                Prediction menu
              </button>
            </div>
          </div>
        </div>
      )}

      <button
        type="button"
        className={`casino-menu-trigger casino-menu-trigger--tab casino-menu-trigger--${corner} ${menuOpen ? 'casino-menu-trigger--open' : ''} ${showWelcome || shareOverlayOpen || (overlayOpen && !!overlayGame) ? 'casino-menu-trigger--away' : ''}`}
        style={topPercent > 0 ? menuTriggerStyle : undefined}
        onClick={openMenu}
        aria-label="Predict Service"
      >
        <span className="casino-menu-trigger-vertical">Predict</span>
      </button>

      {!showWelcome && menuOpen && (
        <div className="casino-menu-panel">
          <div className="casino-menu-panel-header">
             <div className="casino-menu-tabs">
              {tabs.map(({ id, label, labelTwoLines }) => (
                <button
                  key={id}
                  type="button"
                  className={`casino-menu-tab ${activeTab === id ? 'active' : ''} ${labelTwoLines ? 'casino-menu-tab--two-line' : ''}`}
                  onClick={() => {
                    if (id === 'share') selectTab('share');
                    else setActiveTab(id);
                  }}
                >
                  {labelTwoLines ? (
                    <>
                      <span className="casino-menu-tab-line">Choose</span>
                      <span className="casino-menu-tab-line">signal</span>
                    </>
                  ) : (
                    label
                  )}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="casino-menu-close-btn"
              onClick={closeMenu}
              aria-label="Close"
            >
              ×
            </button>
          </div>
          <div className="casino-menu-body">
            {activeTab === 'signals' && (
              <div className="casino-signals-buttons">
                  <button
                    type="button"
                    className="casino-signals-btn casino-signals-btn--with-icon"
                    onClick={() => openSignalOverlay('aviator')}
                  >
                    <img src={aviatorImg} alt="" className="casino-signals-icon" />
                    Aviator
                  </button>
                  <button
                    type="button"
                    className="casino-signals-btn casino-signals-btn--with-icon"
                    onClick={() => openSignalOverlay('chicken')}
                  >
                    <img src={chickenImg} alt="" className="casino-signals-icon" />
                    Chicken Road
                  </button>
                </div>
            )}
          </div>
        </div>
      )}

      {!showWelcome && overlayOpen && overlayGame && (
        <div className="casino-overlay casino-overlay--prediction" role="dialog" aria-label="Prediction">
          <div className="casino-prediction-card">
            {gameImage && (
              <div className="casino-prediction-image-wrap">
                <img src={gameImage} alt={gameLabel} className="casino-prediction-image" />
              </div>
            )}
            <span className="casino-overlay-game-name">{gameLabel}</span>

            <span
              className={`casino-overlay-multiplier ${
                predictionPhase === 'done' ? 'casino-overlay-multiplier--done' : 'casino-overlay-multiplier--white'
              }`}
            >
              {displayValue.toFixed(2)}x
            </span>

            <p className="casino-instruction">{INSTRUCTION}</p>

            <div className="casino-prediction-actions">
              <button
                type="button"
                className="casino-overlay-btn casino-overlay-btn--primary"
                onClick={startPrediction}
                disabled={predictionPhase === 'running' || countdownSeconds > 0}
                aria-live="polite"
                aria-label={countdownSeconds > 0 ? `New Prediction (${countdownSeconds} sec)` : undefined}
              >
                {predictionPhase === 'idle'
                  ? 'Start prediction'
                  : countdownSeconds > 0
                    ? `New Prediction (${countdownSeconds} sec)`
                    : 'New Prediction'}
              </button>
              <button type="button" className="casino-overlay-btn casino-overlay-btn--back" onClick={closeOverlay}>
                Bet
              </button>
            </div>
          </div>
        </div>
      )}

      {!showWelcome && shareOverlayOpen && (
        <div className="casino-overlay casino-overlay--share" role="dialog" aria-label="Share">
          <div className="casino-share-card">
            <h2 className="casino-share-title">Share &amp; Support</h2>
            {link ? (
              <p className="casino-share-url">{link}</p>
            ) : (
              <p className="casino-share-no-link">Shared link not yet. Add your channel to the URL (<code>?link=https://t.me/your_channel</code>).</p>
            )}
            <div className="casino-share-actions">
              <button type="button" className="casino-share-btn casino-share-btn--copy" onClick={handleCopyLink}>
                {copyDone ? 'Copied!' : 'Copy the link'}
              </button>
              <button type="button" className="casino-share-btn casino-share-btn--native" onClick={handleNativeShare}>
                Share with friend
              </button>
            </div>
            {link && (
              <a
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                className="casino-contacts-link casino-share-support"
              >
                Support channel
              </a>
            )}
            <button type="button" className="casino-overlay-back casino-share-close" onClick={closeShareOverlay}>
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
