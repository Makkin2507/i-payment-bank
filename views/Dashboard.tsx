import React from 'react';
import { useData } from '../context/DataContext';
import { TRANSLATIONS } from '../constants';
import { Wallet, FolderKanban, History, CreditCard, Users, FileBarChart, ShieldCheck } from 'lucide-react';

interface DashboardProps {
  onNavigate: (view: any) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const { state, currentUser, language, formatCurrency, hasPermission } = useData();
  const t = TRANSLATIONS[language];

  // Calculate stats
  const activeProjects = state.projects.filter(p => p.status === 'active');
  const activeProjectsTotal = activeProjects.reduce((sum, p) => sum + p.current, 0);

  const menuItems = [
    { id: 'vault', label: t.vault_details, icon: Wallet, permission: 'view_vault' },
    { id: 'projects', label: t.projects, icon: FolderKanban, permission: 'view_projects' },
    { id: 'projects', label: t.my_projects, icon: FolderKanban, permission: 'view_my_projects' }, // Duplicate ID, handled by permission check order
    { id: 'activity', label: t.activity_log, icon: History, permission: 'view_activity' },
    { id: 'activity', label: t.my_activity, icon: History, permission: 'view_my_activity' },
    { id: 'spending', label: t.spending, icon: CreditCard, permission: 'view_spending' },
    { id: 'accounts', label: t.member_accounts, icon: Users, permission: 'view_accounts' },
    { id: 'reports', label: t.accounting_reports, icon: FileBarChart, permission: 'view_reports' },
    { id: 'admin', label: t.admin_panel, icon: ShieldCheck, permission: 'access_admin' },
  ];

  // Filter menu items. Handle cases where user might have both 'view_projects' and 'view_my_projects' (prioritize general view)
  const visibleItems = menuItems.filter(item => hasPermission(item.permission));
  
  // Dedup logic: if you have 'view_projects', don't show 'view_my_projects' item if it points to same place but different label
  const finalItems = visibleItems.filter((item, index, self) => {
    if (item.id === 'projects' && item.permission === 'view_my_projects' && self.some(i => i.permission === 'view_projects')) return false;
    if (item.id === 'activity' && item.permission === 'view_my_activity' && self.some(i => i.permission === 'view_activity')) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Vault Card */}
      {hasPermission('view_vault') && (
        <div className="bg-gradient-to-br from-primary to-purple-900 rounded-2xl p-6 shadow-lg text-white">
          <div className="flex justify-between items-start mb-2">
            <span className="text-sm font-medium opacity-80">{t.vault_balance}</span>
            <Wallet className="opacity-50" />
          </div>
          <h2 className="text-4xl font-bold tracking-tight mb-4">{formatCurrency(state.vaultBalance)}</h2>
          
          <div className="pt-4 border-t border-white/20">
             <div className="flex justify-between text-sm">
                <span className="opacity-80">Active Projects Funds</span>
                <span className="font-bold">{formatCurrency(activeProjectsTotal)}</span>
             </div>
          </div>
        </div>
      )}

      {/* Navigation Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {finalItems.map((item, idx) => (
            <button
              key={`${item.id}-${idx}`}
              onClick={() => onNavigate(item.id)}
              className="bg-surface border border-gray-800 hover:bg-gray-800 hover:border-secondary/50 p-6 rounded-2xl flex flex-col items-center justify-center gap-3 transition-all duration-200 group"
            >
              <item.icon className="text-gray-400 group-hover:text-secondary transition-colors" size={32} />
              <span className="text-sm font-medium text-center">{item.label}</span>
            </button>
          ))}
      </div>
    </div>
  );
};

export default Dashboard;