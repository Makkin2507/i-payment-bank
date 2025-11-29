import React, { useState, useEffect } from 'react';
import { useData } from './context/DataContext';
import { TRANSLATIONS } from './constants';
import { 
  LogOut, ArrowLeft, LayoutDashboard, Wallet, FolderKanban, 
  CreditCard, History, Users, FileBarChart, ShieldCheck, 
  Plus, Send, Archive
} from 'lucide-react';
import { Modal } from './components/Modal';

// Views
import Dashboard from './views/Dashboard';
import Vault from './views/Vault';
import Projects from './views/Projects';
import Spending from './views/Spending';
import ActivityLog from './views/ActivityLog';
import Accounts from './views/Accounts';
import Reports from './views/Reports';
import Admin from './views/Admin';
import Login from './views/Login';

// Define View Types
type View = 'dashboard' | 'vault' | 'projects' | 'spending' | 'activity' | 'accounts' | 'reports' | 'admin' | 'project-detail' | 'account-detail';

const App = () => {
  const { state, currentUser, logout, language, hasPermission, dispatch } = useData();
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [viewContext, setViewContext] = useState<any>(null);
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [actionType, setActionType] = useState<'add_money' | 'create_project' | 'log_expense' | 'give_money' | null>(null);

  // Form States for Modal
  const [amount, setAmount] = useState('');
  const [desc, setDesc] = useState('');
  const [tag, setTag] = useState('');
  const [note, setNote] = useState('');
  const [selectedUser, setSelectedUser] = useState('');
  const [spendingType, setSpendingType] = useState('General');

  const t = TRANSLATIONS[language];
  const isRTL = language === 'ar' || language === 'ku';

  useEffect(() => {
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
    
    // Set font based on language
    if (isRTL) {
      document.body.style.fontFamily = "'Noto Sans Arabic', sans-serif";
    } else {
      document.body.style.fontFamily = "'Roboto', sans-serif";
    }
  }, [language, isRTL]);

  const handleNavigate = (view: View, context: any = null) => {
    setCurrentView(view);
    setViewContext(context);
  };

  const handleSubmitAction = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    
    if (actionType === 'add_money') {
       dispatch({ 
         type: 'ADD_MONEY', 
         payload: { 
           amount: numAmount, 
           userId: Number(selectedUser), 
           note,
           operatorId: currentUser!.id 
         } 
       });
    } else if (actionType === 'create_project') {
       dispatch({ 
         type: 'CREATE_PROJECT', 
         payload: { name: desc, goal: numAmount, creatorId: currentUser!.id } 
       });
    } else if (actionType === 'log_expense') {
      dispatch({
        type: 'LOG_SPENDING',
        payload: { amount: numAmount, description: desc, tag, type: spendingType, note, userId: currentUser?.id }
      });
    } else if (actionType === 'give_money') {
      dispatch({
        type: 'GIVE_MONEY',
        payload: { amount: numAmount, toUserId: Number(selectedUser), fromUserId: currentUser?.id, note }
      });
    }

    setIsActionModalOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setAmount(''); setDesc(''); setTag(''); setNote(''); setSelectedUser('');
    setActionType(null);
  };

  if (!currentUser) {
    return <Login />;
  }

  const getPageTitle = () => {
    switch (currentView) {
      case 'dashboard': return t.dashboard;
      case 'vault': return t.vault_details;
      case 'projects': return t.projects;
      case 'spending': return t.spending;
      case 'activity': return t.activity_log;
      case 'accounts': return t.member_accounts;
      case 'reports': return t.accounting_reports;
      case 'admin': return t.admin_panel;
      case 'project-detail': return viewContext?.name || t.project;
      case 'account-detail': return viewContext?.fullName || 'Account';
      default: return '';
    }
  };

  // Determine if FAB should show
  const showFab = hasPermission('add_money') || hasPermission('create_project') || hasPermission('log_expense') || hasPermission('give_money');

  return (
    <div className={`min-h-screen bg-background text-gray-100 pb-20`}>
      {/* Header */}
      <header className="sticky top-0 z-40 bg-surface border-b border-gray-800 shadow-md">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            {currentView !== 'dashboard' && (
              <button 
                onClick={() => handleNavigate('dashboard')}
                className="p-2 hover:bg-gray-800 rounded-full transition-colors"
              >
                <ArrowLeft size={20} className={isRTL ? "rotate-180" : ""} />
              </button>
            )}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-sm font-bold">
                {currentUser.fullName.charAt(0)}
              </div>
              <div>
                <h1 className="text-lg font-bold leading-tight">{getPageTitle()}</h1>
                <p className="text-xs text-gray-400">{currentUser.fullName} ({currentUser.role})</p>
              </div>
            </div>
          </div>
          <button 
            onClick={logout}
            className="p-2 text-secondary hover:bg-gray-800 rounded-lg text-sm font-medium flex items-center gap-2"
          >
            <span className="hidden sm:inline">{t.logout}</span>
            <LogOut size={18} className={isRTL ? "rotate-180" : ""} />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4 max-w-7xl mx-auto">
        {currentView === 'dashboard' && <Dashboard onNavigate={handleNavigate} />}
        {currentView === 'vault' && hasPermission('view_vault') && <Vault />}
        {currentView === 'projects' && (hasPermission('view_projects') || hasPermission('view_my_projects')) && <Projects onNavigate={handleNavigate} />}
        {currentView === 'project-detail' && <Projects projectId={viewContext?.id} onNavigate={handleNavigate} />}
        {currentView === 'spending' && hasPermission('view_spending') && <Spending />}
        {currentView === 'activity' && (hasPermission('view_activity') || hasPermission('view_my_activity')) && <ActivityLog />}
        {currentView === 'accounts' && hasPermission('view_accounts') && <Accounts onNavigate={handleNavigate} />}
        {currentView === 'account-detail' && <Accounts userId={viewContext?.id} onNavigate={handleNavigate} />}
        {currentView === 'reports' && hasPermission('view_reports') && <Reports />}
        {currentView === 'admin' && hasPermission('access_admin') && <Admin />}
      </main>

      {/* FAB - Admin Actions */}
      {showFab && (
        <button 
          onClick={() => setIsActionModalOpen(true)}
          className="fixed bottom-6 right-6 w-14 h-14 bg-secondary text-background rounded-full shadow-lg hover:bg-white transition-all flex items-center justify-center z-40 hover:scale-105 active:scale-95"
        >
          <Plus size={32} />
        </button>
      )}

      {/* Action Selection Modal */}
      <Modal 
        isOpen={isActionModalOpen && !actionType} 
        onClose={() => setIsActionModalOpen(false)} 
        title={t.admin_panel}
      >
        <div className="grid grid-cols-2 gap-4">
          {hasPermission('add_money') && (
            <button onClick={() => setActionType('add_money')} className="p-4 bg-gray-800 border border-gray-700 rounded-xl hover:border-secondary flex flex-col items-center gap-2 transition-all">
                <Wallet className="text-success" size={24} />
                <span className="text-sm font-medium">{t.add_money}</span>
            </button>
          )}
          {hasPermission('create_project') && (
            <button onClick={() => setActionType('create_project')} className="p-4 bg-gray-800 border border-gray-700 rounded-xl hover:border-secondary flex flex-col items-center gap-2 transition-all">
                <FolderKanban className="text-blue-400" size={24} />
                <span className="text-sm font-medium">{t.create_project}</span>
            </button>
          )}
          {hasPermission('log_expense') && (
            <button onClick={() => setActionType('log_expense')} className="p-4 bg-gray-800 border border-gray-700 rounded-xl hover:border-secondary flex flex-col items-center gap-2 transition-all">
                <CreditCard className="text-error" size={24} />
                <span className="text-sm font-medium">{t.log_expense}</span>
            </button>
          )}
          {hasPermission('give_money') && (
            <button onClick={() => setActionType('give_money')} className="p-4 bg-gray-800 border border-gray-700 rounded-xl hover:border-secondary flex flex-col items-center gap-2 transition-all">
                <Send className="text-yellow-400" size={24} />
                <span className="text-sm font-medium">{t.give_money}</span>
            </button>
          )}
        </div>
      </Modal>

      {/* Specific Action Forms Modal */}
      <Modal
        isOpen={!!actionType}
        onClose={() => { setActionType(null); setIsActionModalOpen(false); }}
        title={actionType ? t[actionType] : ''}
      >
        <form onSubmit={handleSubmitAction} className="space-y-4">
          {actionType === 'create_project' ? (
            <div className="space-y-2">
              <label className="text-xs text-gray-400">{t.description} ({t.project_name})</label>
              <input type="text" required value={desc} onChange={e => setDesc(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:border-secondary outline-none" placeholder={t.project_name} />
            </div>
          ) : actionType === 'log_expense' && (
            <div className="space-y-2">
              <label className="text-xs text-gray-400">{t.expense_name}</label>
              <input type="text" required value={desc} onChange={e => setDesc(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:border-secondary outline-none" placeholder={t.expense_name} />
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs text-gray-400">{t.amount} (IQD)</label>
            <input type="number" required min="1" value={amount} onChange={e => setAmount(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:border-secondary outline-none" />
          </div>

          {(actionType === 'add_money' || actionType === 'give_money') && (
            <div className="space-y-2">
              <label className="text-xs text-gray-400">{actionType === 'add_money' ? t.deposited_by : t.recipient}</label>
              <select required value={selectedUser} onChange={e => setSelectedUser(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:border-secondary outline-none">
                <option value="">{t.select_user}</option>
                {state.users.map(u => (
                  <option key={u.id} value={u.id}>{u.fullName}</option>
                ))}
              </select>
            </div>
          )}

          {actionType === 'log_expense' && (
            <>
               <div className="space-y-2">
                <label className="text-xs text-gray-400">{t.tag}</label>
                <input type="text" required value={tag} onChange={e => setTag(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:border-secondary outline-none" placeholder="e.g. food" />
              </div>
              <div className="space-y-2">
                <label className="text-xs text-gray-400">{t.type}</label>
                <select value={spendingType} onChange={e => setSpendingType(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:border-secondary outline-none">
                  <option value="House">{t.house}</option>
                  <option value="General">{t.general}</option>
                </select>
              </div>
            </>
          )}

          <div className="space-y-2">
            <label className="text-xs text-gray-400">{t.note}</label>
            <textarea value={note} onChange={e => setNote(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:border-secondary outline-none h-20 resize-none" />
          </div>

          <button type="submit" className="w-full py-3 bg-primary hover:bg-purple-700 text-white font-bold rounded-lg transition-colors">
            {t.confirm}
          </button>
        </form>
      </Modal>

    </div>
  );
};

export default App;