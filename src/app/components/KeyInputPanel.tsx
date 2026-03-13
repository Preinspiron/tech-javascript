interface KeyInputPanelProps {
  mode: 'offers' | 'companies';
  value: string;
  onChange: (value: string) => void;
  onReset: () => void;
  onShare?: () => void;
  placeholder: string;
  label: string;
}

export function KeyInputPanel({ mode, value, onChange, onReset, onShare, placeholder, label }: KeyInputPanelProps) {
  const id = mode === 'offers' ? 'offerKey' : 'companyKey';
  const canShare = value.trim() && onShare;
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="key-row">
        <input
          id={id}
          className="key-input"
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
          autoComplete="off"
        />
        {canShare && (
          <button type="button" className="share-btn" onClick={onShare} title="Share link">Share</button>
        )}
        <button type="button" className="reset-btn" onClick={onReset}>Reset</button>
      </div>
    </div>
  );
}
