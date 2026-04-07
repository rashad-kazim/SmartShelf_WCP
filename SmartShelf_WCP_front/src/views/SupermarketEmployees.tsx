 'use client';

import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { UserPlus, ArrowLeft } from 'lucide-react';
import QueryErrorState from '@/components/feedback/QueryErrorState';
import PanelLoader from '@/components/loading/PanelLoader';
import EmployeeFilter from '../components/employees/EmployeeFilter';
import EmployeeTable from '../components/employees/EmployeeTable';
import Link from 'next/link';
import {
    useDeleteSupermarketUserMutation,
    useGetCitiesQuery,
    useGetCountriesQuery,
    useGetSupermarketUsersQuery,
    useGetSupermarketsQuery,
} from '@/api/api';
import type { SupermarketUser } from '@/api/contracts';
import type { StoreFiltersState } from '@/features/stores/types';

const SupermarketEmployees = () => {
    const { t } = useTranslation();
    const [filters, setFilters] = useState<StoreFiltersState>({ country: 'all', city: 'all', supermarket: 'all' });
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<SupermarketUser | null>(null);
    const { data: users = [], isLoading, isFetching, error, refetch } = useGetSupermarketUsersQuery(filters, {
        refetchOnMountOrArgChange: true,
    });
    const { data: countries = [] } = useGetCountriesQuery();
    const { data: availableCities = [] } = useGetCitiesQuery(filters.country, {
        skip: filters.country === 'all',
    });
    const { data: availableSupermarkets = [] } = useGetSupermarketsQuery(filters.city, {
        skip: filters.city === 'all',
    });
    const [deleteSupermarketUser, { isLoading: isDeleting }] = useDeleteSupermarketUserMutation();
    const handleDeleteUser = (user: SupermarketUser) => {
        setSelectedUser(user);
        setIsDeleteConfirmOpen(true);
    };

    const confirmDelete = async () => {
        if (!selectedUser) {
            return;
        }

        await deleteSupermarketUser(selectedUser.id).unwrap();
        setIsDeleteConfirmOpen(false);
        setSelectedUser(null);
    };

    const handleResetFilters = () => {
        setFilters({ country: 'all', city: 'all', supermarket: 'all' });
    };

    const DeleteConfirmationModal = () => (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" aria-modal="true" role="dialog">
            <div className="bg-surface p-6 sm:p-8 rounded-2xl shadow-lg w-full max-w-sm m-4 animate-in fade-in zoom-in-95 duration-200">
                <h2 className="text-xl font-bold mb-4">{t('delete_user_confirm_title', 'Delete User?')}</h2>
                <p className="text-text-muted mb-6">{t('delete_user_confirm_desc', { name: selectedUser?.name ?? '' })}</p>
                <div className="flex justify-end gap-4">
                    <button onClick={() => setIsDeleteConfirmOpen(false)} className="px-6 py-2 rounded-lg cursor-pointer bg-gray-200 hover:bg-gray-300 font-semibold transition-colors">
                        {t('cancel')}
                    </button>
                    <button onClick={confirmDelete} disabled={isDeleting} className="px-6 py-2 rounded-lg bg-red-500 text-white cursor-pointer hover:bg-red-600 font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50">
                        {isDeleting ? t('deleting', 'Deleting...') : t('delete', 'Delete')}
                    </button>
                </div>
            </div>
        </div>
    );

    if (isLoading && users.length === 0 && !error) {
        return (
            <div className="p-4 sm:p-8">
                <PanelLoader minHeightClassName="min-h-[64vh]" />
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-8 animate-in fade-in duration-300">
            <Link href="/users" className="flex items-center gap-2 text-sm font-bold text-text-muted hover:text-text-primary mb-4"><ArrowLeft size={16}/> {t('back_to_roles', 'Back to Roles')}</Link>
            <div className="flex flex-col md:flex-row justify-between gap-4 mb-6">
                 <div className="order-2 md:order-1">
                    <h1 className="text-2xl font-bold">{t('supermarket_employees', 'Supermarket Employees')}</h1>
                    <p className="text-text-muted">{t('manage_supermarket_users_roles_desc', 'Manage user accounts and roles for supermarket staff.')}</p>
                </div>
                <div className="order-1 md:order-2 flex justify-start md:justify-end">
                    <Link href="/user/add" className="px-6 py-3 bg-brand-primary text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-brand-primary/90 transition-all shadow-lg shadow-brand-primary/20 cursor-pointer w-full sm:w-auto">
                        <UserPlus size={20} />
                        {t('add_user')}
                    </Link>
                </div>
            </div>

            <EmployeeFilter 
                filters={filters} 
                setFilters={setFilters} 
                availableCities={availableCities} 
                availableSupermarkets={availableSupermarkets} 
                countries={countries}
                handleResetFilters={handleResetFilters}
                isRefreshing={isFetching}
            />

            {error ? (
                <QueryErrorState className="mt-6" onRetry={() => void refetch()} />
            ) : (
                <EmployeeTable users={users} handleDeleteUser={handleDeleteUser} isLoading={isLoading || isFetching} />
            )}

            {isDeleteConfirmOpen && <DeleteConfirmationModal />}

        </div>
    );
}

export default SupermarketEmployees;
