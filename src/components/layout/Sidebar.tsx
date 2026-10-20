import React from 'react';
import { NavScreen } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { 
  LayoutDashboard, 
  BookOpen, 
  PlusCircle, 
  ListFilter, 
  FileCheck2, 
  BarChart3, 
  Sliders 
} from 'lucide-react';

interface SidebarProps {
  currentScreen: NavScreen;
  onNavigate: (screen: NavScreen) => void;
  pendingCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentScreen,
  onNavigate,
  pendingCount
}) => {
  const { isAdmin, isLead, isAuditor, isCounsellor, role, userProfile } = useAuth();

  // Role-based navigation structure
  const adminNavItems: { id: NavScreen; label: string; icon: React.ElementType; badge?: number }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'knowledge-base', label: 'Knowledge Base', icon: BookOpen },
    { id: 'new-audit', label: 'New Audit', icon: PlusCircle },
    { id: 'audit-queue', label: 'Audit Queue', icon: ListFilter, badge: pendingCount },
    { id: 'audit-reports', label: 'Audit Reports', icon: FileCheck2 },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Sliders },
  ];

  const leadNavItems: { id: NavScreen; label: string; icon: React.ElementType; badge?: number }[] = [
    { id: 'dashboard', label: 'Team Dashboard', icon: LayoutDashboard },
    { id: 'audit-queue', label: 'Audit Queue', icon: ListFilter, badge: pendingCount },
    { id: 'audit-reports', label: 'Audit Reports', icon: FileCheck2 },
    { id: 'analytics', label: 'Compliance Analytics', icon: BarChart3 },
    { id: 'knowledge-base', label: 'Approved Policies', icon: BookOpen },
  ];

  const auditorNavItems: { id: NavScreen; label: string; icon: React.ElementType; badge?: number }[] = [
    { id: 'new-audit', label: 'New Audit', icon: PlusCircle },
    { id: 'audit-queue', label: 'Audit Queue', icon: ListFilter, badge: pendingCount },
    { id: 'audit-reports', label: 'Audit Reports & Review', icon: FileCheck2 },
    { id: 'knowledge-base', label: 'Approved Policies', icon: BookOpen },
  ];

  const counsellorNavItems: { id: NavScreen; label: string; icon: React.ElementType; badge?: number }[] = [
    { id: 'audit-queue', label: 'My Call Queue', icon: ListFilter, badge: pendingCount },
    { id: 'audit-reports', label: 'My Scorecards', icon: FileCheck2 },
    { id: 'knowledge-base', label: 'Approved Scripts', icon: BookOpen },
  ];

  let navItems = counsellorNavItems;
  let workspaceTitle = 'Counsellor Workspace';
  let badgeColor = 'bg-emerald-100 text-emerald-800 border-emerald-200';

  if (isAdmin) {
    navItems = adminNavItems;
    workspaceTitle = 'Admin Workspace';
    badgeColor = 'bg-purple-100 text-purple-800 border-purple-200';
  } else if (isLead) {
    navItems = leadNavItems;
    workspaceTitle = 'QA Lead Portal';
    badgeColor = 'bg-indigo-100 text-indigo-800 border-indigo-200';
  } else if (isAuditor) {
    navItems = auditorNavItems;
    workspaceTitle = 'Auditor Workspace';
    badgeColor = 'bg-blue-100 text-blue-800 border-blue-200';
  }

  const displayRole = (role || userProfile?.role || 'counsellor').toUpperCase();

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col justify-between shrink-0 min-h-[calc(100vh-57px)]">
      <div className="p-4 space-y-6">
        <div>
          <div className="px-3 pb-2 text-[11px] font-semibold tracking-wider text-slate-400 uppercase flex items-center justify-between">
            <span>{workspaceTitle}</span>
            <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border uppercase ${badgeColor}`}>
              {displayRole}
            </span>
          </div>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentScreen === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left cursor-pointer ${
                    isActive
                      ? 'bg-[#2455E8] text-white font-semibold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    <span className="truncate">{item.label}</span>
                  </div>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className={`text-xs font-mono font-medium px-2 py-0.5 rounded-full ${
                      isActive ? 'bg-white/20 text-white font-bold' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>
    </aside>
  );
};
