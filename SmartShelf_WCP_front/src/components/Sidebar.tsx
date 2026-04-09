import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { api, useLogoutAuthMutation } from '@/api/api';
import {
  LayoutDashboard, 
  Store, 
  PlusCircle, 
  Cpu, 
  Bell,
  Users, 
  LogOut,
  ChevronRight,
  User
} from 'lucide-react';
import { cn } from '../utils/cn';
import { logout } from '../features/auth/authSlice';
import { useAppDispatch, useAppSelector } from '../store/hooks';

export default function Sidebar({ isOpen, toggle }: { isOpen: boolean; toggle: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const [logoutAuth] = useLogoutAuthMutation();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await logoutAuth().unwrap();
    } catch {
      // server logout may fail, local auth state still must reset
    }

    dispatch(api.util.resetApiState());
    dispatch(logout());
    router.replace('/login');
  };

  const menuItems = [
    { icon: LayoutDashboard, label: t('dashboard'), path: '/' },
    { icon: Store, label: t('stores_branches'), path: '/stores' },
    { icon: PlusCircle, label: t('new_installation'), path: '/installation' },
    { icon: Cpu, label: t('firmware'), path: '/firmware' },
    { icon: Bell, label: t('all_notifications'), path: '/notifications' },
    { icon: Users, label: t('user_roles'), path: '/users' },
  ];

  return (
    <aside className={cn(
      "fixed left-0 top-16 h-[calc(100vh-4rem)] bg-header-bg text-white transition-all duration-300 z-40 flex flex-col border-r border-white/10",
      isOpen ? "w-64" : "w-20"
    )}>
      {/* Navigation */}
      <nav className="flex-1 py-6 px-3 space-y-2 overflow-y-auto">
        {menuItems.map((item) => {
          const isActive = pathname === item.path;
          return (
            <Link
              key={item.path}
              href={item.path}
              className={cn(
                "flex items-center gap-4 px-3 py-3 rounded-xl transition-all group",
                isActive 
                  ? "bg-brand-primary text-white shadow-lg shadow-brand-primary/20" 
                  : "text-white/60 hover:bg-white/5 hover:text-white"
              )}
            >
              <item.icon size={24} className={cn("min-w-[24px]", isActive ? "text-white" : "group-hover:text-white")} />
              {isOpen && <span className="font-medium">{item.label}</span>}
              {isOpen && isActive && <ChevronRight size={16} className="ml-auto" />}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Section */}
      <div className="p-4 border-t border-white/10 relative" ref={profileRef}>
        <button
          onClick={() => setIsProfileOpen(!isProfileOpen)}
          className={cn(
            "w-full flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-all cursor-pointer group",
            !isOpen && "justify-center"
          )}
        >
          <div className="w-10 h-10 rounded-full bg-surface-muted flex items-center justify-center text-header-bg shrink-0">
            <User size={20} />
          </div>
          {isOpen && (
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-semibold truncate">{user?.name || t('admin_user')}</p>
              <p className="text-xs text-white/40 truncate">{user?.email || 'admin@smartshelf.ai'}</p>
            </div>
          )}
        </button>

        {isProfileOpen && (
          <div className={cn(
            "absolute bottom-full mb-2 bg-surface border border-border rounded-xl shadow-lg overflow-hidden py-1 animate-in fade-in slide-in-from-bottom-2 duration-200 z-50",
            isOpen ? "left-4 right-4" : "left-4 w-48"
          )}>
            <button
              onClick={() => void handleLogout()}
              className="w-full text-left px-4 py-3 text-sm text-danger hover:bg-danger/10 transition-colors flex items-center gap-3 cursor-pointer"
            >
              <LogOut size={18} />
              <span className="font-medium">{t('logout')}</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
