export type Role = 'Admin' | 'Manager' | 'Employee';
export type Language = 'en' | 'ar' | 'ku';
export type ProjectStatus = 'active' | 'spent' | 'completed';

export interface User {
  id: number;
  username: string;
  password?: string;
  role: Role;
  fullName: string;
  permissions: string[];
  isVisibleToManagers?: boolean;
}

export interface Project {
  id: number;
  name: string;
  current: number;
  goal: number;
  status: ProjectStatus;
  assignedEmployees: number[];
  spentAmount: number;
  creatorId?: number;
}

export interface Transaction {
  id: number;
  date: string;
  description: string;
  amount: number;
  type: string;
  tag?: string;
  note?: string;
  originalProjectId?: number;
  userId?: number;
}

export interface Log {
  id: number;
  date: string;
  description: string;
  amount: number;
  type: 'add_money' | 'spending' | 'give_money' | 'fund_project' | 'withdraw_project' | 'reactivate_project';
  userId?: number;
  toUserId?: number;
  fromUserId?: number;
  projectId?: number;
  spendingId?: number;
  note?: string;
  operatorId?: number;
}

export interface AppState {
  users: User[];
  projects: Project[];
  spending: Transaction[];
  activityLog: Log[];
  vaultBalance: number;
}