'use client';

import { CARICOM_COUNTRIES, CaricomCountry } from '@/lib/types';
import { MapPin } from 'lucide-react';

interface CountryFilterProps {
  selected: CaricomCountry;
  onChange: (country: CaricomCountry) => void;
}

export default function CountryFilter({ selected, onChange }: CountryFilterProps) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <MapPin size={20} className="text-caribbean-coral" />
      <select
        value={selected}
        onChange={(e) => onChange(e.target.value as CaricomCountry)}
        className="flex-1 px-4 py-2 border-2 border-caribbean-teal rounded-lg bg-white text-caribbean-navy font-medium focus:outline-none focus:ring-2 focus:ring-caribbean-blue"
      >
        {CARICOM_COUNTRIES.map((country) => (
          <option key={country} value={country}>
            {country}
          </option>
        ))}
      </select>
    </div>
  );
}
