
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import type { CountryOption } from '@/api/contracts';
import { translateCity, translateCountry, translateWorkplace } from '@/i18n/ui';

const EmployeeFilter = ({ filters, setFilters, availableCities, availableSupermarkets, countries, handleResetFilters, isRefreshing = false }: {
    filters: { country: string; city: string; supermarket: string };
    setFilters: React.Dispatch<React.SetStateAction<{ country: string; city: string; supermarket: string }>>;
    availableCities: string[];
    availableSupermarkets: string[];
    countries: CountryOption[];
    handleResetFilters: () => void;
    isRefreshing?: boolean;
}) => {
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

    const showSupermarketFilter = availableSupermarkets && availableSupermarkets.length > 0;

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
            <div className={`grid grid-cols-1 sm:grid-cols-2 ${showSupermarketFilter ? 'md:grid-cols-4' : 'md:grid-cols-3'} gap-4`}>
            <div className="w-full">
                <Select 
                    onChange={(e) => setFilters({ country: e.target.value, city: 'all', supermarket: 'all' })}
                    value={filters.country} 
                    className="bg-background"
                >
                    <option value="all">{t('all_countries', 'All Countries')}</option>
                    {sortedCountries.map((country) => (
                        <option key={country.code || country.name} value={country.name}>{translateCountry(t, country.name, currentLanguage)}</option>
                    ))}
                </Select>
            </div>
            <div className="w-full">
                <Select 
                    onChange={(e) => setFilters(f => ({ ...f, city: e.target.value, supermarket: 'all' }))} 
                    value={filters.city} 
                    disabled={filters.country === 'all'} 
                    className="bg-background"
                >
                    <option value="all">{t('all_cities', 'All Cities')}</option>
                    {sortedCities.map((city) => (
                        <option key={city} value={city}>{translateCity(t, city)}</option>
                    ))}
                </Select>
            </div>
            {showSupermarketFilter && (
                <div className="w-full">
                    <Select 
                        onChange={(e) => setFilters(f => ({ ...f, supermarket: e.target.value }))} 
                        value={filters.supermarket} 
                        disabled={filters.city === 'all'} 
                        className="bg-background"
                    >
                        <option value="all">{t('all_supermarkets', 'All Supermarkets')}</option>
                        {sortedSupermarkets.map((supermarket) => (
                            <option key={supermarket} value={supermarket}>{translateWorkplace(t, supermarket)}</option>
                        ))}
                    </Select>
                </div>
            )}
            <div className="w-full">
                <Button 
                    onClick={handleResetFilters} 
                    variant="secondary"
                    className="h-12 w-full"
                >
                    {t('reset', 'Reset')}
                </Button>
            </div>
            </div>
            </CardContent>
        </Card>
    );
};

export default EmployeeFilter;
