
import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { TRANSLATIONS, PERMISSIONS_LIST } from '../constants';
import { Download, Upload, Trash2, UserPlus, Edit, CheckSquare, Square, X, Eye, EyeOff } from 'lucide-react';
import { Role, User } from '../types';
import { Modal } from '../components/Modal';

const Admin = () => {
  const { state, language, dispatch } = useData();
  const t = TRANSLATIONS[language];
  
  // User Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<Role>('Employee');
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isVisibleToManagers, setIsVisibleToManagers] = useState(false);

  // Group permissions by category for the UI
  const permissionCategories = PERMISSIONS_LIST.reduce((acc, curr) => {
    if (!acc[curr.category]) acc[curr.category] = [];
    acc[curr.category].push(curr);
    return acc;
  }, {} as Record<string, typeof PERMISSIONS_LIST>);

  const openAddUser = () => {
    setEditingUserId(null);
    setUsername('');
    setPassword('');
    setFullName('');
    setRole('Employee');
    setPermissions(PERMISSIONS_LIST.filter(p => p.id.includes('my_')).map(p => p.id)); // Default to basic
    setIsVisibleToManagers(false);
    setIsModalOpen(true);
  };

  const openEditUser = (user: User) => {
    setEditingUserId(user.id);
    setUsername(user.username);
    setPassword(user.password || '');
    setFullName(user.fullName);
    setRole(user.role);
    setPermissions(user.permissions || []);
    setIsVisibleToManagers(user.isVisibleToManagers || false);
    setIsModalOpen(true);
  };

  const togglePermission = (permId: string) => {
    setPermissions(prev => 
      prev.includes(permId) 
        ? prev.filter(p => p !== permId) 
        : [...prev, permId]
    );
  };

  const handleSaveUser = (e: React.FormEvent) => {
      e.preventDefault();
      const userData = { 
        username, 
        password, 
        fullName, 
        role, 
        permissions,
        isVisibleToManagers 
      };

      if (editingUserId) {
        dispatch({ 
            type: 'UPDATE_USER', 
            payload: { id: editingUserId, ...userData } 
        });
      } else {
        dispatch({ 
            type: 'ADD_USER', 
            payload: userData 
        });
      }
      setIsModalOpen(false);
  };

  const handleDeleteUser = (id: number) => {
      if (window.confirm(t.confirm_deletion_text)) {
          dispatch({ type: 'DELETE_USER', payload: id });
      }
  };

  const handleExport = () => {
      const dataStr = JSON.stringify(state, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
          try {
              const data = JSON.parse(event.target?.result as string);
              if(confirm("Overwrite all current data? This cannot be undone.")) {
                  dispatch({ type: 'IMPORT_DATA', payload: data });
                  alert('Data imported successfully');
              }
          } catch (err) {
              alert('Invalid JSON file');
          }
      };
      reader.readAsText(file);
  };

  return (
    <div className="space-y-8 animate-in fade-in">
      {/* Header & Add Button */}
      <div className="flex justify-between items-center bg-surface border border-gray-800 p-6 rounded-xl">
          <div>
            <h2 className="text-xl font-bold">{t.manage_users}</h2>
            <p className="text-sm text-gray-400">{t.manage_users}</p>
          </div>
          <button onClick={openAddUser} className="bg-primary hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 transition-colors">
              <UserPlus size={18}/> <span className="hidden sm:inline">{t.create_user}</span>
          </button>
      </div>

      {/* User Table */}
      <div className="bg-surface border border-gray-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
                <thead className="bg-gray-900 border-b border-gray-800 text-gray-400">
                    <tr>
                        <th className="p-4">{t.user_header}</th>
                        <th className="p-4">{t.role_header}</th>
                        <th className="p-4">{t.permissions}</th>
                        <th className="p-4 text-right">{t.actions_header}</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                    {state.users.map(u => (
                        <tr key={u.id} className="hover:bg-gray-800/50 group">
                            <td className="p-4">
                                <div className="font-bold flex items-center gap-2 text-white">
                                    {u.fullName}
                                    {u.role === 'Admin' && !u.isVisibleToManagers && (
                                        <span title={t.hidden_from_managers}>
                                            <EyeOff size={14} className="text-gray-500" />
                                        </span>
                                    )}
                                </div>
                                <div className="text-xs text-gray-500">@{u.username}</div>
                            </td>
                            <td className="p-4">
                                <span className={`px-2 py-1 rounded text-xs font-bold border ${
                                    u.role === 'Admin' ? 'bg-purple-900/30 border-purple-800 text-purple-300' :
                                    u.role === 'Manager' ? 'bg-blue-900/30 border-blue-800 text-blue-300' :
                                    'bg-gray-800 border-gray-700 text-gray-400'
                                }`}>
                                    {u.role}
                                </span>
                            </td>
                            <td className="p-4">
                                <span className="text-xs bg-gray-800 px-2 py-1 rounded text-gray-300">
                                    {(u.permissions || []).length} {t.capabilities}
                                </span>
                            </td>
                            <td className="p-4 text-right flex justify-end gap-2">
                                <button onClick={() => openEditUser(u)} className="p-2 bg-gray-800 hover:bg-gray-700 rounded text-blue-400 transition-colors">
                                    <Edit size={16} />
                                </button>
                                {u.id !== 1 && (
                                    <button onClick={() => handleDeleteUser(u.id)} className="p-2 bg-gray-800 hover:bg-red-900/30 rounded text-error transition-colors">
                                        <Trash2 size={16} />
                                    </button>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
          </div>
      </div>

      {/* Data Management */}
      <div className="bg-surface border border-gray-800 rounded-xl p-6">
          <h3 className="text-lg font-bold mb-4">{t.data_mgmt}</h3>
          <div className="flex flex-wrap gap-4">
               <button onClick={handleExport} className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white py-2 px-4 rounded-lg transition-colors">
                   <Download size={18} /> {t.export_data}
               </button>
               <div className="relative">
                   <input type="file" onChange={handleImport} accept=".json" className="absolute inset-0 opacity-0 cursor-pointer" />
                   <button className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white py-2 px-4 rounded-lg transition-colors pointer-events-none">
                       <Upload size={18} /> {t.import_data}
                   </button>
               </div>
          </div>
      </div>

      {/* User Modal */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingUserId ? t.edit_user : t.create_user}
      >
        <form onSubmit={handleSaveUser} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-xs text-gray-400">{t.username_placeholder}</label>
                    <input type="text" required value={username} onChange={e => setUsername(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:border-secondary outline-none" />
                </div>
                <div className="space-y-2">
                    <label className="text-xs text-gray-400">{t.password_placeholder}</label>
                    <input type="text" value={password} onChange={e => setPassword(e.target.value)} placeholder={editingUserId ? "********" : ""} className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:border-secondary outline-none" />
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-xs text-gray-400">Full Name</label>
                <input type="text" required value={fullName} onChange={e => setFullName(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:border-secondary outline-none" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-xs text-gray-400">{t.role_header}</label>
                    <select value={role} onChange={e => setRole(e.target.value as Role)} className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:border-secondary outline-none">
                        <option value="Admin">Admin</option>
                        <option value="Manager">Manager</option>
                        <option value="Employee">Employee</option>
                    </select>
                </div>

                {role === 'Admin' && (
                    <div className="space-y-2">
                         <label className="text-xs text-gray-400">{t.visible_to_managers}</label>
                         <button 
                            type="button" 
                            onClick={() => setIsVisibleToManagers(!isVisibleToManagers)}
                            className={`w-full p-3 rounded-lg border flex items-center justify-between transition-colors ${
                                isVisibleToManagers 
                                    ? 'bg-green-900/20 border-green-900/50 text-success' 
                                    : 'bg-gray-900 border-gray-700 text-gray-400'
                            }`}
                         >
                            <span className="text-sm">{isVisibleToManagers ? "Visible" : "Hidden"}</span>
                            {isVisibleToManagers ? <Eye size={18} /> : <EyeOff size={18} />}
                         </button>
                         <p className="text-[10px] text-gray-500">{t.visible_desc}</p>
                    </div>
                )}
            </div>

            <div className="space-y-3 pt-4 border-t border-gray-800">
                <h4 className="font-bold text-sm text-gray-300">{t.permissions}</h4>
                <div className="space-y-4 h-60 overflow-y-auto pr-2 custom-scrollbar">
                    {Object.entries(permissionCategories).map(([category, perms]) => (
                        <div key={category}>
                            <h5 className="text-xs font-bold text-secondary uppercase tracking-wider mb-2">{category}</h5>
                            <div className="grid grid-cols-1 gap-2">
                                {perms.map(p => (
                                    <button 
                                        key={p.id}
                                        type="button"
                                        onClick={() => togglePermission(p.id)}
                                        className={`flex items-center gap-3 p-2 rounded-lg text-sm text-left transition-colors ${
                                            permissions.includes(p.id) 
                                                ? 'bg-gray-800 text-white' 
                                                : 'text-gray-500 hover:text-gray-300'
                                        }`}
                                    >
                                        {permissions.includes(p.id) ? <CheckSquare size={16} className="text-secondary" /> : <Square size={16} />}
                                        {p.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <button type="submit" className="w-full py-3 bg-primary text-white font-bold rounded-lg hover:bg-purple-700 transition-colors">
                {t.save_changes}
            </button>
        </form>
      </Modal>
    </div>
  );
};

export default Admin;
