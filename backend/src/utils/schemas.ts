import { z } from 'zod';

// Upload schemas
export const uploadSchema = z.object({
  type: z.string().optional(),
});

// Categorize schemas
export const categorizeSchema = z.object({
  transactionIds: z.array(z.string()).optional(),
  userId: z.string(),
});

// Tax schemas
export const taxQuerySchema = z.object({
  assessmentYear: z.string().optional(),
  userId: z.string().optional(), // Injected by auth middleware
});

export const itrComputeSchema = z.object({
  assessmentYear: z.string().min(4),
  regime: z.enum(['old', 'new']),
  taxDocumentId: z.string().optional(),
  userId: z.string().optional(), // Injected by auth middleware
});

export const form16IdParamSchema = z.object({
  id: z.string(),
  userId: z.string().optional(),
});

// Insights schemas
export const insightsQuerySchema = z.object({
  period: z.string().optional(),
  type: z.string().optional(),
  userId: z.string().optional(), // Injected by auth middleware
});

// Report schemas
export const reportQuerySchema = z.object({
  month: z.string(),
  userId: z.string().optional(), // Injected by auth middleware
});

// Chat schemas
export const chatSchema = z.object({
  message: z.string().min(1),
  userId: z.string().optional(), // Injected by auth middleware
  conversationId: z.string().optional(),
});

// Auth schemas
export const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// Dispute schemas
export const disputeSchema = z.object({
  transactionId: z.string(),
  userId: z.string().optional(), // Injected by auth middleware
  reason: z.string().optional(),
});

// Metrics schemas
export const metricsQuerySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

