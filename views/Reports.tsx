import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { TRANSLATIONS } from '../constants';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FileDown, Users } from 'lucide-react';

const Reports = () => {
  const { state, currentUser, language, formatCurrency, getUserRole } = useData();
  const t = TRANSLATIONS[language];
  
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [userFilter, setUserFilter] = useState('all');

  // Determine which users are visible in the dropdown
  const visibleUsers = state.users.filter(u => {
      if (currentUser?.role === 'Admin') return true;
      return u.role !== 'Admin' || u.isVisibleToManagers;
  });

  // Filter Logic
  let filteredLogs = state.activityLog.filter(log => {
      // Date Filter
      const dateMatch = (!dateStart || log.date >= dateStart) && (!dateEnd || log.date <= dateEnd);
      if (!dateMatch) return false;

      // Type Filter
      const typeMatch = typeFilter === 'all' || log.type === typeFilter;
      if (!typeMatch) return false;

      // User Filter
      if (userFilter !== 'all') {
          const uid = Number(userFilter);
          const userMatch = log.userId === uid || log.fromUserId === uid || log.toUserId === uid;
          if (!userMatch) return false;
      }

      // Admin Visibility Filter (Security Layer)
      if (currentUser?.role !== 'Admin') {
          // 1. Check if the main actor (userId) is a hidden Admin
          if (log.userId) {
              const u = state.users.find(u => u.id === log.userId);
              if (u?.role === 'Admin' && !u.isVisibleToManagers) return false;
          }
          // 2. Check if the source (fromUserId) in a transfer was a hidden Admin
          if (log.fromUserId) {
              const u = state.users.find(u => u.id === log.fromUserId);
              if (u?.role === 'Admin' && !u.isVisibleToManagers) return false;
          }
          // 3. Check if the recipient (toUserId) was a hidden Admin (Optional: depending on strictness, usually yes to hide the admin's existence)
          if (log.toUserId) {
              const u = state.users.find(u => u.id === log.toUserId);
              if (u?.role === 'Admin' && !u.isVisibleToManagers) return false;
          }
      }

      return true;
  });

  const totalIncome = filteredLogs.filter(l => l.type === 'add_money' || l.type === 'reactivate_project').reduce((sum, l) => sum + l.amount, 0);
  const totalExpenses = filteredLogs.filter(l => ['spending', 'give_money'].includes(l.type)).reduce((sum, l) => sum + l.amount, 0);
  const net = totalIncome - totalExpenses;

  const exportPDF = () => {
      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text("Financial Report", 14, 20);
      
      doc.setFontSize(12);
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 30);
      
      if (userFilter !== 'all') {
          const u = state.users.find(u => u.id === Number(userFilter));
          doc.text(`Account Statement: ${u?.fullName}`, 14, 38);
      }

      const yStart = userFilter !== 'all' ? 48 : 40;
      doc.text(`Income: ${formatCurrency(totalIncome)}`, 14, yStart);
      doc.text(`Expenses: ${formatCurrency(totalExpenses)}`, 14, yStart + 8);
      doc.text(`Net: ${formatCurrency(net)}`, 14, yStart + 16);

      const tableData = filteredLogs.map(log => [
          log.date,
          log.description,
          log.type,
          formatCurrency(log.amount)
      ]);

      autoTable(doc, {
          startY: yStart + 25,
          head: [['Date', 'Description', 'Type', 'Amount']],
          body: tableData,
      });

      doc.save(`report_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="space-y-6">
       {/* Filters */}
       <div className="bg-surface border border-gray-800 rounded-xl p-4 grid grid-cols-1 md:grid-cols-5 gap-4">
           <div>
               <label className="text-xs text-gray-400 mb-1 block">{t.start_date}</label>
               <input type="date" value={dateStart} onChange={e => setDateStart(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-sm" />
           </div>
           <div>
               <label className="text-xs text-gray-400 mb-1 block">{t.end_date}</label>
               <input type="date" value={dateEnd} onChange={e => setDateEnd(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-sm" />
           </div>
           <div>
               <label className="text-xs text-gray-400 mb-1 block">{t.member}</label>
               <div className="relative">
                   <select value={userFilter} onChange={e => setUserFilter(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-sm text-white appearance-none">
                       <option value="all">{t.all_members}</option>
                       {visibleUsers.map(u => (
                           <option key={u.id} value={u.id}>{u.fullName}</option>
                       ))}
                   </select>
                   <Users size={14} className="absolute right-3 top-3 text-gray-500 pointer-events-none" />
               </div>
           </div>
           <div>
               <label className="text-xs text-gray-400 mb-1 block">{t.type}</label>
               <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-sm text-white">
                   <option value="all">{t.all_types}</option>
                   <option value="add_money">{t.income_type}</option>
                   <option value="spending">{t.spending_type}</option>
                   <option value="fund_project">{t.fund_project_type}</option>
                   <option value="withdraw_project">{t.withdraw_project_type}</option>
                   <option value="give_money">{t.transfer_type}</option>
               </select>
           </div>
           <div className="flex items-end">
               <button onClick={exportPDF} className="w-full bg-primary hover:bg-purple-700 text-white font-medium py-2 rounded-lg transition-colors flex items-center justify-center gap-2">
                   <FileDown size={18} /> {t.export_pdf_btn}
               </button>
           </div>
       </div>

       {/* Summary Cards */}
       <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
           <div className="bg-surface border border-gray-800 rounded-xl p-4">
               <p className="text-xs text-gray-400">{t.total_income}</p>
               <p className="text-xl font-bold text-success">+{formatCurrency(totalIncome)}</p>
           </div>
           <div className="bg-surface border border-gray-800 rounded-xl p-4">
               <p className="text-xs text-gray-400">{t.total_expenses}</p>
               <p className="text-xl font-bold text-error">-{formatCurrency(totalExpenses)}</p>
           </div>
           <div className="bg-surface border border-gray-800 rounded-xl p-4">
               <p className="text-xs text-gray-400">{t.net_profit}</p>
               <p className={`text-xl font-bold ${net >= 0 ? 'text-white' : 'text-error'}`}>{formatCurrency(net)}</p>
           </div>
       </div>

       {/* Results Table */}
       <div className="bg-surface border border-gray-800 rounded-xl overflow-hidden">
           <div className="overflow-x-auto">
               <table className="w-full text-left text-sm">
                   <thead className="bg-gray-900 text-gray-400 uppercase font-medium">
                       <tr>
                           <th className="p-4">{t.start_date}</th> {/* Reusing label for 'Date' */}
                           <th className="p-4">{t.description}</th>
                           <th className="p-4">{t.type}</th>
                           <th className="p-4 text-right">{t.amount}</th>
                       </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-800">
                       {filteredLogs.map(log => (
                           <tr key={log.id} className="hover:bg-gray-800/50">
                               <td className="p-4 text-gray-400">{log.date}</td>
                               <td className="p-4 font-medium">{log.description}</td>
                               <td className="p-4 text-gray-500 text-xs uppercase">{log.type.replace('_', ' ')}</td>
                               <td className={`p-4 text-right font-mono ${
                                   ['add_money', 'reactivate_project'].includes(log.type) ? 'text-success' : 'text-gray-200'
                               }`}>
                                   {formatCurrency(log.amount)}
                                </td>
                           </tr>
                       ))}
                   </tbody>
               </table>
               {filteredLogs.length === 0 && <p className="p-8 text-center text-gray-500">{t.no_records}</p>}
           </div>
       </div>
    </div>
  );
};

export default Reports;