interface KeyInputPanelProps {
  mode: 'offers' | 'companies';
  value: string;
  onChange: (value: string) => void;
  onReset: () => void;
  placeholder: string;
  label: string;
}

export function KeyInputPanel({ mode, value, onChange, onReset, placeholder, label }: KeyInputPanelProps) {
  const id = mode === 'offers' ? 'offerKey' : 'companyKey';
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
        <button type="button" className="reset-btn" onClick={onReset}>Reset</button>
      </div>
    </div>
  );
}
