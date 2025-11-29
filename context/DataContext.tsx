
import React, { createContext, useContext, useReducer, useEffect, useState } from 'react';
import { AppState, User, Log, Project, Transaction, Language, Role } from '../types';
import { DEFAULT_STATE } from '../constants';
import { db } from '../firebase';
import { ref, onValue, set } from 'firebase/database';

// Action Types
type Action =
  | { type: 'LOGIN'; payload: User }
  | { type: 'LOGOUT' }
  | { type: 'ADD_MONEY'; payload: { amount: number; userId: number; note?: string; operatorId?: number } }
  | { type: 'CREATE_PROJECT'; payload: { name: string; goal: number; creatorId: number } }
  | { type: 'UPDATE_PROJECT'; payload: { id: number; name: string; goal: number } }
  | { type: 'DELETE_PROJECT'; payload: { projectId: number; userId: number } }
  | { type: 'REACTIVATE_PROJECT'; payload: { projectId: number; userId: number } }
  | { type: 'LOG_SPENDING'; payload: { amount: number; description: string; tag: string; type: string; note?: string; userId?: number } }
  | { type: 'GIVE_MONEY'; payload: { amount: number; toUserId: number; fromUserId?: number; note?: string } }
  | { type: 'FUND_PROJECT'; payload: { projectId: number; amount: number; userId: number } }
  | { type: 'WITHDRAW_PROJECT'; payload: { projectId: number; amount: number; userId: number } }
  | { type: 'COMPLETE_PROJECT'; payload: { projectId: number; userId: number } }
  | { type: 'ADD_USER'; payload: any }
  | { type: 'UPDATE_USER'; payload: User }
  | { type: 'DELETE_USER'; payload: number }
  | { type: 'IMPORT_DATA'; payload: AppState }
  | { type: 'DELETE_LOG'; payload: number }
  | { type: 'UPDATE_LOG'; payload: { id: number; amount: number; note: string } };

// Context Type
interface DataContextType {
  state: AppState;
  currentUser: User | null;
  language: Language;
  setLanguage: (lang: Language) => void;
  login: (username: string, pass: string) => boolean;
  logout: () => void;
  dispatch: React.Dispatch<Action>;
  formatCurrency: (amount: number) => string;
  hasPermission: (permission: string) => boolean;
  getUserRole: (userId: number) => Role | undefined;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

// Reducer
const reducer = (state: AppState, action: Action): AppState => {
  let newState = { ...state };
  const date = new Date().toISOString().split('T')[0];

  switch (action.type) {
    case 'ADD_MONEY': {
      newState.vaultBalance += action.payload.amount;
      const log: Log = {
        id: Date.now(), date,
        description: `Added to Vault`,
        amount: action.payload.amount,
        type: 'add_money',
        userId: action.payload.userId,
        note: action.payload.note,
        operatorId: action.payload.operatorId
      };
      newState.activityLog = [...newState.activityLog, log];
      break;
    }
    case 'CREATE_PROJECT': {
      const newProject: Project = {
        id: Date.now(),
        name: action.payload.name,
        goal: action.payload.goal,
        current: 0,
        status: 'active',
        assignedEmployees: [],
        spentAmount: 0,
        creatorId: action.payload.creatorId
      };
      newState.projects = [...newState.projects, newProject];
      break;
    }
    case 'UPDATE_PROJECT': {
        const index = newState.projects.findIndex(p => p.id === action.payload.id);
        if (index > -1) {
            newState.projects[index] = { 
                ...newState.projects[index], 
                name: action.payload.name, 
                goal: action.payload.goal 
            };
        }
        break;
    }
    case 'DELETE_PROJECT': {
        const p = newState.projects.find(p => p.id === action.payload.projectId);
        if (p) {
            // Refund money if project was active and had funds
            if (p.status === 'active' && p.current > 0) {
                newState.vaultBalance += p.current;
                
                const log: Log = {
                    id: Date.now(), date,
                    description: `Project Deleted: ${p.name} (Refunded to Vault)`,
                    amount: p.current,
                    type: 'withdraw_project', // Technically a withdrawal back to vault
                    projectId: p.id,
                    userId: action.payload.userId
                };
                newState.activityLog = [...newState.activityLog, log];
            }
            newState.projects = newState.projects.filter(p => p.id !== action.payload.projectId);
        }
        break;
    }
    case 'LOG_SPENDING': {
      newState.vaultBalance -= action.payload.amount;
      const spending: Transaction = {
        id: Date.now(),
        date,
        description: action.payload.description,
        amount: action.payload.amount,
        type: action.payload.type,
        tag: action.payload.tag,
        note: action.payload.note,
        userId: action.payload.userId 
      };
      newState.spending = [...newState.spending, spending];
      
      const log: Log = {
        id: Date.now() + 1, date,
        description: `Spending: ${action.payload.description}`,
        amount: action.payload.amount,
        type: 'spending',
        userId: action.payload.userId,
        spendingId: spending.id,
        note: action.payload.note
      };
      newState.activityLog = [...newState.activityLog, log];
      break;
    }
    case 'GIVE_MONEY': {
      newState.vaultBalance -= action.payload.amount;
      const recipient = state.users.find(u => u.id === action.payload.toUserId);
      const description = `Gave money to ${recipient?.fullName}`;
      
      const spending: Transaction = {
        id: Date.now(), date,
        description,
        amount: action.payload.amount,
        type: 'User',
        tag: 'payment',
        note: action.payload.note,
        userId: action.payload.fromUserId
      };
      newState.spending = [...newState.spending, spending];

      const log: Log = {
        id: Date.now() + 1, date,
        description,
        amount: action.payload.amount,
        type: 'give_money',
        toUserId: action.payload.toUserId,
        fromUserId: action.payload.fromUserId,
        spendingId: spending.id,
        note: action.payload.note
      };
      newState.activityLog = [...newState.activityLog, log];
      break;
    }
    case 'FUND_PROJECT': {
      const pIndex = newState.projects.findIndex(p => p.id === action.payload.projectId);
      if (pIndex > -1) {
        newState.projects[pIndex] = { ...newState.projects[pIndex], current: newState.projects[pIndex].current + action.payload.amount };
        newState.vaultBalance -= action.payload.amount;
        
        const log: Log = {
          id: Date.now(), date,
          description: `Funded Project: ${newState.projects[pIndex].name}`,
          amount: action.payload.amount,
          type: 'fund_project',
          projectId: action.payload.projectId,
          userId: action.payload.userId
        };
        newState.activityLog = [...newState.activityLog, log];
      }
      break;
    }
    case 'WITHDRAW_PROJECT': {
      const pIndex = newState.projects.findIndex(p => p.id === action.payload.projectId);
      if (pIndex > -1) {
        newState.projects[pIndex] = { ...newState.projects[pIndex], current: newState.projects[pIndex].current - action.payload.amount };
        newState.vaultBalance += action.payload.amount;
        
        const log: Log = {
          id: Date.now(), date,
          description: `Withdrew from Project: ${newState.projects[pIndex].name}`,
          amount: action.payload.amount,
          type: 'withdraw_project',
          projectId: action.payload.projectId,
          userId: action.payload.userId
        };
        newState.activityLog = [...newState.activityLog, log];
      }
      break;
    }
    case 'COMPLETE_PROJECT': {
      const pIndex = newState.projects.findIndex(p => p.id === action.payload.projectId);
      if (pIndex > -1) {
        const proj = newState.projects[pIndex];
        const amountSpent = proj.current;
        
        const spending: Transaction = {
          id: Date.now(), date,
          description: `Project Completion: ${proj.name}`,
          amount: amountSpent,
          type: 'Project',
          tag: 'project',
          originalProjectId: proj.id,
          userId: action.payload.userId
        };
        newState.spending = [...newState.spending, spending];
        
        const log: Log = {
          id: Date.now() + 1, date,
          description: `Completed/Spent Project: ${proj.name}`,
          amount: amountSpent,
          type: 'spending',
          projectId: proj.id,
          userId: action.payload.userId,
          spendingId: spending.id
        };
        newState.activityLog = [...newState.activityLog, log];

        newState.projects[pIndex] = { 
          ...proj, 
          status: amountSpent >= proj.goal ? 'completed' : 'spent',
          spentAmount: amountSpent,
          current: 0
        };
      }
      break;
    }
    case 'REACTIVATE_PROJECT': {
        const pIndex = newState.projects.findIndex(p => p.id === action.payload.projectId);
        if (pIndex > -1) {
            const proj = newState.projects[pIndex];
            const restoredAmount = proj.spentAmount || 0;
            
            // Restore Project State
            newState.projects[pIndex] = {
                ...proj,
                status: 'active',
                current: restoredAmount,
                spentAmount: 0
            };

            // Remove the spending transaction associated with the completion
            newState.spending = newState.spending.filter(s => 
                !(s.originalProjectId === proj.id && s.type === 'Project')
            );

            // Add Log
            const log: Log = {
                id: Date.now(), date,
                description: `Reactivated Project: ${proj.name}`,
                amount: restoredAmount,
                type: 'reactivate_project',
                projectId: proj.id,
                userId: action.payload.userId
            };
            newState.activityLog = [...newState.activityLog, log];
        }
        break;
    }
    case 'ADD_USER': {
        const newUser: User = { ...action.payload, id: Date.now() };
        newState.users = [...newState.users, newUser];
        break;
    }
    case 'UPDATE_USER': {
        const index = newState.users.findIndex(u => u.id === action.payload.id);
        if (index > -1) {
            newState.users[index] = action.payload;
        }
        break;
    }
    case 'DELETE_USER': {
        newState.users = newState.users.filter(u => u.id !== action.payload);
        break;
    }
    case 'DELETE_LOG': {
        const log = newState.activityLog.find(l => l.id === action.payload);
        if (log) {
            // Reverse the effect of the log
            switch (log.type) {
                case 'add_money':
                    newState.vaultBalance -= log.amount;
                    break;
                case 'spending':
                    const spendingItem = newState.spending.find(s => s.id === log.spendingId);
                    if (spendingItem && spendingItem.originalProjectId) {
                        const pIndex = newState.projects.findIndex(p => p.id === spendingItem.originalProjectId);
                        if (pIndex > -1) {
                            const proj = newState.projects[pIndex];
                            newState.projects[pIndex] = {
                                ...proj,
                                status: 'active',
                                current: proj.current + log.amount,
                                spentAmount: 0
                            };
                        }
                    } else {
                        newState.vaultBalance += log.amount;
                    }
                    if (log.spendingId) {
                        newState.spending = newState.spending.filter(s => s.id !== log.spendingId);
                    }
                    break;
                case 'give_money':
                    newState.vaultBalance += log.amount;
                    if (log.spendingId) {
                        newState.spending = newState.spending.filter(s => s.id !== log.spendingId);
                    }
                    break;
                case 'fund_project':
                    newState.vaultBalance += log.amount;
                    if (log.projectId) {
                        const p = newState.projects.find(p => p.id === log.projectId);
                        if (p) p.current -= log.amount;
                    }
                    break;
                case 'withdraw_project':
                    newState.vaultBalance -= log.amount;
                    if (log.projectId) {
                        const p = newState.projects.find(p => p.id === log.projectId);
                        if (p) p.current += log.amount;
                    }
                    break;
                case 'reactivate_project':
                     if (log.projectId) {
                        const p = newState.projects.find(p => p.id === log.projectId);
                        if (p) p.current -= log.amount;
                     }
                     break;
            }
            newState.activityLog = newState.activityLog.filter(l => l.id !== action.payload);
        }
        break;
    }
    case 'UPDATE_LOG': {
        const index = newState.activityLog.findIndex(l => l.id === action.payload.id);
        if (index > -1) {
            const log = newState.activityLog[index];
            const oldAmount = log.amount;
            const newAmount = action.payload.amount;
            const diff = newAmount - oldAmount;

            switch (log.type) {
                case 'add_money':
                    newState.vaultBalance += diff;
                    break;
                case 'spending':
                case 'give_money':
                    newState.vaultBalance -= diff;
                    if (log.spendingId) {
                        const sIndex = newState.spending.findIndex(s => s.id === log.spendingId);
                        if (sIndex > -1) newState.spending[sIndex].amount = newAmount;
                    }
                    break;
                case 'fund_project':
                    newState.vaultBalance -= diff;
                    if (log.projectId) {
                        const p = newState.projects.find(p => p.id === log.projectId);
                        if (p) p.current += diff;
                    }
                    break;
                case 'withdraw_project':
                    newState.vaultBalance += diff;
                    if (log.projectId) {
                        const p = newState.projects.find(p => p.id === log.projectId);
                        if (p) p.current -= diff;
                    }
                    break;
            }
            
            newState.activityLog[index] = { ...log, amount: newAmount, note: action.payload.note };
        }
        break;
    }
    case 'IMPORT_DATA': {
        newState = action.payload;
        break;
    }
  }

  // Sync to Firebase ONLY if the action is NOT 'IMPORT_DATA' (which comes from Firebase itself)
  if (action.type !== 'IMPORT_DATA') {
      set(ref(db, '/'), newState).catch(err => console.error("Firebase Sync Error", err));
  }
  
  return newState;
};

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, DEFAULT_STATE);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [language, setLanguage] = useState<Language>('en');

  // Initialize from Firebase
  useEffect(() => {
    const dataRef = ref(db, '/');
    const unsubscribe = onValue(dataRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
            // Ensure data integrity when loading from DB (handle missing arrays etc)
            if (data.users) {
                data.users = data.users.map((u: User) => ({
                    ...u,
                    permissions: u.permissions || []
                }));
            }
            // Ensure arrays exist even if DB returns null/undefined for empty lists
            const sanitizedData = {
                ...DEFAULT_STATE,
                ...data,
                users: data.users || DEFAULT_STATE.users,
                projects: data.projects || [],
                spending: data.spending || [],
                activityLog: data.activityLog || []
            };
            dispatch({ type: 'IMPORT_DATA', payload: sanitizedData });
        } else {
            // If DB is empty, initialize it with default state
            set(ref(db, '/'), DEFAULT_STATE);
        }
    });

    return () => unsubscribe();
  }, []);

  const login = (username: string, pass: string) => {
    // Find user in the latest state
    const user = state.users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.password === pass);
    if (user) {
      setCurrentUser(user);
      return true;
    }
    return false;
  };

  const logout = () => setCurrentUser(null);

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString()} IQD`;
  };

  const hasPermission = (permission: string): boolean => {
    if (!currentUser) return false;
    return currentUser.permissions.includes(permission);
  };

  const getUserRole = (userId: number): Role | undefined => {
    const user = state.users.find(u => u.id === userId);
    return user?.role;
  };

  return (
    <DataContext.Provider value={{ state, currentUser, language, setLanguage, login, logout, dispatch, formatCurrency, hasPermission, getUserRole }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) throw new Error("useData must be used within DataProvider");
  return context;
};
