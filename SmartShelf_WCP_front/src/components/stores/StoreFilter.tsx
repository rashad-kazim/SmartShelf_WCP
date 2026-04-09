import React from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import type { CountryOption } from '@/api/contracts';
import type { AppliedStoreFilter, StoreFiltersState } from '@/features/stores/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { translateCity, translateCountry, translateFilterValue, translateWorkplace } from '@/i18n/ui';

interface StoreFilterProps {
    filters: StoreFiltersState;
    setFilters: React.Dispatch<React.SetStateAction<StoreFiltersState>>;
    countries: readonly CountryOption[];
    availableCities: string[];
    availableSupermarkets: string[];
    handleResetFilters: () => void;
    appliedFilters: AppliedStoreFilter[];
    removeFilter: (key: keyof StoreFiltersState) => void;
    isRefreshing?: boolean;
}

const StoreFilter = ({
    filters,
    setFilters,
    countries,
    availableCities,
    availableSupermarkets,
    handleResetFilters,
    appliedFilters,
    removeFilter,
    isRefreshing = false
}: StoreFilterProps) => {
    const { t, i18n } = useTranslation();
    const currentLanguage = (i18n.resolvedLanguage ?? 'en').toLowerCase();
    const sortedCountries = [...countries].sort((left, right) =>
        translateCountry(t, left.name, currentLanguage).localeCompare(translateCountry(t, right.name, currentLanguage), currentLanguage),
    );
    const sortedCities = [...availableCities].sort((left, right) =>
        translateCity(t, left).localeCompare(translateCity(t, right), currentLanguage),
    );
    const sortedSupermarkets = [...availableSupermarkets].sort((left, right) =>
        translateWorkplace(t, left).localeCompare(translateWorkplace(t, right), currentLanguage),
    );
    const isCountrySelected = filters.country !== 'all';
    const isCitySelected = filters.city !== 'all';
    const isCityDisabled = !isCountrySelected;
    const isSupermarketDisabled = !isCountrySelected || !isCitySelected;

    const handleInputChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const { value } = e.target;
        const key = e.target.name as keyof StoreFiltersState;
        setFilters(prev => {
            const newFilters: StoreFiltersState = { ...prev, [key]: value };
            if (key === 'country') {
                newFilters.city = 'all';
                newFilters.supermarket = 'all';
            }
            if (key === 'city') {
                newFilters.supermarket = 'all';
            }
            return newFilters;
        });
    };

    return (
        <Card className="mb-6">
            <CardContent className="p-4">
            {isRefreshing && (
                <div className="mb-4 flex justify-end">
                    <Badge variant="default" className="px-3 py-1 text-xs font-bold">
                        <span className="h-2 w-2 rounded-full bg-brand-primary animate-pulse"></span>
                        {t('loading')}
                    </Badge>
                </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                {/* Country Select */}
                <div className="w-full">
                    <Label htmlFor="country" className="mb-2 block cursor-pointer">{t('country')}</Label>
                    <Select id="country" name="country" onChange={handleInputChange} value={filters.country} className="rounded-lg bg-background">
                        <option value="all">{t('all_countries')}</option>
                        {sortedCountries.map((country) => (
                            <option key={country.code || country.name} value={country.name}>{translateCountry(t, country.name, currentLanguage)}</option>
                        ))}
                    </Select>
                </div>

                {/* City Select */}
                <div className="w-full">
                    <Label htmlFor="city" className="mb-2 block cursor-pointer">{t('city')}</Label>
                    <Select id="city" name="city" onChange={handleInputChange} value={filters.city} disabled={isCityDisabled} className="rounded-lg bg-background disabled:bg-muted/50">
                        <option value="all">{t('all_cities')}</option>
                        {sortedCities.map((city) => (
                            <option key={city} value={city}>{translateCity(t, city)}</option>
                        ))}
                    </Select>
                </div>

                {/* Supermarket Select */}
                <div className="w-full">
                     <Label htmlFor="supermarket" className="mb-2 block cursor-pointer">{t('supermarket')}</Label>
                     <Select id="supermarket" name="supermarket" onChange={handleInputChange} value={filters.supermarket} disabled={isSupermarketDisabled} className="rounded-lg bg-background disabled:bg-muted/50">
                        <option value="all">{t('all_supermarkets')}</option>
                        {sortedSupermarkets.map((supermarket) => (
                            <option key={supermarket} value={supermarket}>{translateWorkplace(t, supermarket)}</option>
                        ))}
                    </Select>
                </div>

                {/* Reset Button */}
                <div className="w-full">
                    <Button onClick={handleResetFilters} className="h-12 w-full rounded-lg text-sm">{t('reset_filters')}</Button>
                </div>
            </div>

            {appliedFilters.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2 items-center">
                    {appliedFilters.map((filter) => (
                        <button key={filter.key} type="button" onClick={() => removeFilter(filter.key)} className="flex items-center gap-1 rounded-md bg-background px-2 py-1 text-sm cursor-pointer">
                            <span>{translateFilterValue(t, filter.key, filter.label)}</span>
                            <span className="text-text-muted hover:text-text-primary">
                                <X size={14} />
                            </span>
                        </button>
                    ))}
                </div>
            )}
            </CardContent>
        </Card>
    );
};

export default StoreFilter;
