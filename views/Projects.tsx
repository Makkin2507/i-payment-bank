import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { TRANSLATIONS } from '../constants';
import { Modal } from '../components/Modal';
import { ProjectStatus } from '../types';
import { FolderKanban, TrendingUp, TrendingDown, User, Edit2, Trash2, ShieldAlert, RotateCcw } from 'lucide-react';

interface ProjectsProps {
  onNavigate: (view: any, context?: any) => void;
  projectId?: number;
}

const Projects: React.FC<ProjectsProps> = ({ onNavigate, projectId }) => {
  const { state, currentUser, language, formatCurrency, dispatch } = useData();
  const t = TRANSLATIONS[language];
  const [activeTab, setActiveTab] = useState<ProjectStatus>('active');
  const [transferModal, setTransferModal] = useState<{ isOpen: boolean; type: 'fund' | 'withdraw' } | null>(null);
  const [transferAmount, setTransferAmount] = useState('');
  
  // New States for requested features
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  
  // Edit Project State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editGoal, setEditGoal] = useState('');

  // Secure Delete State
  const [deleteVerify, setDeleteVerify] = useState<{ isOpen: boolean; code: string; input: string } | null>(null);

  // Reactivate Confirmation State
  const [isReactivateModalOpen, setIsReactivateModalOpen] = useState(false);

  const getUserName = (id?: number) => {
    if (!id) return 'System';
    const user = state.users.find(u => u.id === id);
    return user ? user.fullName : 'Unknown';
  };

  // Project Detail Mode
  if (projectId) {
    const project = state.projects.find(p => p.id === projectId);
    if (!project) return <div>{t.no_projects_found}</div>;

    // Security check for Detail View
    if (currentUser?.role !== 'Admin' && project.creatorId) {
         const u = state.users.find(u => u.id === project.creatorId);
         if (u?.role === 'Admin' && !u.isVisibleToManagers) {
             return <div className="p-8 text-center text-gray-500">{t.access_denied}</div>;
         }
    }

    const progress = project.goal > 0 ? ((project.status === 'active' ? project.current : project.spentAmount) / project.goal) * 100 : 0;
    
    // Filter Project Logs
    const projectLogs = state.activityLog.filter(l => {
        if (l.projectId !== project.id) return false;
        
        if (currentUser?.role !== 'Admin') {
             if (l.userId) {
                const u = state.users.find(u => u.id === l.userId);
                if (u?.role === 'Admin' && !u.isVisibleToManagers) return false;
             }
        }
        return true;
    }).reverse();

    const handleTransfer = (e: React.FormEvent) => {
        e.preventDefault();
        const amount = parseFloat(transferAmount);
        if(!transferModal) return;

        if (transferModal.type === 'fund') {
            // Check for over-funding
            if (project.current + amount > project.goal) {
                alert(`Cannot fund more than goal. Remaining space: ${formatCurrency(project.goal - project.current)}`);
                return;
            }
            dispatch({ type: 'FUND_PROJECT', payload: { projectId, amount, userId: currentUser!.id } });
        } else {
            if (amount > project.current) {
                alert(`Insufficient funds in project. Current: ${formatCurrency(project.current)}`);
                return;
            }
            dispatch({ type: 'WITHDRAW_PROJECT', payload: { projectId, amount, userId: currentUser!.id } });
        }
        setTransferModal(null);
        setTransferAmount('');
    };

    const handleComplete = () => {
        dispatch({ type: 'COMPLETE_PROJECT', payload: { projectId, userId: currentUser!.id }});
        setIsCompleteModalOpen(false);
    };

    const handleReactivate = () => {
        setIsReactivateModalOpen(true);
    };

    const confirmReactivate = () => {
        dispatch({ type: 'REACTIVATE_PROJECT', payload: { projectId, userId: currentUser!.id }});
        setIsReactivateModalOpen(false);
    };

    const handleEditOpen = () => {
        setEditName(project.name);
        setEditGoal(project.goal.toString());
        setIsEditModalOpen(true);
    };

    const handleEditSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        dispatch({
            type: 'UPDATE_PROJECT',
            payload: { id: project.id, name: editName, goal: parseFloat(editGoal) }
        });
        setIsEditModalOpen(false);
    };

    const handleDeleteClick = () => {
        // Generate a random 3-digit code
        const randomCode = Math.floor(100 + Math.random() * 900).toString();
        setDeleteVerify({
            isOpen: true,
            code: randomCode,
            input: ''
        });
    };

    const confirmDelete = (e: React.FormEvent) => {
        e.preventDefault();
        if (deleteVerify && deleteVerify.input === deleteVerify.code) {
            dispatch({ type: 'DELETE_PROJECT', payload: { projectId: project.id, userId: currentUser!.id } });
            setDeleteVerify(null);
            onNavigate('projects'); // Go back to list
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in">
            {/* Header Card */}
            <div className="bg-surface border border-gray-700 rounded-2xl p-6 relative overflow-hidden group">
                <div className="flex justify-between items-start z-10 relative">
                    <div>
                        <div className="flex items-center gap-2">
                             <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                                project.status === 'active' ? 'bg-success/20 text-success' : 'bg-gray-700 text-gray-300'
                            }`}>
                                {t[project.status]}
                            </span>
                        </div>
                       
                        <h1 className="text-3xl font-bold mt-2">{project.name}</h1>
                        <p className="text-gray-400 text-sm mt-1">{t.goal}: {formatCurrency(project.goal)}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-sm text-gray-400">{t.current_balance}</p>
                        <p className="text-3xl font-bold text-secondary">
                            {formatCurrency(project.status === 'active' ? project.current : project.spentAmount)}
                        </p>
                        
                        {/* Admin Controls */}
                        {currentUser?.role === 'Admin' && (
                             <div className="flex justify-end gap-2 mt-2">
                                {project.status === 'active' ? (
                                    <>
                                        <button onClick={handleEditOpen} className="p-2 bg-gray-800 hover:bg-blue-900/30 rounded text-blue-400 transition-colors">
                                            <Edit2 size={16} />
                                        </button>
                                        <button onClick={handleDeleteClick} className="p-2 bg-gray-800 hover:bg-red-900/30 rounded text-error transition-colors">
                                            <Trash2 size={16} />
                                        </button>
                                    </>
                                ) : (
                                    <button 
                                        onClick={handleReactivate}
                                        className="px-3 py-1.5 bg-gray-800 hover:bg-blue-900/30 rounded text-blue-400 transition-colors flex items-center gap-2 text-sm font-medium"
                                    >
                                        <RotateCcw size={16} /> {t.reactivate}
                                    </button>
                                )}
                             </div>
                        )}
                    </div>
                </div>

                <div className="mt-6">
                    <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-secondary transition-all duration-500"
                            style={{ width: `${Math.min(progress, 100)}%` }}
                        />
                    </div>
                    <div className="flex justify-between text-xs mt-2 text-gray-500">
                        <span>0%</span>
                        <span>{Math.round(progress)}% {t.funded}</span>
                    </div>
                </div>
            </div>

            {/* Actions */}
            {project.status === 'active' && currentUser?.role !== 'Employee' && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button 
                        onClick={() => setTransferModal({ isOpen: true, type: 'fund' })}
                        className="p-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl flex items-center justify-center gap-2 text-success font-medium transition-colors"
                    >
                        <TrendingUp size={18} /> {t.fund}
                    </button>
                    <button 
                        onClick={() => setTransferModal({ isOpen: true, type: 'withdraw' })}
                        className="p-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl flex items-center justify-center gap-2 text-error font-medium transition-colors"
                    >
                        <TrendingDown size={18} /> {t.withdraw}
                    </button>
                    <button 
                        onClick={() => setIsCompleteModalOpen(true)}
                        className="p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-colors"
                    >
                        Spend / Complete
                    </button>
                </div>
            )}

            {/* History */}
            <div className="bg-surface border border-gray-800 rounded-xl overflow-hidden">
                <div className="p-4 border-b border-gray-800 bg-gray-900/50">
                    <h3 className="font-bold">{t.project_activity}</h3>
                </div>
                <div className="divide-y divide-gray-800 max-h-96 overflow-y-auto">
                    {projectLogs.map(log => (
                        <div key={log.id} className="p-4 flex justify-between items-center">
                            <div>
                                <p className="font-medium text-sm">{log.description}</p>
                                <div className="flex items-center gap-2 mt-1">
                                    <p className="text-xs text-gray-500">{log.date}</p>
                                    <div className="flex items-center gap-1 bg-gray-900 px-2 py-0.5 rounded border border-gray-800 text-xs">
                                         <User size={10} className="text-secondary" />
                                         <span className="text-gray-300">{getUserName(log.userId)}</span>
                                    </div>
                                </div>
                            </div>
                            <span className={`font-mono font-bold ${
                                log.type === 'fund_project' ? 'text-success' : 'text-error'
                            }`}>
                                {log.type === 'fund_project' ? '+' : '-'}{formatCurrency(log.amount)}
                            </span>
                        </div>
                    ))}
                    {projectLogs.length === 0 && <p className="p-4 text-center text-gray-500">{t.no_activity}</p>}
                </div>
            </div>

            {/* Transfer Modal */}
            <Modal 
                isOpen={!!transferModal} 
                onClose={() => setTransferModal(null)} 
                title={transferModal?.type === 'fund' ? t.fund : t.withdraw}
            >
                <form onSubmit={handleTransfer} className="space-y-4">
                    <div>
                        <label className="text-xs text-gray-400">{t.amount}</label>
                        <input type="number" required autoFocus value={transferAmount} onChange={e => setTransferAmount(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:border-secondary outline-none" />
                        {transferModal?.type === 'fund' && (
                             <p className="text-xs text-gray-500 mt-1">
                                 {t.remaining_goal_space}: {formatCurrency(project.goal - project.current)}
                             </p>
                        )}
                    </div>
                    <button type="submit" className="w-full py-3 bg-primary text-white font-bold rounded-lg">{t.confirm}</button>
                </form>
            </Modal>

            {/* Complete Project Confirmation Modal */}
            <Modal
                isOpen={isCompleteModalOpen}
                onClose={() => setIsCompleteModalOpen(false)}
                title={t.confirm_completion}
            >
                <div className="text-center space-y-4">
                    <div className="w-16 h-16 bg-blue-900/20 text-blue-500 rounded-full flex items-center justify-center mx-auto border border-blue-900/50">
                        <FolderKanban size={32} />
                    </div>
                    <p className="text-gray-300">
                        {t.confirm_completion_text} <strong className="text-white">{formatCurrency(project.current)}</strong> {t.and_close_project}
                    </p>
                    <div className="flex gap-3 pt-4">
                         <button onClick={() => setIsCompleteModalOpen(false)} className="flex-1 py-3 bg-gray-800 rounded-lg font-bold">{t.cancel}</button>
                         <button onClick={handleComplete} className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-500">{t.yes_complete}</button>
                    </div>
                </div>
            </Modal>

             {/* Reactivate Project Confirmation Modal */}
             <Modal
                isOpen={isReactivateModalOpen}
                onClose={() => setIsReactivateModalOpen(false)}
                title={t.confirm_reactivation}
            >
                <div className="text-center space-y-4">
                    <div className="w-16 h-16 bg-green-900/20 text-success rounded-full flex items-center justify-center mx-auto border border-green-900/50">
                        <RotateCcw size={32} />
                    </div>
                    <p className="text-gray-300">
                        {t.confirm_reactivation_text} 
                        <br/>
                        <span className="text-sm text-gray-400">{t.restore_funds_note}</span>
                    </p>
                    <div className="flex gap-3 pt-4">
                         <button onClick={() => setIsReactivateModalOpen(false)} className="flex-1 py-3 bg-gray-800 rounded-lg font-bold">{t.cancel}</button>
                         <button onClick={confirmReactivate} className="flex-1 py-3 bg-success text-black rounded-lg font-bold hover:bg-green-500">{t.yes_reactivate}</button>
                    </div>
                </div>
            </Modal>

            {/* Edit Project Modal */}
            <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title={t.edit_project}>
                 <form onSubmit={handleEditSubmit} className="space-y-4">
                     <div className="space-y-2">
                        <label className="text-xs text-gray-400">{t.project_name}</label>
                        <input type="text" required value={editName} onChange={e => setEditName(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:border-secondary outline-none" />
                     </div>
                     <div className="space-y-2">
                        <label className="text-xs text-gray-400">{t.funding_goal}</label>
                        <input type="number" required value={editGoal} onChange={e => setEditGoal(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:border-secondary outline-none" />
                     </div>
                     <button type="submit" className="w-full py-3 bg-primary text-white font-bold rounded-lg">{t.save_changes}</button>
                 </form>
            </Modal>

            {/* Secure Delete Modal */}
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
                                    <h3 className="font-bold text-lg text-white">{t.delete_project_title}</h3>
                                    <p className="text-sm text-gray-400 mt-1">
                                        {t.delete_project_text}
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
                                    {t.delete_project_btn}
                            </button>
                        </div>
                    </form>
                )}
            </Modal>
        </div>
    );
  }

  // List Mode
  let filteredProjects = state.projects.filter(p => p.status === activeTab);
  
  // Role Filtering
  if (currentUser?.role === 'Employee') {
    filteredProjects = filteredProjects.filter(p => p.assignedEmployees.includes(currentUser.id));
  } else if (currentUser?.role !== 'Admin') {
      // Hide Admin-created projects from Managers
      filteredProjects = filteredProjects.filter(p => {
          if (p.creatorId) {
             const u = state.users.find(u => u.id === p.creatorId);
             if (u?.role === 'Admin' && !u.isVisibleToManagers) return false;
          }
          return true;
      });
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-2 p-1 bg-surface border border-gray-800 rounded-xl w-full sm:w-auto self-start overflow-x-auto">
        {(['active', 'spent', 'completed'] as const).map(tab => (
            <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                    activeTab === tab ? 'bg-gray-700 text-white shadow-md' : 'text-gray-400 hover:text-white'
                }`}
            >
                {t[tab]}
            </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProjects.map(project => {
             const progress = project.goal > 0 ? ((project.status === 'active' ? project.current : project.spentAmount) / project.goal) * 100 : 100;
             
             return (
                <div 
                    key={project.id} 
                    onClick={() => onNavigate('project-detail', project)}
                    className="bg-surface border border-gray-800 hover:border-secondary rounded-xl p-5 cursor-pointer transition-all hover:-translate-y-1 group"
                >
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2 bg-gray-800 rounded-lg text-secondary group-hover:bg-secondary group-hover:text-white transition-colors">
                            <FolderKanban size={20} />
                        </div>
                        <span className={`text-xs px-2 py-1 rounded bg-gray-900 font-mono ${
                            project.status === 'active' ? 'text-success' : 'text-gray-400'
                        }`}>
                            {formatCurrency(project.status === 'active' ? project.current : project.spentAmount)}
                        </span>
                    </div>
                    
                    <h3 className="font-bold text-lg mb-1 truncate">{project.name}</h3>
                    <p className="text-xs text-gray-400 mb-4">{t.goal}: {formatCurrency(project.goal)}</p>

                    <div className="w-full bg-gray-900 h-2 rounded-full overflow-hidden">
                        <div className="bg-secondary h-full" style={{ width: `${Math.min(progress, 100)}%` }} />
                    </div>
                </div>
             );
        })}
        {filteredProjects.length === 0 && (
            <div className="col-span-full py-12 text-center text-gray-500 border border-dashed border-gray-800 rounded-xl">
                {t.no_projects_found}
            </div>
        )}
      </div>
    </div>
  );
};

export default Projects;