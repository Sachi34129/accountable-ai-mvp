export interface ExtractionResult {
  transactions: TransactionData[];
  metadata: {
    documentType: string;
    extractedAt: string;
    confidence: number;
    model: string;
    version: string;
  };
}

export interface TransactionData {
  id?: string;
  date: string;
  amount: number;
  currency: string;
  description: string;
  merchant?: string;
  direction: 'income' | 'expense';
  category?: string;
  subCategory?: string;
  isRecurring?: boolean;
  labels?: string[];
  confidence?: number;
}

export interface CategorizationResult {
  category: string;
  subCategory?: string;
  explanation: string;
  confidence: number;
}

export interface TaxOpportunity {
  section: string;
  title: string;
  potentialDeduction: number;
  evidenceTransactionIds: string[];
  explanation: string;
  confidence: number;
  uncertaintyNote?: string;
}

export interface Insight {
  type: 'spending_velocity' | 'anomaly' | 'payment_tip' | 'trend';
  summary: string;
  eli5?: string;
  data?: Record<string, unknown>;
  explanation?: string;
  confidence?: number;
}

export interface EfficiencyMetric {
  metric: string;
  value: number;
  unit?: string;
  trend?: string;
  insight: string;
}

export interface OnboardingResult {
  tasks: Array<{
    id: string;
    title: string;
    description: string;
    status: 'pending' | 'in_progress' | 'completed';
    deadline: string | null;
    responsiblePerson: string | null;
  }>;
  complianceCheck: {
    passed: boolean;
    findings: string[];
    recommendations: string[];
  };
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface DisputeDraft {
  subject: string;
  body: string;
  recipient?: string;
  transactionDetails: {
    date: string;
    amount: number;
    description: string;
  };
}

export interface Metrics {
  accuracy: {
    extraction: number;
    categorization: number;
    taxDetection: number;
  };
  latency: {
    p50: number;
    p90: number;
    p99: number;
  };
  requests: {
    total: number;
    byEndpoint: Record<string, number>;
  };
}

