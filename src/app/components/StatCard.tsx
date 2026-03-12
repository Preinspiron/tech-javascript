import type { StatBlock } from '../types';

interface StatCardProps {
  title: string;
  data: StatBlock;
}

export function StatCard({ title, data }: StatCardProps) {
  const r2d = Math.round(data.regToDepSalePercent);
  const uniq2conv = Math.round(data.uniqueToConvPercent);
  return (
    <div className="card">
      <div className="card-title">{title}</div>
      <div className="stat-row"><span className="stat-label">Clicks</span><span>{data.clicks}</span></div>
      <div className="stat-row"><span className="stat-label">Uniques</span><span>{data.uniques}</span></div>
      <div className="stat-row"><span className="stat-label">spend</span><span>${Math.round(data.spent)}</span></div>
      <div className="stat-row"><span className="stat-label">regs</span><span>{data.regs}</span></div>
      <div className="stat-row"><span className="stat-label">deps</span><span>{data.depositsSalesCount}</span></div>
      <div className="stat-row"><span className="stat-label">r2d</span><span>{r2d}%</span></div>
      <div className="stat-row"><span className="stat-label">uniq2conv</span><span>{uniq2conv}%</span></div>
      <div className="stat-row"><span className="stat-label">cost per conversion</span><span>{data.costPerConversion.toFixed(2)}$</span></div>
      <div className="stat-row"><span className="stat-label">cost per deposit</span><span>{data.costPerDepSale.toFixed(2)}$</span></div>
    </div>
  );
}
