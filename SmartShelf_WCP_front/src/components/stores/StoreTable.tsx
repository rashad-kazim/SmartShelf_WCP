import React from 'react';
import { useTranslation } from 'react-i18next';
import Link from 'next/link';
import { Edit, Trash2, FileText } from 'lucide-react';
import type { StorePageType, StoreRecord } from '@/features/stores/types';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import RingLoader from '@/components/loading/RingLoader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { translateLocation } from '@/i18n/ui';

interface StoreTableProps {
    stores: StoreRecord[];
    pageType: StorePageType;
    onDeleteClick: (store: StoreRecord) => void;
    isLoading?: boolean;
}

const StoreTable = ({ stores, pageType, onDeleteClick, isLoading = false }: StoreTableProps) => {
    const { t } = useTranslation();
    const equalColumnStyle = { width: '20%' };

    const getActionButtons = (store: StoreRecord) => {
        switch (pageType) {
            case 'edit':
                return (
                    <Link href={`/edit-store-workflow/${store.id}`} className="text-text-muted hover:text-primary transition-colors cursor-pointer">
                        <Edit size={18} />
                    </Link>
                );
            case 'delete':
                return (
                    <button 
                        onClick={() => onDeleteClick(store)}
                        className="text-text-muted hover:text-danger transition-colors cursor-pointer"
                    >
                        <Trash2 size={18} />
                    </button>
                );
            case 'logs':
                return (
                    <Link href={`/stores/${store.id}/logs`} className="text-text-muted hover:text-info transition-colors cursor-pointer">
                        <FileText size={18} />
                    </Link>
                );
            default:
                return null;
        }
    };

    return (
        <Card className="overflow-x-auto">
            <Table className="table-fixed" aria-busy={isLoading}>
                <colgroup>
                    <col className="w-1/5" />
                    <col className="w-1/5" />
                    <col className="w-1/5" />
                    <col className="w-1/5" />
                    <col className="w-1/5" />
                </colgroup>
                <TableHeader>
                    <TableRow>
                        <TableHead style={equalColumnStyle} className="whitespace-nowrap">{t('store_name')}</TableHead>
                        <TableHead style={equalColumnStyle} className="whitespace-nowrap">{t('location')}</TableHead>
                        <TableHead style={equalColumnStyle} className="whitespace-nowrap">{t('status')}</TableHead>
                        <TableHead style={equalColumnStyle} className="whitespace-nowrap text-center">{t('devices')}</TableHead>
                        <TableHead style={equalColumnStyle} className="whitespace-nowrap text-center">{t('actions')}</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {isLoading ? (
                        <TableRow className="hover:bg-transparent">
                            <TableCell colSpan={5} className="p-6">
                                <div className="relative flex min-h-[16rem] items-center justify-center overflow-hidden rounded-2xl border border-white/30 bg-white/12 backdrop-blur-[28px] shadow-[inset_0_1px_0_rgba(255,255,255,0.30)] dark:border-white/10 dark:bg-slate-950/12">
                                    <span className="absolute inset-x-0 top-0 h-16 bg-white/18 blur-2xl dark:bg-white/5" />
                                    <span className="absolute inset-x-8 bottom-0 h-14 rounded-full bg-black/5 blur-3xl dark:bg-black/10" />
                                    <RingLoader size="sm" label={t('loading')} />
                                </div>
                            </TableCell>
                        </TableRow>
                    ) : stores.length > 0 ? (
                        stores.map(store => (
                            <TableRow key={store.id}>
                                <TableCell style={equalColumnStyle} className="font-bold text-text-primary truncate">{store.name}</TableCell>
                                <TableCell style={equalColumnStyle} className="text-text-muted truncate">{translateLocation(t, store.city, store.country)}</TableCell>
                                <TableCell style={equalColumnStyle}>
                                    <Badge variant={store.status === 'Active' ? 'success' : 'destructive'} className="px-3 py-1">
                                        {t(store.status.toLowerCase())}
                                    </Badge>
                                </TableCell>
                                <TableCell style={equalColumnStyle} className="text-text-muted text-center">{store.devices}</TableCell>
                                <TableCell style={equalColumnStyle}>
                                    <div className="flex items-center justify-center w-full">
                                        {getActionButtons(store)}
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))
                    ) : (
                        <TableRow className="hover:bg-transparent">
                            <TableCell colSpan={5} className="py-10 text-center text-text-muted">
                                {t('no_results_found', 'No Results Found')}
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </Card>
    );
};

export default StoreTable;
