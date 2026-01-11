export enum ViewState {
  LANDING = 'LANDING',
  AUTH = 'AUTH',
  ONBOARDING = 'ONBOARDING',
  DASHBOARD = 'DASHBOARD',
}

export enum DashboardTab {
  OVERVIEW = 'OVERVIEW',
  AI_WORKSPACE = 'AI_WORKSPACE',
  TAXES = 'TAXES',
  COMPLIANCE = 'COMPLIANCE',
  REPORTS = 'REPORTS',
  DOCUMENTS = 'DOCUMENTS',
  BUSINESS = 'BUSINESS',
  SETTINGS = 'SETTINGS',
}

export enum UserRole {
  INDIVIDUAL = 'INDIVIDUAL',
  FREELANCER = 'FREELANCER',
  BUSINESS = 'BUSINESS',
}

export interface UserProfile {
  name: string;
  email: string;
  role: UserRole;
  pan?: string;
  gstin?: string[];
  riskAppetite?: number; // 0-100
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
  isThinking?: boolean;
}


