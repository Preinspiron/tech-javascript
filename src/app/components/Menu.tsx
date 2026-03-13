const SUPPORT_URL = 'https://t.me/+C4MhFEK6ruJmOGVk';

interface MenuProps {
  open: boolean;
  onClose: () => void;
  onHome: () => void;
  onHistory: () => void;
  onSupportClick?: () => void;
}

export function Menu({ open, onClose, onHome, onHistory, onSupportClick }: MenuProps) {
  if (!open) return null;
  return (
    <div className="menu-popup" role="dialog" aria-label="Menu">
      <div className="menu-panel">
        <div className="menu-header">
          <div className="menu-title">Menu</div>
          <button type="button" className="menu-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="menu-item" onClick={onHome} role="button" tabIndex={0}>Home</div>
        <div className="menu-item" onClick={onHistory} role="button" tabIndex={0}>History</div>
        <div
          className="menu-item"
          onClick={() => { onSupportClick?.(); window.open(SUPPORT_URL, '_blank'); }}
          role="button"
          tabIndex={0}
        >
          BAFF support
        </div>
      </div>
    </div>
  );
}
