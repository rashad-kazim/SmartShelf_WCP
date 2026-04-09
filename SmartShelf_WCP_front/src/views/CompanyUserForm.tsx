'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Save } from 'lucide-react';
import FormLoading from '@/components/loading/FormLoading';
import QueryErrorState from '@/components/feedback/QueryErrorState';
import {
    useAddCompanyUserMutation,
    useGetCitiesQuery,
    useGetCountriesQuery,
    useGetCompanyUserByIdQuery,
    useUpdateCompanyUserMutation,
} from '@/api/api';
import type { CompanyUser } from '@/api/contracts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { UserAvatarPicker } from '@/components/users/UserAvatarPicker';
import { UserIdentityFields } from '@/components/users/UserIdentityFields';
import { translateCountry } from '@/i18n/ui';
import { getApiErrorMessage } from '@/utils/api-error';
import { requiredMessage } from '@/utils/form-fields';

const CompanyUserForm = () => {
    const { t, i18n } = useTranslation();
    const router = useRouter();
    const params = useParams<{ userId: string | string[] }>();
    const userId = Array.isArray(params?.userId) ? params.userId[0] : params?.userId;
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const isEditing = !!userId;
    const [formData, setFormData] = useState({
        name: '',
        surname: '',
        email: '',
        role: 'Administrator',
        country: '',
        city: '',
        workplace: 'Headquarters',
        password: '',
        confirmPassword: ''
    });
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [formError, setFormError] = useState('');
    const [imagePreview, setImagePreview] = useState<CompanyUser['avatar']>(null);
    const { data: userToEdit, isLoading: isUserLoading, error: userError, refetch } = useGetCompanyUserByIdQuery(userId ?? '', {
        skip: !isEditing || !userId,
    });
    const [addCompanyUser, { isLoading: isAddingUser }] = useAddCompanyUserMutation();
    const [updateCompanyUser, { isLoading: isUpdatingUser }] = useUpdateCompanyUserMutation();
    const currentLanguage = (i18n.resolvedLanguage ?? 'en').toLowerCase();
    const { data: countries = [] } = useGetCountriesQuery({ source: 'all' });
    const { data: availableCities = [], isFetching: isCitiesLoading } = useGetCitiesQuery({ country: formData.country, source: 'all' }, {
        skip: !formData.country,
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
            { value: 'Administrator', label: t('administrator') },
            { value: 'Analyst', label: t('analyst') },
            { value: 'Engineer', label: t('engineer') },
        ],
        [t],
    );
    const isSaving = isAddingUser || isUpdatingUser;

    useEffect(() => {
        if (isEditing && userToEdit) {
            setFormData({
                name: userToEdit.name,
                surname: userToEdit.surname,
                email: userToEdit.email,
                role: userToEdit.role,
                country: userToEdit.country,
                city: userToEdit.city,
                workplace: userToEdit.workplace || 'Headquarters',
                password: '',
                confirmPassword: ''
            });
            setImagePreview(userToEdit.avatar);
            setFieldErrors({});
            setFormError('');
        }
    }, [isEditing, userToEdit]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        setFieldErrors((previous) => ({ ...previous, [name]: '' }));
    };

    const validateForm = () => {
        const nextErrors: Record<string, string> = {};
        if (!formData.name.trim()) nextErrors.name = requiredMessage(t('name'));
        if (!formData.surname.trim()) nextErrors.surname = requiredMessage(t('surname'));
        if (!formData.email.trim()) nextErrors.email = requiredMessage(t('email'));
        if (!formData.country.trim()) nextErrors.country = requiredMessage(t('country'));
        if (!formData.city.trim()) nextErrors.city = requiredMessage(t('city'));
        setFieldErrors(nextErrors);
        return Object.keys(nextErrors).length === 0;
    };

    const handleCountryChange = (value: string) => {
        setFormData(prev => ({ ...prev, country: value, city: '' }));
        setFieldErrors((previous) => ({ ...previous, country: '', city: '' }));
    };

    const handleCityChange = (value: string) => {
        setFormData(prev => ({ ...prev, city: value }));
        setFieldErrors((previous) => ({ ...previous, city: '' }));
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

        const finalData: Omit<CompanyUser, 'id'> = {
            name: formData.name,
            surname: formData.surname,
            email: formData.email,
            role: formData.role,
            country: formData.country,
            city: formData.city,
            workplace: 'Headquarters',
            avatar: imagePreview
        };

        try {
            if (isEditing) {
                await updateCompanyUser({ userId: userId!, userData: finalData }).unwrap();
            } else {
                await addCompanyUser(finalData).unwrap();
            }

            router.push('/company-employees');
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

    if (isEditing && (userError || !userToEdit) && !isUserLoading) {
        return (
            <div className="p-8 bg-background text-text-primary">
                <Button type="button" onClick={() => router.push('/company-employees')} variant="ghost" size="sm" className="mb-4 px-0">
                    <ArrowLeft size={16}/> {t('back_to_employees', 'Back to Employees')}
                </Button>
                <QueryErrorState onRetry={() => void refetch()} />
            </div>
        );
    }

    return (
        <div className="p-8 bg-background text-text-primary">
            <Button type="button" onClick={() => router.push('/company-employees')} variant="ghost" size="sm" className="mb-4 px-0">
                <ArrowLeft size={16}/> {t('back_to_employees', 'Back to Employees')}
            </Button>
            <Card>
            <form onSubmit={handleSave}>
                <CardHeader>
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
                />

                <div className="mx-auto max-w-4xl border-t border-border pt-6">
                        <h3 className="font-bold mb-1">{t('change_password')}</h3>
                        <p className="text-xs text-text-muted mb-4">{t('leave_blank_password')}</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input type="password" name="password" value={formData.password} onChange={handleInputChange} placeholder={t('new_password')} />
                            <Input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleInputChange} placeholder={t('repeat_password')} />
                        </div>
                </div>

                <div className="flex justify-end gap-4 mt-8 max-w-4xl mx-auto">
                    <Button type="button" onClick={() => router.push('/company-employees')} disabled={isSaving} variant="ghost">
                        {t('cancel')}
                    </Button>
                    <Button type="submit" isLoading={isSaving}>
                        {!isSaving ? <Save size={20} /> : null}
                        {isSaving ? t('saving', 'Saving...') : isEditing ? t('save_changes') : t('add_user')}
                    </Button>
                </div>
                </CardContent>
            </form>
            </Card>
        </div>
    );
};

export default CompanyUserForm;
