'use client';

import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { SearchableSelect, type SearchableOption } from '@/components/ui/searchable-select';
import { translateCity } from '@/i18n/ui';
import { requiredLabel } from '@/utils/form-fields';
import type { TFunction } from 'i18next';

type UserRoleOption = {
  value: string;
  label: string;
};

type WorkplaceOption = {
  value: string;
  label: string;
};

interface UserIdentityFieldsProps {
  t: TFunction;
  locale: string;
  formData: {
    name: string;
    surname: string;
    email: string;
    role: string;
    country: string;
    city: string;
    workplace?: string;
  };
  fieldErrors: Record<string, string>;
  countryOptions: SearchableOption[];
  availableCities: string[];
  roleOptions: UserRoleOption[];
  onInputChange: (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  onCountryChange: (value: string) => void;
  onCityChange: (value: string) => void;
  isCitiesLoading?: boolean;
  workplaceOptions?: WorkplaceOption[];
  onWorkplaceChange?: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  workplaceDisabled?: boolean;
}

export function UserIdentityFields({
  t,
  locale,
  formData,
  fieldErrors,
  countryOptions,
  availableCities,
  roleOptions,
  onInputChange,
  onCountryChange,
  onCityChange,
  isCitiesLoading = false,
  workplaceOptions,
  onWorkplaceChange,
  workplaceDisabled = false,
}: UserIdentityFieldsProps) {
  const showWorkplace = !!workplaceOptions && !!onWorkplaceChange;

  return (
    <div className="mx-auto grid max-w-4xl grid-cols-1 gap-6 md:grid-cols-2">
      <div className="space-y-2">
        <Label>{requiredLabel(t('name'))}</Label>
        <Input name="name" value={formData.name} onChange={onInputChange} type="text" />
        {fieldErrors.name ? <p className="text-sm text-danger">{fieldErrors.name}</p> : null}
      </div>
      <div className="space-y-2">
        <Label>{requiredLabel(t('surname'))}</Label>
        <Input name="surname" value={formData.surname} onChange={onInputChange} type="text" />
        {fieldErrors.surname ? <p className="text-sm text-danger">{fieldErrors.surname}</p> : null}
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label>{requiredLabel(t('email'))}</Label>
        <Input name="email" value={formData.email} onChange={onInputChange} type="email" />
        {fieldErrors.email ? <p className="text-sm text-danger">{fieldErrors.email}</p> : null}
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label>{requiredLabel(t('role'))}</Label>
        <Select name="role" value={formData.role} onChange={onInputChange} className="bg-surface-muted">
          {roleOptions.map((role) => (
            <option key={role.value} value={role.value}>
              {role.label}
            </option>
          ))}
        </Select>
      </div>
      <div className="space-y-2">
        <Label>{requiredLabel(t('country'))}</Label>
        <SearchableSelect
          value={formData.country}
          options={countryOptions}
          onValueChange={onCountryChange}
          placeholder={t('select_country', 'Select Country')}
          emptyMessage={t('no_results_found')}
          locale={locale}
        />
        {fieldErrors.country ? <p className="text-sm text-danger">{fieldErrors.country}</p> : null}
      </div>
      <div className="space-y-2">
        <Label>{requiredLabel(t('city'))}</Label>
        <SearchableSelect
          value={formData.city}
          options={availableCities}
          onValueChange={onCityChange}
          placeholder={t('select_city', 'Select City')}
          renderOption={(city) => translateCity(t, city)}
          emptyMessage={t('no_results_found')}
          disabled={!formData.country}
          locale={locale}
          isLoading={isCitiesLoading}
        />
        {fieldErrors.city ? <p className="text-sm text-danger">{fieldErrors.city}</p> : null}
      </div>
      {showWorkplace ? (
        <div className="space-y-2 md:col-span-2">
          <Label>{requiredLabel(t('workplace'))}</Label>
          <Select
            name="workplace"
            value={formData.workplace ?? ''}
            onChange={onWorkplaceChange}
            disabled={workplaceDisabled}
            className="bg-surface-muted"
          >
            <option value="">{t('select_supermarket', 'Select Supermarket')}</option>
            {(workplaceOptions ?? []).map((workplace) => (
              <option key={workplace.value} value={workplace.value}>
                {workplace.label}
              </option>
            ))}
          </Select>
          {fieldErrors.workplace ? <p className="text-sm text-danger">{fieldErrors.workplace}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
