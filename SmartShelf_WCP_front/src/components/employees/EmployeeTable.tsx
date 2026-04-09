import React from 'react';
import { useTranslation } from 'react-i18next';
import { Edit, Trash2 } from 'lucide-react';
import { cn } from '../../utils/cn';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import RingLoader from '@/components/loading/RingLoader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { translateLocation, translateRole, translateWorkplace } from '@/i18n/ui';

const getInitials = (name, surname) => {
    if (name && surname) {
        return `${name[0]}${surname[0]}`.toUpperCase();
    }
    if (name) {
        return name.substring(0, 2).toUpperCase();
    }
    return ''
}

const roleColors = {
  'Store Manager': 'bg-blue-100 text-blue-600',
  'Cashier': 'bg-yellow-100 text-yellow-600',
  'Stock Keeper': 'bg-green-100 text-green-600',
  'Administrator': 'bg-slate-100 text-slate-700',
  'Analyst': 'bg-purple-100 text-purple-700',
  'Engineer': 'bg-emerald-100 text-emerald-700',
};

const EmployeeTable = ({ users, handleDeleteUser, editPathPrefix = '/user/edit', isLoading = false }) => {
    const { t } = useTranslation();

    return (
        <Card className="overflow-x-auto">
            <Table className="min-w-[700px]" aria-busy={isLoading}>
                <TableHeader>
                    <TableRow>
                        <TableHead className="whitespace-nowrap">{t('user')}</TableHead>
                        <TableHead className="whitespace-nowrap">{t('role')}</TableHead>
                        <TableHead className="whitespace-nowrap">{t('location')}</TableHead>
                        <TableHead className="whitespace-nowrap">{t('workplace')}</TableHead>
                        <TableHead className="whitespace-nowrap text-right">{t('actions')}</TableHead>
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
                    ) : users.length > 0 ? (
                        users.map(user => (
                             <TableRow key={user.id}>
                                <TableCell>
                                    <div className="flex items-center gap-3">
                                        {user.avatar ? (
                                            <img
                                                src={user.avatar}
                                                alt={`${user.name} ${user.surname}`}
                                                className="w-10 h-10 rounded-full object-cover shrink-0"
                                            />
                                        ) : (
                                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-600 shrink-0">
                                                {getInitials(user.name, user.surname)}
                                            </div>
                                        )}
                                        <div>
                                            <div className="font-bold text-text-primary">{user.name} {user.surname}</div>
                                            <div className="text-text-muted">{user.email}</div>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Badge className={cn('px-3 py-1', roleColors[user.role] || 'bg-gray-100 text-gray-600')}>
                                        {translateRole(t, user.role)}
                                    </Badge>
                                </TableCell>
                                 <TableCell className="text-text-muted">{translateLocation(t, user.city, user.country)}</TableCell>
                                 <TableCell className="text-text-muted">{translateWorkplace(t, user.workplace)}</TableCell>
                                 <TableCell>
                                     <div className="flex items-center justify-end gap-1">
                                        <Link href={`${editPathPrefix}/${user.id}`} className="text-gray-400 hover:text-green-500 cursor-pointer p-2 rounded-lg hover:bg-gray-100 transition-colors" aria-label={t('edit_user_aria', { name: user.name })}>
                                            <Edit size={18} />
                                        </Link>
                                         <button onClick={() => handleDeleteUser(user)} className="text-gray-400 hover:text-red-500 cursor-pointer p-2 rounded-lg hover:bg-gray-100 transition-colors" aria-label={t('delete_user_aria', { name: user.name })}>
                                             <Trash2 size={18} />
                                         </button>
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

export default EmployeeTable;


