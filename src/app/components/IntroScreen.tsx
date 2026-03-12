import { useEffect, useRef } from 'react';
import { Partners } from './Partners';
import snoop from '../assets/snoop.webp';
import React from 'react';

function animateValue(el: HTMLElement | null, start: number, end: number, duration: number) {
  if (!el) return;
  const target = el;
  const startTime = performance.now();
  function frame(now: number) {
    const progress = Math.min((now - startTime) / duration, 1);
    target.textContent = Math.round(start + (end - start) * progress).toLocaleString('en-US');
    if (progress < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

interface IntroScreenProps {
  onContinue: () => void;
}

export function IntroScreen({ onContinue }: IntroScreenProps) {
  const ftdTodayRef = useRef<HTMLDivElement>(null);
  const ftdYearRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    animateValue(ftdTodayRef.current, 0, 4000, 2000);
    animateValue(ftdYearRef.current, 100000, 500000, 2200);
  }, []);
  return (
    <div className="intro">
      <div className="intro-row">
        <div className="intro-card">
          <div className="intro-label">FTD TODAY</div>
          <div className="intro-value" ref={ftdTodayRef}>0</div>
          {/* <div className="intro-caption">Growing towards 10,000</div> */}
        </div>
        <div className="intro-card">
          <div className="intro-label">FTD YEAR</div>
          <div className="intro-value" ref={ftdYearRef}>0</div>
          {/* <div className="intro-caption">Target: +500,000</div> */}
        </div>
      </div>
      <div className="intro-image">
        <img src={snoop} alt="BAFF" />
      </div>
      <Partners />
      <button type="button" className="btn-primary" onClick={onContinue}>Continue</button>
      <div className="intro-center">
        Need help?{' '}
        <a href="https://t.me/+C4MhFEK6ruJmOGVk" className="intro-link" target="_blank" rel="noopener noreferrer">BAFF support</a>
      </div>
    </div>
  );
}
