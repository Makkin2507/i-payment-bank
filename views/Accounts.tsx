import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { TRANSLATIONS } from '../constants';
import { ChevronRight, Eye, EyeOff } from 'lucide-react';
import { Modal } from '../components/Modal';

interface AccountsProps {
    onNavigate: (view: any, context?: any) => void;
    userId?: number;
}

const Accounts: React.FC<AccountsProps> = ({ onNavigate, userId }) => {
  const { state, currentUser, language, formatCurrency, dispatch } = useData();
  const t = TRANSLATIONS[language];
  const [detailTab, setDetailTab] = useState<'Personal' | 'Operational'>('Personal');
  const [viewNoteLog, setViewNoteLog] = useState<any>(null);

  // Logic: If I am an Admin, I see everyone.
  // If I am NOT an Admin, I should not see Admins, UNLESS they are explicitly visible to managers.
  const visibleUsers = state.users.filter(u => {
      if (currentUser?.role === 'Admin') return true;
      return u.role !== 'Admin' || u.isVisibleToManagers;
  });

  const toggleVisibility = (e: React.MouseEvent, user: any) => {
      e.stopPropagation();
      dispatch({
          type: 'UPDATE_USER',
          payload: { ...user, isVisibleToManagers: !user.isVisibleToManagers }
      });
  };

  const handleLogClick = (log: any) => {
      setViewNoteLog(log);
  };

  // User Detail View
  if (userId) {
      const user = state.users.find(u => u.id === userId);
      // Security check: if non-admin tries to view admin details, block unless visible
      if (currentUser?.role !== 'Admin' && user?.role === 'Admin' && !user.isVisibleToManagers) {
          return <div className="p-8 text-center text-gray-500">{t.access_denied}</div>;
      }

      // Filter Logs for this user
      const userLogs = state.activityLog.filter(l => l.userId === userId || l.toUserId === userId || l.fromUserId === userId).reverse();
      
      // Separate logs into Personal (Account history) and Operational (Actions performed as manager)
      const personalLogs = userLogs.filter(log => {
          // Add Money: User deposited money (Personal +)
          if (log.type === 'add_money' && log.userId === userId) return true;
          // Give Money: User received money (Personal - "Taken")
          if (log.type === 'give_money' && log.toUserId === userId) return true;
          
          return false;
      });

      const operationalLogs = userLogs.filter(log => {
          // Give Money: User SENT money
          if (log.type === 'give_money' && log.fromUserId === userId) return true;
          // Spending: User logged an expense
          if (log.type === 'spending' && log.userId === userId) return true;
          // Projects: User funded/withdrew/reactivated
          if (['fund_project', 'withdraw_project', 'reactivate_project'].includes(log.type) && log.userId === userId) return true;
          
          return false;
      });

      const isEmployee = user?.role === 'Employee';
      // Employees only have "Personal" history in this context. 
      // Admins/Managers show the tabs.
      const logsToDisplay = isEmployee ? personalLogs : (detailTab === 'Personal' ? personalLogs : operationalLogs);

      return (
          <div className="space-y-6 animate-in fade-in">
             <div className="bg-surface border border-gray-700 rounded-xl p-6 flex justify-between items-start">
                 <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        {user?.fullName}
                        {user?.role === 'Admin' && (
                            <span className={`text-sm font-normal px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                                user.isVisibleToManagers 
                                    ? 'bg-green-900/20 border-green-900/50 text-success' 
                                    : 'bg-gray-800 border-gray-700 text-gray-400'
                            }`}>
                                {user.isVisibleToManagers ? <Eye size={12} /> : <EyeOff size={12} />}
                                {user.isVisibleToManagers ? t.visible_to_managers : t.hidden_from_managers}
                            </span>
                        )}
                    </h2>
                    <p className="text-gray-400">{user?.role}</p>
                 </div>
             </div>
             
             {/* Tabs for Admin/Manager */}
             {!isEmployee && (
                 <div className="flex p-1 bg-surface border border-gray-800 rounded-lg w-fit">
                    <button 
                        onClick={() => setDetailTab('Personal')} 
                        className={`px-4 py-2 text-sm rounded-md transition-all ${detailTab === 'Personal' ? 'bg-gray-700 text-white' : 'text-gray-400'}`}
                    >
                        {t.account_activity}
                    </button>
                    <button 
                        onClick={() => setDetailTab('Operational')} 
                        className={`px-4 py-2 text-sm rounded-md transition-all ${detailTab === 'Operational' ? 'bg-gray-700 text-white' : 'text-gray-400'}`}
                    >
                        {t.operational_actions}
                    </button>
                 </div>
             )}

             <div className="bg-surface border border-gray-800 rounded-xl overflow-hidden">
                <div className="p-4 border-b border-gray-800">
                    <h3 className="font-bold">
                        {isEmployee ? t.recent_history : (detailTab === 'Personal' ? t.my_account_activity : t.actions_performed)}
                    </h3>
                </div>
                <div className="divide-y divide-gray-800">
                    {logsToDisplay.map(log => {
                        let isPositive = false;
                        let isNeutral = false;
                        let sign = '';

                        // Color Logic
                        if (isEmployee || (detailTab === 'Personal' && !isEmployee)) {
                             // PERSONAL TAB LOGIC
                             if (log.type === 'add_money') {
                                 // "I added money" -> Green
                                 isPositive = true;
                                 sign = '+';
                             } else if (log.type === 'give_money' && log.toUserId === userId) {
                                 // "I received money" -> Red (User took money)
                                 isPositive = false; 
                                 sign = '-'; 
                             }
                        } else {
                            // OPERATIONAL TAB LOGIC (Admin/Manager actions)
                            // Generally, sending money out, spending, funding projects is "spending" power.
                            // We can keep them neutral or specific colors.
                            // Let's use Red for spending/sending, Green for withdrawing from project back to vault.
                            if (log.type === 'withdraw_project') {
                                isPositive = true; // Money back to vault
                                sign = '+';
                            } else {
                                isPositive = false; // Money leaving vault
                                sign = '-';
                            }
                        }
                        
                        return (
                            <div 
                                key={log.id} 
                                onClick={() => handleLogClick(log)}
                                className="p-4 flex justify-between items-center cursor-pointer hover:bg-gray-800 transition-colors"
                            >
                                <div>
                                    <p className="font-medium text-sm">{log.description}</p>
                                    <p className="text-xs text-gray-500">{log.date}</p>
                                </div>
                                <span className={`font-mono font-bold ${isPositive ? 'text-success' : 'text-error'}`}>
                                    {sign}{formatCurrency(log.amount)}
                                </span>
                            </div>
                        );
                    })}
                    {logsToDisplay.length === 0 && <p className="p-8 text-center text-gray-500">{t.no_records_section}</p>}
                </div>
             </div>

             {/* View Note Modal */}
             <Modal
                isOpen={!!viewNoteLog}
                onClose={() => setViewNoteLog(null)}
                title={t.log_details}
            >
                <div className="space-y-4">
                        <div>
                        <label className="text-xs text-gray-500 uppercase tracking-wider">{t.description}</label>
                        <p className="text-white text-lg font-medium">{viewNoteLog?.description}</p>
                        </div>
                        <div className="flex justify-between border-t border-b border-gray-800 py-3">
                            <div>
                                <label className="text-xs text-gray-500 uppercase tracking-wider">{t.amount}</label>
                                <p className="text-secondary font-mono font-bold text-xl">{formatCurrency(viewNoteLog?.amount || 0)}</p>
                            </div>
                            <div className="text-right">
                                <label className="text-xs text-gray-500 uppercase tracking-wider">{t.start_date}</label>
                                <p className="text-gray-300">{viewNoteLog?.date}</p>
                            </div>
                        </div>
                        <div>
                        <label className="text-xs text-gray-500 uppercase tracking-wider">{t.note}</label>
                        <div className="mt-2 p-3 bg-gray-900 rounded-lg border border-gray-800 text-gray-300 whitespace-pre-wrap min-h-[80px]">
                            {viewNoteLog?.note || "No note attached."}
                        </div>
                        </div>
                </div>
            </Modal>
          </div>
      );
  }

  // List View
  return (
    <div className="grid grid-cols-1 gap-3">
        {visibleUsers.map(user => (
            <div 
                key={user.id} 
                onClick={() => onNavigate('account-detail', user)}
                className="bg-surface border border-gray-800 rounded-xl p-4 flex items-center justify-between cursor-pointer hover:bg-gray-800 transition-colors group"
            >
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center font-bold text-lg text-white">
                        {user.fullName.charAt(0)}
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="font-bold text-white">{user.fullName}</h3>
                            {/* Visual Indicator & Toggle for Admins */}
                            {currentUser?.role === 'Admin' && user.role === 'Admin' && (
                                <button
                                    onClick={(e) => toggleVisibility(e, user)}
                                    className={`p-1.5 rounded-md transition-all z-10 ${
                                        user.isVisibleToManagers 
                                            ? 'bg-green-900/20 hover:bg-green-900/40 text-success' 
                                            : 'bg-gray-700 hover:bg-gray-600 text-gray-400'
                                    }`}
                                    title={user.isVisibleToManagers ? t.click_to_hide : t.click_to_show}
                                >
                                    {user.isVisibleToManagers ? <Eye size={16} /> : <EyeOff size={16} />}
                                </button>
                            )}
                        </div>
                        <p className="text-sm text-gray-400">{user.role}</p>
                    </div>
                </div>
                <ChevronRight className="text-gray-600 group-hover:text-secondary" />
            </div>
        ))}
        {visibleUsers.length === 0 && <p className="text-center text-gray-500">{t.no_accounts}</p>}
    </div>
  );
};

export default Accounts;