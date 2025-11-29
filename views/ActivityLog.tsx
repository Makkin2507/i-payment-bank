import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { TRANSLATIONS } from '../constants';
import { ArrowUpRight, ArrowDownLeft, RefreshCcw, User, Edit2, Trash2, ArrowRight, ShieldAlert } from 'lucide-react';
import { Modal } from '../components/Modal';

const ActivityLog = () => {
  const { state, currentUser, language, formatCurrency, dispatch } = useData();
  const t = TRANSLATIONS[language];
  const [view, setView] = useState<'General' | 'Personal'>(currentUser?.role === 'Employee' ? 'Personal' : 'General');
  
  // Edit State
  const [editingLog, setEditingLog] = useState<any>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editNote, setEditNote] = useState('');

  // Note View State
  const [viewNoteLog, setViewNoteLog] = useState<any>(null);

  // Delete Verification State
  const [deleteVerify, setDeleteVerify] = useState<{ isOpen: boolean; logId: number | null; code: string; input: string } | null>(null);

  // Filter Logic:
  // 1. Start with all logs
  // 2. If view is 'Personal', filter to current user
  let logs = state.activityLog.filter(log => {
      // Personal View Filter
      if (view === 'Personal') {
          return log.userId === currentUser!.id || log.fromUserId === currentUser!.id || log.toUserId === currentUser!.id;
      }
      return true;
  });

  logs.reverse();

  const getUserName = (id?: number) => {
      if (!id) return 'System';
      const user = state.users.find(u => u.id === id);
      
      // If the user we are looking up is an Admin, and they are Hidden,
      // and the current viewer is NOT an Admin, mask the name.
      if (currentUser?.role !== 'Admin' && user?.role === 'Admin' && !user.isVisibleToManagers) {
          return 'System'; 
      }

      return user ? user.fullName : 'Unknown';
  };

  const handleLogClick = (log: any) => {
      setViewNoteLog(log);
  };

  const handleEditClick = (e: React.MouseEvent, log: any) => {
      e.stopPropagation();
      setEditingLog(log);
      setEditAmount(log.amount.toString());
      setEditNote(log.note || '');
  };

  const handleDeleteClick = (e: React.MouseEvent, id: number) => {
      e.stopPropagation();
      // Generate a random 3-digit code (100-999)
      const randomCode = Math.floor(100 + Math.random() * 900).toString();
      
      setDeleteVerify({
          isOpen: true,
          logId: id,
          code: randomCode,
          input: ''
      });
  };

  const confirmDelete = (e: React.FormEvent) => {
      e.preventDefault();
      if (deleteVerify && deleteVerify.input === deleteVerify.code && deleteVerify.logId) {
          dispatch({ type: 'DELETE_LOG', payload: deleteVerify.logId });
          setDeleteVerify(null);
      }
  };

  const submitEdit = (e: React.FormEvent) => {
      e.preventDefault();
      if (editingLog) {
          dispatch({
              type: 'UPDATE_LOG',
              payload: { id: editingLog.id, amount: parseFloat(editAmount), note: editNote }
          });
          setEditingLog(null);
      }
  };

  return (
    <div className="space-y-6">
       {currentUser?.role !== 'Employee' && (
           <div className="flex p-1 bg-surface border border-gray-800 rounded-lg w-fit">
               <button onClick={() => setView('General')} className={`px-4 py-2 text-sm rounded-md transition-all ${view === 'General' ? 'bg-gray-700 text-white' : 'text-gray-400'}`}>{t.general_view}</button>
               <button onClick={() => setView('Personal')} className={`px-4 py-2 text-sm rounded-md transition-all ${view === 'Personal' ? 'bg-gray-700 text-white' : 'text-gray-400'}`}>{t.personal_view}</button>
           </div>
       )}

       <div className="space-y-3">
           {logs.map(log => {
               const isPositive = log.type === 'add_money' || log.type === 'fund_project';
               const isNeutral = log.type === 'withdraw_project';
               
               return (
                   <div 
                        key={log.id} 
                        onClick={() => handleLogClick(log)}
                        className="bg-surface border border-gray-800 hover:bg-gray-800 transition-colors cursor-pointer rounded-xl p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between group"
                    >
                       <div className="flex items-center gap-4">
                           <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                               isPositive ? 'bg-green-900/30 text-green-500' : isNeutral ? 'bg-blue-900/30 text-blue-500' : 'bg-red-900/30 text-red-500'
                           }`}>
                               {isPositive ? <ArrowDownLeft size={18} /> : isNeutral ? <RefreshCcw size={18} /> : <ArrowUpRight size={18} />}
                           </div>
                           <div className="min-w-0">
                               <p className="font-medium text-white truncate">{log.description}</p>
                               <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400 mt-1">
                                   <span>{log.date}</span>
                                   <span className="w-1 h-1 bg-gray-600 rounded-full" />
                                   
                                   {/* User Display */}
                                   <div className="flex items-center gap-1.5 bg-gray-900 px-2.5 py-1 rounded-md border border-gray-700 shadow-sm">
                                       <User size={12} className="text-secondary" />
                                       <span className="font-medium text-gray-300">
                                           {log.type === 'give_money' && log.fromUserId && log.toUserId ? (
                                              <span className="flex items-center gap-1">
                                                  <span>{getUserName(log.fromUserId)}</span>
                                                  <ArrowRight size={10} className="text-gray-500" />
                                                  <span className="text-secondary">{getUserName(log.toUserId)}</span>
                                              </span>
                                           ) : (
                                              <span>
                                                {getUserName(log.userId)}
                                                {log.operatorId && log.operatorId !== log.userId && (
                                                    <span className="text-gray-500 text-xs ml-1 font-normal">
                                                        (by {getUserName(log.operatorId)})
                                                    </span>
                                                )}
                                              </span>
                                           )}
                                       </span>
                                   </div>

                                   {log.note && (
                                       <>
                                         <span className="w-1 h-1 bg-gray-600 rounded-full" />
                                         <span className="italic max-w-[150px] truncate">"{log.note}"</span>
                                       </>
                                   )}
                               </div>
                           </div>
                       </div>

                       <div className="flex items-center justify-between sm:justify-end gap-4 pl-14 sm:pl-0">
                           <span className={`font-mono font-bold whitespace-nowrap ${
                               isPositive ? 'text-success' : isNeutral ? 'text-blue-400' : 'text-error'
                           }`}>
                               {isPositive ? '+' : '-'}{formatCurrency(log.amount)}
                           </span>

                           {/* Edit/Delete Actions - Admin Only */}
                           {currentUser?.role === 'Admin' && (
                               <div className="flex gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                   <button 
                                      onClick={(e) => handleEditClick(e, log)}
                                      className="p-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-blue-400"
                                      title={t.edit}
                                   >
                                       <Edit2 size={16} />
                                   </button>
                                   <button 
                                      onClick={(e) => handleDeleteClick(e, log.id)}
                                      className="p-1.5 bg-gray-800 hover:bg-red-900/30 rounded-lg text-error"
                                      title={t.delete}
                                   >
                                       <Trash2 size={16} />
                                   </button>
                               </div>
                           )}
                       </div>
                   </div>
               );
           })}
           {logs.length === 0 && <p className="text-center text-gray-500 py-10">{t.no_records}</p>}
       </div>

       {/* View Note Modal */}
        <Modal
          isOpen={!!viewNoteLog}
          onClose={() => setViewNoteLog(null)}
          title={t.activity_details}
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

       {/* Edit Modal */}
       <Modal
          isOpen={!!editingLog}
          onClose={() => setEditingLog(null)}
          title={t.edit}
       >
           <form onSubmit={submitEdit} className="space-y-4">
               <p className="text-sm text-gray-400 bg-gray-900 p-3 rounded border border-gray-800">
                   <strong>{t.editing}:</strong> {editingLog?.description}
                   <br/>
                   <span className="text-xs text-error mt-1 block">{t.warning_edit}</span>
               </p>
               
               <div className="space-y-2">
                    <label className="text-xs text-gray-400">{t.amount} (IQD)</label>
                    <input 
                        type="number" 
                        required 
                        value={editAmount} 
                        onChange={e => setEditAmount(e.target.value)} 
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:border-secondary outline-none" 
                    />
               </div>
               
               <div className="space-y-2">
                    <label className="text-xs text-gray-400">{t.note}</label>
                    <textarea 
                        value={editNote} 
                        onChange={e => setEditNote(e.target.value)} 
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:border-secondary outline-none h-24 resize-none" 
                    />
               </div>

               <button type="submit" className="w-full py-3 bg-primary text-white font-bold rounded-lg hover:bg-purple-700 transition-colors">
                   {t.save_changes}
               </button>
           </form>
       </Modal>

       {/* Delete Security Modal */}
       <Modal
          isOpen={!!deleteVerify?.isOpen}
          onClose={() => setDeleteVerify(null)}
          title={t.security_check}
       >
           {deleteVerify && (
               <form onSubmit={confirmDelete} className="space-y-6">
                   <div className="flex flex-col items-center gap-4 text-center">
                       <div className="w-16 h-16 bg-red-900/20 text-error rounded-full flex items-center justify-center border border-red-900/50">
                            <ShieldAlert size={32} />
                       </div>
                       <div>
                            <h3 className="font-bold text-lg text-white">{t.confirm_deletion_title}</h3>
                            <p className="text-sm text-gray-400 mt-1">
                                {t.confirm_deletion_text}
                            </p>
                       </div>
                       
                       <div className="bg-gray-900 border border-gray-700 rounded-lg py-3 px-8 text-3xl font-mono font-bold tracking-widest text-secondary shadow-inner">
                            {deleteVerify.code}
                       </div>
                   </div>

                   <div className="space-y-2">
                        <label className="text-xs text-gray-400">{t.enter_security_code}</label>
                        <input 
                            type="text" 
                            required 
                            autoFocus
                            placeholder={t.type_code}
                            value={deleteVerify.input} 
                            onChange={e => setDeleteVerify({ ...deleteVerify, input: e.target.value })} 
                            className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-center text-white text-xl tracking-widest focus:border-error outline-none" 
                            maxLength={3}
                        />
                   </div>

                   <div className="flex gap-3">
                       <button 
                            type="button" 
                            onClick={() => setDeleteVerify(null)} 
                            className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg font-bold transition-colors"
                        >
                            {t.cancel}
                       </button>
                       <button 
                            type="submit" 
                            disabled={deleteVerify.input !== deleteVerify.code}
                            className={`flex-1 py-3 rounded-lg font-bold transition-all ${
                                deleteVerify.input === deleteVerify.code 
                                    ? 'bg-error hover:bg-red-700 text-white' 
                                    : 'bg-gray-800 text-gray-500 cursor-not-allowed'
                            }`}
                        >
                            {t.delete_log}
                       </button>
                   </div>
               </form>
           )}
       </Modal>
    </div>
  );
};

export default ActivityLog;