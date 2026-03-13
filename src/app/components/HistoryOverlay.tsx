import type { HistoryItem } from '../types';
import { copyToClipboard } from '../storage';

interface HistoryOverlayProps {
  open: boolean;
  items: HistoryItem[];
  onClose: () => void;
  onApply: (item: HistoryItem) => void;
}

function typeLabel(item: HistoryItem): string {
  const kind = item.type === 'companies' ? 'Company' : 'Offer';
  return item.label ? `${kind} · ${item.label}` : kind;
}

export function HistoryOverlay({ open, items, onClose, onApply }: HistoryOverlayProps) {
  if (!open) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div className="history-overlay" role="dialog" aria-label="Keys history" onClick={handleBackdropClick}>
      <div className="history-modal" onClick={(e) => e.stopPropagation()}>
        <div className="history-header">
          <div className="history-title">Keys history</div>
          <button type="button" className="history-close" onClick={onClose} aria-label="Close">×</button>
        </div>
        <div className="history-list">
          {items.length === 0 ? (
            <div className="history-empty">No keys yet</div>
          ) : (
            items.map((item) => (
              <div key={`${item.key}-${item.ts}`} className="history-item">
                <div className="history-item-main">
                  <div>{item.key}</div>
                  <div className="history-meta">{typeLabel(item)}</div>
                </div>
                <div className="history-item-actions">
                  <button
                    type="button"
                    className="history-item-btn"
                    onClick={(e) => { e.stopPropagation(); copyToClipboard(item.key); }}
                    aria-label="Copy key"
                  >
                    Copy
                  </button>
                  <button
                    type="button"
                    className="history-item-btn primary"
                    onClick={(e) => { e.stopPropagation(); onApply(item); }}
                    aria-label="Apply key"
                  >
                    Apply
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
