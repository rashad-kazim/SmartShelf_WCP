
 'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Store, Building } from 'lucide-react';
import Link from 'next/link';
import { cn } from '../utils/cn';

const RoleCard = ({ icon, title, description, to, disabled = false }) => (
    <Link 
        href={!disabled ? to : '#'}
        className={cn(
            'bg-surface border border-border rounded-2xl p-6 flex flex-col items-start gap-4 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-2xl hover:shadow-brand-primary/20 h-48', // Reverted to original height
            disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
        )}
        onClick={(e) => disabled && e.preventDefault()}
    >
        <div className="w-12 h-12 bg-brand-primary/10 text-brand-primary flex items-center justify-center rounded-xl">{icon}</div>
        <div className="text-left">
            <h3 className="font-bold text-lg mb-1">{title}</h3>
            <p className="text-text-muted text-sm">{description}</p>
        </div>
    </Link>
);

const UsersAndRoles = () => {
    const { t } = useTranslation();

    return (
        <div className="p-4 sm:p-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold">{t('users_roles_title', 'Users & Roles')}</h1>
                <p className="text-text-muted mt-2">{t('users_roles_desc', 'Manage accounts and permissions for different user types.')}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <RoleCard 
                    icon={<Store size={24}/>}
                    title={t('supermarket_employees', 'Supermarket Employees')}
                    description={t('supermarket_employees_desc', 'Manage user accounts for cashiers, stock keepers, and store managers.')}
                    to="/supermarket-employees"
                />
                <RoleCard 
                    icon={<Building size={24}/>}
                    title={t('company_employees', 'Company Employees')}
                    description={t('company_employees_desc', 'Manage accounts for administrators, analysts, and engineers.')}
                    to="/company-employees"
                    disabled={false}
                />
            </div>
        </div>
    );
}

export default UsersAndRoles;
