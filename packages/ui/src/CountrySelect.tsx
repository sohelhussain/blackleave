import React, { useState, useMemo } from 'react';
import { COUNTRIES, CountryItem } from '@applyflow/types';

export interface CountrySelectProps {
  value?: string; // country code or name
  onChange: (country: CountryItem) => void;
  placeholder?: string;
  excludeCodes?: string[];
  className?: string;
}

export const CountrySelect: React.FC<CountrySelectProps> = ({
  value,
  onChange,
  placeholder = 'Search country...',
  excludeCodes = [],
  className = ''
}) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const selectedCountry = useMemo(() => {
    if (!value) return null;
    return COUNTRIES.find((c) => c.code === value || c.name.toLowerCase() === value.toLowerCase()) || null;
  }, [value]);

  const filteredCountries = useMemo(() => {
    const q = query.trim().toLowerCase();
    return COUNTRIES.filter((c) => {
      if (excludeCodes.includes(c.code)) return false;
      if (!q) return true;
      return c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q) || c.region.toLowerCase().includes(q);
    });
  }, [query, excludeCodes]);

  return (
    <div className={`relative ${className}`}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs cursor-pointer flex items-center justify-between hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-sm"
      >
        <span className={selectedCountry ? 'text-slate-800 font-medium' : 'text-slate-400'}>
          {selectedCountry ? `${selectedCountry.flag} ${selectedCountry.name}` : placeholder}
        </span>
        <span className="text-slate-400 text-[10px]">▼</span>
      </div>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-xl max-h-60 overflow-hidden flex flex-col text-xs">
          <div className="p-2 border-b border-slate-100 bg-slate-50">
            <input
              type="text"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type country name..."
              className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>

          <div className="overflow-y-auto max-h-48 divide-y divide-slate-50">
            {filteredCountries.length === 0 ? (
              <div className="p-3 text-slate-400 text-center">No countries found</div>
            ) : (
              filteredCountries.map((c) => (
                <div
                  key={c.code}
                  onClick={() => {
                    onChange(c);
                    setIsOpen(false);
                    setQuery('');
                  }}
                  className="px-3 py-2 hover:bg-sky-50 cursor-pointer flex items-center justify-between transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <span>{c.flag}</span>
                    <span className="font-medium text-slate-700">{c.name}</span>
                  </span>
                  <span className="text-[10px] text-slate-400 uppercase font-mono">{c.code}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
