import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from '@/components/ui/input';
import { cn } from '@/utils/cn';
import { Skeleton } from '@/components/ui/skeleton';
import { translateCity, translateCountry } from '@/i18n/ui';

interface Store {
  id: string;
  name: string;
  city: string;
  country: string;
  installerFirstName: string;
  installerLastName: string;
  devicesCount: number;
  status: 'online' | 'offline';
}

interface StoreDataTableProps {
  stores: Store[];
  isLoading: boolean;
  error: string | null;
  renderActions: (store: Store) => React.ReactNode;
}

export default function StoreDataTable({ stores, isLoading, error, renderActions }: StoreDataTableProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const [filter, setFilter] = useState('');

  const filteredStores = stores.filter(store => 
    store.name.toLowerCase().includes(filter.toLowerCase()) ||
    translateCity(t, store.city).toLowerCase().includes(filter.toLowerCase()) ||
    translateCountry(t, store.country).toLowerCase().includes(filter.toLowerCase())
  );

  const handleRowClick = (storeId: string) => {
    router.push(`/stores/${storeId}`);
  };

  if (error) {
    return <div className="text-danger text-center p-8 text-lg">{error}</div>;
  }

  return (
    <div className="bg-surface rounded-3xl border border-border p-6 shadow-sm">
      <div className="flex items-center mb-6">
        <Input 
          placeholder={t('filter_stores')}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="max-w-sm"
        />
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('store_name')}</TableHead>
              <TableHead>{t('status')}</TableHead>
              <TableHead>{t('location')}</TableHead>
              <TableHead>{t('installer_name')}</TableHead>
              <TableHead className="text-right">{t('devices')}</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={index}>
                  <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-5 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-8 rounded-lg" /></TableCell>
                </TableRow>
              ))
            ) : (
              filteredStores.map((store) => (
                <TableRow key={store.id} onClick={() => handleRowClick(store.id)} className="cursor-pointer">
                  <TableCell className="font-medium">{store.name}</TableCell>
                  <TableCell>
                    <span className={cn(
                      "px-3 py-1 rounded-full text-xs font-semibold",
                      store.status === 'online' ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'
                    )}>
                      {store.status === 'online' ? t('online') : t('offline')}
                    </span>
                  </TableCell>
                  <TableCell>{translateCity(t, store.city)}, {translateCountry(t, store.country)}</TableCell>
                  <TableCell>{store.installerFirstName} {store.installerLastName}</TableCell>
                  <TableCell className="text-right">{store.devicesCount}</TableCell>
                  <TableCell>{renderActions(store)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
