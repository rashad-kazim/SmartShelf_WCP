 'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Camera, PlusCircle, Save } from 'lucide-react';
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
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { translateCity, translateCountry } from '@/i18n/ui';

const CompanyUserForm = () => {
    const { t } = useTranslation();
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
    const [imagePreview, setImagePreview] = useState<CompanyUser['avatar']>(null);
    const { data: userToEdit, isLoading: isUserLoading, error: userError, refetch } = useGetCompanyUserByIdQuery(userId ?? '', {
        skip: !isEditing || !userId,
    });
    const [addCompanyUser, { isLoading: isAddingUser }] = useAddCompanyUserMutation();
    const [updateCompanyUser, { isLoading: isUpdatingUser }] = useUpdateCompanyUserMutation();
    const { data: countries = [] } = useGetCountriesQuery();
    const { data: availableCities = [] } = useGetCitiesQuery(formData.country, {
        skip: !formData.country,
    });
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
        }
    }, [isEditing, userToEdit]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const { value } = e.target;
        setFormData(prev => ({ ...prev, country: value, city: '' }));
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

        if (isEditing) {
            await updateCompanyUser({ userId: userId!, userData: finalData }).unwrap();
        } else {
            await addCompanyUser(finalData).unwrap();
        }

        router.push('/company-employees');
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

                <div className="flex flex-col items-center gap-4 mb-8">
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleImageChange}
                        className="hidden"
                        accept="image/jpeg, image/png"
                    />
                    <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                        <div className="w-32 h-32 rounded-full bg-surface-muted border-2 border-dashed border-border flex flex-col items-center justify-center text-text-muted overflow-hidden group-hover:border-brand-primary transition-all">
                            {imagePreview ? (
                                <img src={imagePreview} alt={t('profile_preview')} className="w-full h-full object-cover" />
                            ) : (
                                <>
                                    <Camera size={32} className="mb-2" />
                                    <span className="text-xs font-bold">{t('profile_picture')}</span>
                                </>
                            )}
                        </div>
                        <div className="absolute bottom-0 right-0 p-2 bg-brand-primary text-white rounded-full shadow-lg">
                            <PlusCircle size={16} />
                        </div>
                    </div>
                    <p className="text-xs text-text-muted">{t('image_format_limit')}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                    <div className="space-y-2">
                        <Label>{t('name')}</Label>
                        <Input name="name" value={formData.name} onChange={handleInputChange} type="text" />
                    </div>
                    <div className="space-y-2">
                        <Label>{t('surname')}</Label>
                        <Input name="surname" value={formData.surname} onChange={handleInputChange} type="text" />
                    </div>
                    <div className="md:col-span-2 space-y-2">
                        <Label>{t('email')}</Label>
                        <Input name="email" value={formData.email} onChange={handleInputChange} type="email" />
                    </div>
                    <div className="md:col-span-2 space-y-2">
                        <Label>{t('role')}</Label>
                        <Select name="role" value={formData.role} onChange={handleInputChange} className="bg-surface-muted">
                            <option value="Administrator">{t('administrator')}</option>
                            <option value="Analyst">{t('analyst')}</option>
                            <option value="Engineer">{t('engineer')}</option>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>{t('country')}</Label>
                        <Select name="country" value={formData.country} onChange={handleCountryChange} className="bg-surface-muted">
                            <option value="">{t('select_country', 'Select Country')}</option>
                            {countries.map((country) => (
                                <option key={country} value={country}>{translateCountry(t, country)}</option>
                            ))}
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>{t('city')}</Label>
                        <Select name="city" value={formData.city} onChange={handleInputChange} disabled={!formData.country} className="bg-surface-muted">
                            <option value="">{t('select_city', 'Select City')}</option>
                            {availableCities.map((city) => (
                                <option key={city} value={city}>{translateCity(t, city)}</option>
                            ))}
                        </Select>
                    </div>
                    <div className="md:col-span-2 pt-6 border-t border-border">
                        <h3 className="font-bold mb-1">{t('change_password')}</h3>
                        <p className="text-xs text-text-muted mb-4">{t('leave_blank_password')}</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input type="password" name="password" value={formData.password} onChange={handleInputChange} placeholder={t('new_password')} />
                            <Input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleInputChange} placeholder={t('repeat_password')} />
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-4 mt-8 max-w-4xl mx-auto">
                    <Button type="button" onClick={() => router.push('/company-employees')} disabled={isSaving} variant="ghost">
                        {t('cancel')}
                    </Button>
                    <Button type="submit" disabled={isSaving}>
                        <Save size={20} />
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
