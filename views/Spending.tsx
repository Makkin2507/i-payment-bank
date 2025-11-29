import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { TRANSLATIONS } from '../constants';
import { Tag, Filter } from 'lucide-react';
import { Modal } from '../components/Modal';

const Spending = () => {
  const { state, currentUser, language, formatCurrency, getUserRole } = useData();
  const t = TRANSLATIONS[language];
  const [filterType, setFilterType] = useState('All');
  const [tagFilter, setTagFilter] = useState('');
  const [selectedNote, setSelectedNote] = useState<string | null>(null);

  // Filter Logic:
  // 1. Standard Type filter
  // 2. Hide Admin spending from non-admins unless visible
  // 3. Tag Filter
  const filtered = state.spending
    .filter(s => {
        // Standard Type Filter
        if (filterType !== 'All' && s.type !== filterType) return false;

        // Tag Filter
        if (tagFilter && (!s.tag || !s.tag.toLowerCase().includes(tagFilter.toLowerCase()))) return false;

        // Admin Visibility Filter
        if (currentUser?.role !== 'Admin') {
            if (s.userId) {
                const u = state.users.find(u => u.id === s.userId);
                if (u?.role === 'Admin' && !u.isVisibleToManagers) return false;
            }
        }

        return true;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {['All', 'House', 'General', 'Project', 'User'].map(type => (
                <button
                    key={type}
                    onClick={() => setFilterType(type)}
                    className={`px-4 py-2 rounded-full border text-sm transition-all whitespace-nowrap ${
                        filterType === type 
                            ? 'bg-secondary text-background border-secondary font-bold' 
                            : 'border-gray-700 text-gray-400 hover:border-gray-500'
                    }`}
                >
                    {t[type.toLowerCase()] || type}
                </button>
            ))}
          </div>
          
          <div className="relative flex-grow sm:max-w-xs">
             <input 
                type="text" 
                placeholder="Filter by Tag..." 
                value={tagFilter}
                onChange={(e) => setTagFilter(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg py-2 pl-9 pr-3 text-sm text-white focus:border-secondary outline-none"
             />
             <Filter size={14} className="absolute left-3 top-3 text-gray-500" />
          </div>
      </div>

      <div className="space-y-3">
        {filtered.map(item => (
            <div 
                key={item.id} 
                onClick={() => setSelectedNote(item.note || 'No note')}
                className="bg-surface border border-gray-800 rounded-xl p-4 flex items-center justify-between cursor-pointer hover:bg-gray-800 transition-colors"
            >
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-gray-400">
                        <Tag size={18} />
                    </div>
                    <div>
                        <p className="font-medium text-white">{item.description}</p>
                        <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                            <span>{item.date}</span>
                            <span className="w-1 h-1 bg-gray-600 rounded-full" />
                            <span className="bg-gray-800 px-2 py-0.5 rounded text-gray-300">{item.type}</span>
                            {item.tag && (
                                <>
                                    <span className="w-1 h-1 bg-gray-600 rounded-full" />
                                    <span className="text-gray-400 italic">#{item.tag}</span>
                                </>
                            )}
                        </div>
                    </div>
                </div>
                <span className="font-mono font-bold text-error">
                    -{formatCurrency(item.amount)}
                </span>
            </div>
        ))}
        {filtered.length === 0 && <p className="text-center text-gray-500 py-10">No records found.</p>}
      </div>

      <Modal
        isOpen={selectedNote !== null}
        onClose={() => setSelectedNote(null)}
        title="Note"
      >
        <p className="text-gray-300 whitespace-pre-wrap">{selectedNote}</p>
      </Modal>
    </div>
  );
};

export default Spending;