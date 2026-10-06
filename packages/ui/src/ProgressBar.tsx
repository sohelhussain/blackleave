import React from 'react';

export interface ProgressBarProps {
  percentage: number;
  label?: string;
  showPercentage?: boolean;
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  percentage,
  label,
  showPercentage = true,
  className = ''
}) => {
  const clamped = Math.max(0, Math.min(100, Math.round(percentage)));

  const barColor =
    clamped >= 80 ? 'bg-emerald-500' : clamped >= 50 ? 'bg-sky-500' : 'bg-amber-500';

  return (
    <div className={`space-y-1.5 ${className}`}>
      {(label || showPercentage) && (
        <div className="flex items-center justify-between text-xs font-medium text-slate-700">
          {label && <span>{label}</span>}
          {showPercentage && <span className="font-bold text-slate-900">{clamped}%</span>}
        </div>
      )}
      <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden shadow-inner">
        <div
          className={`h-full ${barColor} transition-all duration-500 ease-out rounded-full`}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
};
