 'use client';

import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import QueryErrorState from '@/components/feedback/QueryErrorState';
import PanelLoader from '@/components/loading/PanelLoader';
import StoreFilter from '../components/stores/StoreFilter';
import StoreTable from '../components/stores/StoreTable';
import DeleteConfirmationModal from '../components/stores/DeleteConfirmationModal';
import { DEFAULT_STORE_FILTERS } from '@/features/stores/constants';
import {
    buildAppliedFilters,
} from '@/features/stores/helpers';
import {
    useDeleteStoreMutation,
    useGetCitiesQuery,
    useGetCountriesQuery,
    useGetStoresQuery,
    useGetSupermarketsQuery,
} from '@/api/api';
import type { StoreFiltersState, StorePageType, StoreRecord } from '@/features/stores/types';

interface StorePageLayoutProps {
    pageType: StorePageType;
    pageTitle: string;
}

const StorePageLayout = ({ pageType, pageTitle }: StorePageLayoutProps) => {
    const { t } = useTranslation();
    const [filters, setFilters] = useState<StoreFiltersState>(DEFAULT_STORE_FILTERS);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedStore, setSelectedStore] = useState<StoreRecord | null>(null);
    const { data: stores = [], isLoading, isFetching, error, refetch } = useGetStoresQuery(filters, {
        refetchOnMountOrArgChange: true,
    });
    const { data: countries = [] } = useGetCountriesQuery();
    const { data: availableCities = [] } = useGetCitiesQuery(filters.country, {
        skip: filters.country === 'all',
    });
    const { data: availableSupermarkets = [] } = useGetSupermarketsQuery(filters.city, {
        skip: filters.city === 'all',
    });
    const [deleteStore, { isLoading: isDeleting }] = useDeleteStoreMutation();

    const handleResetFilters = () => {
        setFilters(DEFAULT_STORE_FILTERS);
    };

    const removeFilter = (key: keyof StoreFiltersState) => {
        setFilters(prev => ({ ...prev, [key]: DEFAULT_STORE_FILTERS[key] }));
    };

    const appliedFilters = useMemo(() => buildAppliedFilters(filters), [filters]);

    const handleDeleteClick = (store: StoreRecord) => {
        setSelectedStore(store);
        setIsModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!selectedStore) {
            return;
        }

        await deleteStore(selectedStore.id).unwrap();
        setIsModalOpen(false);
        setSelectedStore(null);
    };

    const handleCancelDelete = () => {
        setIsModalOpen(false);
        setSelectedStore(null);
    };

    if (isLoading && stores.length === 0 && !error) {
        return (
            <div className="p-4 sm:p-8">
                <PanelLoader minHeightClassName="min-h-[64vh]" />
            </div>
        );
    }
    
    return (
        <div className="p-4 sm:p-8">
            <h1 className="text-2xl font-bold mb-6">{t(pageTitle)}</h1>
            <StoreFilter 
                filters={filters} 
                setFilters={setFilters} 
                countries={countries}
                availableCities={availableCities} 
                availableSupermarkets={availableSupermarkets} 
                handleResetFilters={handleResetFilters}
                appliedFilters={appliedFilters}
                removeFilter={removeFilter}
                isRefreshing={isFetching}
            />
            {error ? (
                <QueryErrorState className="mt-6" onRetry={() => void refetch()} />
            ) : (
                <StoreTable 
                    stores={stores} 
                    pageType={pageType} 
                    onDeleteClick={handleDeleteClick}
                    isLoading={isLoading || isFetching}
                />
            )}
            {isModalOpen && selectedStore && (
                <DeleteConfirmationModal 
                    store={selectedStore} 
                    onConfirm={handleConfirmDelete} 
                    onCancel={handleCancelDelete} 
                    isPending={isDeleting}
                />
            )}
        </div>
    );
};

export default StorePageLayout;
