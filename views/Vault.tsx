import React from 'react';
import { useData } from '../context/DataContext';
import { TRANSLATIONS } from '../constants';
import { Wallet, TrendingUp, PieChart, Coins } from 'lucide-react';

const Vault = () => {
  const { state, language, formatCurrency, currentUser } = useData();
  const t = TRANSLATIONS[language];
  
  // Filter active projects
  const activeProjects = state.projects.filter(p => {
      if (p.status !== 'active') return false;
      if (currentUser?.role !== 'Admin') {
          if (p.creatorId) {
             const u = state.users.find(u => u.id === p.creatorId);
             if (u?.role === 'Admin' && !u.isVisibleToManagers) return false;
          }
      }
      return true;
  });

  const totalInProjects = activeProjects.reduce((sum, p) => sum + p.current, 0);
  const totalAssets = state.vaultBalance + totalInProjects;
  
  // Percentages for the visualization bar
  const vaultPercent = totalAssets > 0 ? (state.vaultBalance / totalAssets) * 100 : 0;
  const projectPercent = totalAssets > 0 ? (totalInProjects / totalAssets) * 100 : 0;

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-300">
      
      {/* Hero Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Main Balance Card */}
          <div className="lg:col-span-2 bg-gradient-to-br from-indigo-900 to-purple-900 rounded-2xl p-8 shadow-xl relative overflow-hidden border border-white/10">
              <div className="absolute top-0 right-0 p-8 opacity-10">
                  <Wallet size={120} />
              </div>
              <div className="relative z-10">
                  <p className="text-indigo-200 font-medium mb-2 flex items-center gap-2">
                      <Coins size={18} /> {t.liquid_cash}
                  </p>
                  <h1 className="text-5xl font-bold text-white mb-6 tracking-tight">
                      {formatCurrency(state.vaultBalance)}
                  </h1>
                  
                  <div className="inline-flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full text-sm text-white/90 backdrop-blur-sm">
                      <TrendingUp size={14} /> 
                      <span>{t.total_assets}: <strong>{formatCurrency(totalAssets)}</strong></span>
                  </div>
              </div>
          </div>

          {/* Quick Stats Column */}
          <div className="space-y-4">
              <div className="bg-surface border border-gray-800 rounded-2xl p-6 flex flex-col justify-center h-full">
                  <div className="flex items-center justify-between mb-2">
                      <p className="text-gray-400 text-sm">{t.allocated_funds}</p>
                      <PieChart size={18} className="text-secondary" />
                  </div>
                  <p className="text-2xl font-bold text-white">{formatCurrency(totalInProjects)}</p>
                  <p className="text-xs text-gray-500 mt-1">{t.locked_in} {activeProjects.length} {t.active.toLowerCase()} {t.projects.toLowerCase()}</p>
              </div>
          </div>
      </div>

      {/* Allocation Bar */}
      <div className="bg-surface border border-gray-800 rounded-2xl p-6">
          <h3 className="font-bold mb-4 flex items-center gap-2 text-sm text-gray-400 uppercase tracking-wider">
              {t.asset_allocation}
          </h3>
          <div className="flex h-6 w-full rounded-full overflow-hidden bg-gray-900">
              <div className="bg-indigo-500 transition-all duration-1000" style={{ width: `${vaultPercent}%` }} />
              <div className="bg-secondary transition-all duration-1000" style={{ width: `${projectPercent}%` }} />
          </div>
          <div className="flex justify-between mt-3 text-sm font-medium">
              <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-indigo-500" />
                  <span>Vault ({Math.round(vaultPercent)}%)</span>
              </div>
              <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-secondary" />
                  <span>{t.projects} ({Math.round(projectPercent)}%)</span>
              </div>
          </div>
      </div>

      {/* Projects Breakdown */}
      <div className="bg-surface border border-gray-800 rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-gray-800 bg-gray-900/30 flex justify-between items-center">
           <h3 className="font-bold text-lg">{t.active_projects_breakdown}</h3>
           <span className="bg-gray-800 px-2 py-1 rounded text-xs text-gray-400">{activeProjects.length} {t.active}</span>
        </div>
        <div className="divide-y divide-gray-800">
           {activeProjects.map(p => {
               const progress = p.goal > 0 ? (p.current / p.goal) * 100 : 0;
               return (
                   <div key={p.id} className="p-5 hover:bg-gray-800/50 transition-colors group">
                       <div className="flex justify-between items-center mb-2">
                           <div>
                               <span className="font-bold text-white block text-lg">{p.name}</span>
                               <span className="text-xs text-gray-500">{t.goal}: {formatCurrency(p.goal)}</span>
                           </div>
                           <div className="text-right">
                               <span className="font-mono text-secondary font-bold text-lg block">{formatCurrency(p.current)}</span>
                               <span className="text-xs text-gray-500">{Math.round(progress)}% {t.funded}</span>
                           </div>
                       </div>
                       
                       <div className="w-full bg-gray-900 h-2 rounded-full overflow-hidden mt-2">
                            <div 
                                className="bg-secondary h-full transition-all duration-500 group-hover:bg-purple-400" 
                                style={{ width: `${Math.min(progress, 100)}%` }} 
                            />
                       </div>
                   </div>
               );
           })}
           {activeProjects.length === 0 && (
               <div className="p-12 text-center text-gray-500 flex flex-col items-center gap-3">
                   <div className="w-12 h-12 bg-gray-900 rounded-full flex items-center justify-center text-gray-600">
                       <Wallet size={24} />
                   </div>
                   <p>{t.no_active_projects}</p>
               </div>
           )}
        </div>
      </div>
    </div>
  );
};

export default Vault;