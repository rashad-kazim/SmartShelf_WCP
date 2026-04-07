import React from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { translateCity, translateCountry } from '@/i18n/ui';

interface StoreFiltersProps {
  selectedCountry: string;
  setSelectedCountry: (country: string) => void;
  selectedCity: string;
  setSelectedCity: (city: string) => void;
  countries: string[];
  cities: string[];
  resetFilters: () => void;
}

export default function StoreFilters({
  selectedCountry,
  setSelectedCountry,
  selectedCity,
  setSelectedCity,
  countries,
  cities,
  resetFilters
}: StoreFiltersProps) {
  const { t } = useTranslation();

  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedCountry(e.target.value);
    setSelectedCity('');
  };

  return (
    <div className="bg-surface p-6 rounded-2xl border border-border shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <label className="block text-sm font-medium text-text-muted mb-1">{t('country')}</label>
          <select
            value={selectedCountry}
            onChange={handleCountryChange}
            className="w-full px-4 py-2.5 rounded-lg bg-background border border-border outline-none focus:border-brand-primary disabled:opacity-50"
          >
            <option value="">{t('all_countries')}</option>
            {countries.map(country => (
              <option key={country} value={country}>{translateCountry(t, country)}</option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium text-text-muted mb-1">{t('city')}</label>
          <select
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value)}
            className="w-full px-4 py-2.5 rounded-lg bg-background border border-border outline-none focus:border-brand-primary"
          >
            <option value="">{t('all_cities')}</option>
            {cities.map(city => (
              <option key={city} value={city}>{translateCity(t, city)}</option>
            ))}
          </select>
        </div>
        <div className="flex items-end">
          <button
            onClick={resetFilters}
            className="px-6 py-2.5 bg-background border border-border text-text-primary font-medium rounded-lg hover:bg-surface-muted transition-colors cursor-pointer"
          >
            {t('reset')}
          </button>
        </div>
      </div>

      {(selectedCountry || selectedCity) && (
        <div className="flex flex-wrap gap-2 pt-2">
          {selectedCountry && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-brand-primary/10 text-brand-primary text-sm font-medium rounded-full">
              {translateCountry(t, selectedCountry)}
              <button onClick={() => setSelectedCountry('')} className="hover:text-brand-primary/70 cursor-pointer">
                <X size={14} />
              </button>
            </span>
          )}
          {selectedCity && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-brand-primary/10 text-brand-primary text-sm font-medium rounded-full">
              {translateCity(t, selectedCity)}
              <button onClick={() => setSelectedCity('')} className="hover:text-brand-primary/70 cursor-pointer">
                <X size={14} />
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
