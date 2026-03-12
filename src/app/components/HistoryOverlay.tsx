import type { HistoryItem } from '../types';
import { copyToClipboard } from '../storage';

interface HistoryOverlayProps {
  open: boolean;
  items: HistoryItem[];
  onClose: () => void;
  onApply: (item: HistoryItem) => void;
}

export function HistoryOverlay({ open, items, onClose, onApply }: HistoryOverlayProps) {
  if (!open) return null;
  const handleCopy = (e: React.MouseEvent, key: string) => {
    e.stopPropagation();
    copyToClipboard(key);
  };
  return (
    <div className="history-overlay" role="dialog" aria-label="Keys history" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="history-modal">
        <div className="history-header">
          <div className="history-title">Keys history</div>
          <button type="button" className="history-close" onClick={onClose} aria-label="Close">×</button>
        </div>
        <div className="history-list">
          {items.length === 0 ? (
            <div className="history-empty">No keys yet</div>
          ) : (
            items.map((item) => (
              <div key={`${item.key}-${item.ts}`} className="history-item" onClick={() => onApply(item)} role="button" tabIndex={0}>
                <div className="history-item-main">
                  <div>{item.key}</div>
                  <div className="history-meta">{item.type === 'company' ? 'Company' : 'Offer'}{item.label ? ` • ${item.label}` : ''}</div>
                </div>
                <button type="button" className="history-copy-btn" onClick={(e) => handleCopy(e, item.key)} aria-label="Copy key">⧉</button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
