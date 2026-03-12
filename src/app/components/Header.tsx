import type { ReactNode } from 'react';

interface HeaderProps {
  onMenuClick: () => void;
  children?: ReactNode;
}

export function Header({ onMenuClick, children }: HeaderProps) {
  return (
    <div className="header">
      <div className="logo">
        <div className="logo-badge">B</div>
        <div>
          <div className="logo-title">BAFF Stats</div>
          <div className="muted">Mini stats dashboard</div>
        </div>
      </div>
      <button type="button" className="menu-button" onClick={onMenuClick} aria-label="Menu">
        ⋮
      </button>
      {children}
    </div>
  );
}
