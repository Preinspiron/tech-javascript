import { useState, useEffect } from 'react';
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
  const [selected, setSelected] = useState<HistoryItem | null>(null);

  useEffect(() => {
    if (open) setSelected(null);
  }, [open]);

  if (!open) return null;

  const handleCopy = () => {
    if (selected) copyToClipboard(selected.key);
  };

  const handleApply = () => {
    if (selected) {
      onApply(selected);
      setSelected(null);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setSelected(null);
      onClose();
    }
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
              <div
                key={`${item.key}-${item.ts}`}
                className={`history-item ${selected?.key === item.key && selected?.ts === item.ts ? 'selected' : ''}`}
                onClick={() => setSelected(item)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && setSelected(item)}
              >
                <div className="history-item-main">
                  <div>{item.key}</div>
                  <div className="history-meta">{typeLabel(item)}</div>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="history-footer">
          <button
            type="button"
            className="history-footer-btn"
            onClick={handleCopy}
            disabled={!selected}
            aria-label="Copy key"
          >
            Copy
          </button>
          <button
            type="button"
            className="history-footer-btn primary"
            onClick={handleApply}
            disabled={!selected}
            aria-label="Apply key"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
