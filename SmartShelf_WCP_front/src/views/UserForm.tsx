'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Save } from 'lucide-react';
import FormLoading from '@/components/loading/FormLoading';
import QueryErrorState from '@/components/feedback/QueryErrorState';
import {
    useAddSupermarketUserMutation,
    useGetCitiesQuery,
    useGetCountriesQuery,
    useGetSupermarketUserByIdQuery,
    useGetSupermarketsQuery,
    useUpdateSupermarketUserMutation,
} from '@/api/api';
import type { SupermarketUser } from '@/api/contracts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { UserAvatarPicker } from '@/components/users/UserAvatarPicker';
import { UserIdentityFields } from '@/components/users/UserIdentityFields';
import { translateCountry, translateWorkplace } from '@/i18n/ui';
import { getApiErrorMessage } from '@/utils/api-error';
import { requiredMessage } from '@/utils/form-fields';

const UserForm = () => {
    const { t, i18n } = useTranslation();
    const params = useParams<{ userId: string | string[] }>();
    const userId = Array.isArray(params?.userId) ? params.userId[0] : params?.userId;
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const isEditing = !!userId;
    const [formData, setFormData] = useState({
        name: '', surname: '', email: '',
        role: 'Store Manager', country: '', city: '', workplace: ''
    });
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [formError, setFormError] = useState('');
    const [imagePreview, setImagePreview] = useState<SupermarketUser['avatar']>(null);
    const { data: selectedUser, isLoading: isUserLoading, error: userError, refetch } = useGetSupermarketUserByIdQuery(userId ?? '', {
        skip: !isEditing || !userId,
    });
    const [addSupermarketUser, { isLoading: isAddingUser }] = useAddSupermarketUserMutation();
    const [updateSupermarketUser, { isLoading: isUpdatingUser }] = useUpdateSupermarketUserMutation();
    const currentLanguage = (i18n.resolvedLanguage ?? 'en').toLowerCase();
    const { data: countries = [] } = useGetCountriesQuery({ source: 'all' });
    const { data: availableCities = [], isFetching: isCitiesLoading } = useGetCitiesQuery({ country: formData.country, source: 'all' }, {
        skip: !formData.country,
    });
    const { data: availableSupermarkets = [] } = useGetSupermarketsQuery({ city: formData.city }, {
        skip: !formData.city,
    });
    const countryOptions = useMemo(
        () => countries.map((country) => ({
            value: country.name,
            label: translateCountry(t, country.name, currentLanguage),
            keywords: [country.name, country.code],
        })),
        [countries, t, currentLanguage],
    );
    const roleOptions = useMemo(
        () => [
            { value: 'Store Manager', label: t('store_manager') },
            { value: 'Cashier', label: t('cashier') },
            { value: 'Stock Keeper', label: t('stock_keeper') },
        ],
        [t],
    );
    const workplaceOptions = useMemo(
        () =>
            availableSupermarkets.map((supermarket) => ({
                value: supermarket,
                label: translateWorkplace(t, supermarket),
            })),
        [availableSupermarkets, t],
    );
    const isSaving = isAddingUser || isUpdatingUser;

    useEffect(() => {
        if (isEditing && selectedUser) {
            setFormData({
                name: selectedUser.name,
                surname: selectedUser.surname,
                email: selectedUser.email,
                role: selectedUser.role,
                country: selectedUser.country,
                city: selectedUser.city,
                workplace: selectedUser.workplace,
            });
            setImagePreview(selectedUser.avatar);
            setFieldErrors({});
            setFormError('');
        }
    }, [isEditing, selectedUser]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        setFieldErrors((previous) => ({ ...previous, [name]: '' }));
    };
    
    const handleCountryChange = (value: string) => {
        setFormData(prev => ({ ...prev, country: value, city: '', workplace: '' }));
        setFieldErrors((previous) => ({ ...previous, country: '', city: '', workplace: '' }));
    };

    const handleCityChange = (value: string) => {
        setFormData(prev => ({ ...prev, city: value, workplace: '' }));
        setFieldErrors((previous) => ({ ...previous, city: '', workplace: '' }));
    };

    const handleWorkplaceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const { value } = e.target;
        setFormData((prev) => ({ ...prev, workplace: value }));
        setFieldErrors((previous) => ({ ...previous, workplace: '' }));
    };

    const validateForm = () => {
        const nextErrors: Record<string, string> = {};
        if (!formData.name.trim()) nextErrors.name = requiredMessage(t('name'));
        if (!formData.surname.trim()) nextErrors.surname = requiredMessage(t('surname'));
        if (!formData.email.trim()) nextErrors.email = requiredMessage(t('email'));
        if (!formData.country.trim()) nextErrors.country = requiredMessage(t('country'));
        if (!formData.city.trim()) nextErrors.city = requiredMessage(t('city'));
        if (!formData.workplace.trim()) nextErrors.workplace = requiredMessage(t('workplace'));
        setFieldErrors(nextErrors);
        return Object.keys(nextErrors).length === 0;
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onloadend = () => {
                if (typeof reader.result === 'string') {
                    setImagePreview(reader.result);
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setFormError('');

        if (!validateForm()) {
            return;
        }

        const userPayload: Omit<SupermarketUser, 'id'> = {
            ...formData,
            avatar: imagePreview,
        };

        try {
            if (isEditing) {
                await updateSupermarketUser({ userId: userId!, userData: userPayload }).unwrap();
            } else {
                await addSupermarketUser(userPayload).unwrap();
            }

            router.push('/supermarket-employees');
        } catch (error) {
            const message = getApiErrorMessage(error, t('something_went_wrong'), t);
            if (message.toLowerCase().includes('email')) {
                setFieldErrors((previous) => ({ ...previous, email: message }));
            } else {
                setFormError(message);
            }
        }
    };

    if (isEditing && isUserLoading) {
        return <FormLoading />;
    }

    if (isEditing && (userError || !selectedUser) && !isUserLoading) {
        return (
            <div className="p-4 sm:p-8">
                <Button type="button" onClick={() => router.push('/supermarket-employees')} variant="ghost" size="sm" className="mb-4 px-0">
                    <ArrowLeft size={16}/> {t('back_to_employees', 'Back to Employees')}
                </Button>
                <QueryErrorState onRetry={() => void refetch()} />
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-8">
             <Button type="button" onClick={() => router.push('/supermarket-employees')} variant="ghost" size="sm" className="mb-4 px-0">
                <ArrowLeft size={16}/> {t('back_to_employees', 'Back to Employees')}
            </Button>
            <Card>
            <form onSubmit={handleSave}>
                <CardHeader className="flex items-center justify-between">
                    <CardTitle>{isEditing ? t('edit_user') : t('add_new_user')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-8">
                {formError ? (
                    <div className="rounded-2xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm font-medium text-danger">
                        {formError}
                    </div>
                ) : null}

                <UserAvatarPicker
                    imagePreview={imagePreview}
                    existingAvatar={selectedUser?.avatar ?? null}
                    profilePictureLabel={t('profile_picture')}
                    profilePreviewLabel={t('profile_preview')}
                    imageFormatLimitLabel={t('image_format_limit')}
                    fileInputRef={fileInputRef}
                    onImageChange={handleImageChange}
                />

                <UserIdentityFields
                    t={t}
                    locale={currentLanguage}
                    formData={formData}
                    fieldErrors={fieldErrors}
                    countryOptions={countryOptions}
                    availableCities={availableCities}
                    roleOptions={roleOptions}
                    onInputChange={handleInputChange}
                    onCountryChange={handleCountryChange}
                    onCityChange={handleCityChange}
                    isCitiesLoading={isCitiesLoading}
                    workplaceOptions={workplaceOptions}
                    onWorkplaceChange={handleWorkplaceChange}
                    workplaceDisabled={!formData.city}
                />

                <div className="mx-auto max-w-4xl border-t border-border pt-6">
                        <h3 className="font-bold mb-1">{t('change_password')}</h3>
                        <p className="text-xs text-text-muted mb-4">{t('leave_blank_password')}</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input type="password" placeholder={t('new_password')} />
                            <Input type="password" placeholder={t('repeat_password')} />
                        </div>
                </div>

                <div className="flex justify-end gap-4 mt-8 max-w-4xl mx-auto">
                    <Button type="button" onClick={() => router.push('/supermarket-employees')} disabled={isSaving} variant="ghost">
                        {t('cancel')}
                    </Button>
                    <Button type="submit" isLoading={isSaving}>
                        {!isSaving ? <Save size={20} /> : null}
                        {isSaving ? t('saving', 'Saving...') : t('save_changes')}
                    </Button>
                </div>
                </CardContent>
            </form>
            </Card>
        </div>
    );
};

export default UserForm;
