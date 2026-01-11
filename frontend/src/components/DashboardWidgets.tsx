import React from 'react';
import { UserProfile } from '../types';
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  FileText,
  Download,
  UploadCloud,
  ChevronRight,
  TrendingUp,
  DollarSign,
  Scale,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useBusinessContext } from '../contexts/business-context';

// --- Shared Components ---
const Card = ({ children, className = '' }: { children?: React.ReactNode; className?: string }) => (
  <div className={`bg-white p-6 rounded-2xl shadow-sm border border-slate-100 ${className}`}>{children}</div>
);

const SectionTitle = ({ title }: { title: string }) => <h2 className="text-xl font-bold text-slate-900 mb-6">{title}</h2>;

// --- Overview Widget ---
export const Overview: React.FC<{ userProfile: UserProfile }> = ({ userProfile }) => {
  const { activeBusinessId } = useBusinessContext();
  const [analytics, setAnalytics] = React.useState<any>(null);
  const [analyticsErr, setAnalyticsErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    const load = async () => {
      if (!activeBusinessId) return;
      setAnalyticsErr(null);
      const resp = await fetch('/api/accounting/analytics', {
        credentials: 'include',
        headers: { 'X-Entity-Id': activeBusinessId },
      });
      const data = await resp.json().catch(() => ({} as any));
      if (!resp.ok) throw new Error(data?.error || `Failed to load analytics (${resp.status})`);
      setAnalytics(data);
    };
    void load().catch((e: any) => setAnalyticsErr(String(e?.message || e)));
  }, [activeBusinessId]);

  const monthly = (analytics?.monthly || []).map((m: any) => ({
    name: String(m.month || '').slice(5, 7), // MM
    inflow: Number(m.inflow || 0),
    outflow: Number(m.outflow || 0),
  }));
  const totals = analytics?.totals || { totalInflow: 0, totalOutflow: 0, net: 0, txCount: 0, needsReviewCount: 0 };
  const fmt = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

  const byCategory = (analytics?.byCategory || []) as Array<{ code: string; name: string; amount: number; count: number }>;
  const topCategory = byCategory
    .filter((c) => c.code !== 'UNCLASSIFIED')
    .sort((a, b) => Math.abs(Number(b.amount || 0)) - Math.abs(Number(a.amount || 0)))[0];

  // Deterministic (non-AI) health score.
  const reviewPenalty = Math.min(30, Number(totals.needsReviewCount || 0) * 2);
  const cashflowScore = Number(totals.net || 0) >= 0 ? 35 : 20;
  const baseScore = 50 + cashflowScore - reviewPenalty;
  const healthScore = Math.max(0, Math.min(100, Math.round(baseScore)));
  const healthLabel = healthScore >= 80 ? 'Excellent' : healthScore >= 65 ? 'Good' : healthScore >= 45 ? 'Fair' : 'Needs attention';

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-6 text-white flex flex-col md:flex-row justify-between items-center shadow-lg">
        <div>
          <h1 className="text-2xl font-bold mb-2">Welcome back, {userProfile.name}</h1>
          <p className="text-slate-300">
            Your financial health score is{' '}
            <span className="text-emerald-400 font-bold">
              {healthLabel} ({healthScore}/100)
            </span>
          </p>
        </div>
        <div className="mt-4 md:mt-0 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20">
          <span className="text-sm">Next Filing Deadline:</span>
          <div className="font-bold flex items-center gap-2">
            <Clock size={16} /> 31st July (ITR)
          </div>
        </div>
      </div>

      {/* AI Insight */}
      <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-start gap-3">
        <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
          <TrendingUp size={20} />
        </div>
        <div>
          <h3 className="font-bold text-blue-900 text-sm">Insight</h3>
          <p className="text-blue-800 text-sm mt-1">
            {analyticsErr
              ? 'Upload and commit transactions to see insights.'
              : topCategory
                ? `Top category: ${topCategory.name} (${fmt(Math.abs(Number(topCategory.amount || 0)))})`
                : 'No data yet. Upload and commit transactions to generate insights.'}
          </p>
        </div>
        <div className="ml-auto text-xs font-semibold bg-white text-blue-600 px-3 py-1.5 rounded-lg border border-blue-200 shadow-sm">
          Live
        </div>
      </div>

      {/* Key Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-slate-500 text-sm font-medium">Total Inflow</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{fmt(Number(totals.totalInflow || 0))}</h3>
            </div>
            <div className="p-2 bg-rose-50 text-rose-600 rounded-lg">
              <DollarSign size={20} />
            </div>
          </div>
          <div className="text-xs text-slate-500">{totals.txCount || 0} transactions considered</div>
        </Card>
        <Card>
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-slate-500 text-sm font-medium">Total Outflow</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{fmt(Number(totals.totalOutflow || 0))}</h3>
            </div>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <CheckCircle size={20} />
            </div>
          </div>
          <div className="text-xs text-slate-500">Net: {fmt(Number(totals.net || 0))}</div>
        </Card>
        <Card>
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-slate-500 text-sm font-medium">Needs Review</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{Number(totals.needsReviewCount || 0)}</h3>
            </div>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <ShieldCheckIcon size={20} />
            </div>
          </div>
          <div className="text-xs text-slate-500">
            {analyticsErr ? `Analytics unavailable: ${analyticsErr}` : 'Based on committed accounting data'}
          </div>
        </Card>
      </div>

      {/* Main Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <h3 className="font-bold text-slate-900 mb-6">Inflow vs Outflow Trend</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <Tooltip
                  cursor={{ fill: '#f1f5f9' }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="inflow" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={20} />
                <Bar dataKey="outflow" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <h3 className="font-bold text-slate-900 mb-4">Pending Actions</h3>
          <div className="space-y-4">
            <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg flex gap-3">
              <AlertTriangle className="text-amber-600 shrink-0" size={18} />
              <div>
                <p className="text-sm font-semibold text-amber-900">Link Aadhaar to PAN</p>
                <p className="text-xs text-amber-700 mt-1">Deadline approaching</p>
              </div>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg flex gap-3 items-center">
              <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-500">
                <UploadCloud size={14} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-900">Upload Rent Receipts</p>
              </div>
              <ChevronRight size={16} className="text-slate-400" />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

// --- Taxes Widget ---
export const Taxes: React.FC = () => {
  const [file, setFile] = React.useState<File | null>(null);
  const [taxDocumentId, setTaxDocumentId] = React.useState<string | null>(null);
  const [issues, setIssues] = React.useState<Array<{ severity: string; code: string; message: string }>>([]);
  const [ready, setReady] = React.useState(false);
  const [assessmentYear, setAssessmentYear] = React.useState('2024-25');
  const [regime, setRegime] = React.useState<'old' | 'new'>('old');
  const [run, setRun] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);

  const uploadForm16 = async () => {
    if (!file) return;
    setLoading(true);
    setMsg(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const resp = await fetch('/api/tax/form16/upload', { method: 'POST', credentials: 'include', body: fd });
      const data = await resp.json().catch(() => ({} as any));
      if (!resp.ok) throw new Error(data?.error || `Upload failed (${resp.status})`);
      setTaxDocumentId(data.taxDocumentId);
      setMsg('Uploaded. Next: Extract & Validate.');
    } catch (e: any) {
      setMsg(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  };

  const extractAndValidate = async () => {
    if (!taxDocumentId) return;
    setLoading(true);
    setMsg(null);
    try {
      const resp = await fetch(`/api/tax/form16/${encodeURIComponent(taxDocumentId)}/extract`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await resp.json().catch(() => ({} as any));
      if (!resp.ok) throw new Error(data?.error || `Extract failed (${resp.status})`);
      setIssues(data.issues || []);
      const hasErrors = (data.issues || []).some((i: any) => i.severity === 'error');
      setReady(!hasErrors);
      setMsg(hasErrors ? 'Fix issues (or re-upload clearer PDF) before computing.' : 'Ready to compute.');
    } catch (e: any) {
      setMsg(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  };

  const compute = async () => {
    setLoading(true);
    setMsg(null);
    try {
      const resp = await fetch('/api/tax/itr/compute', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assessmentYear, regime, taxDocumentId }),
      });
      const data = await resp.json().catch(() => ({} as any));
      if (!resp.ok) throw new Error(data?.error || `Compute failed (${resp.status})`);
      setRun(data);
      setMsg('Computation generated.');
    } catch (e: any) {
      setMsg(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  };

  const downloadHandoff = async () => {
    const resp = await fetch('/api/tax/itr/handoff', { credentials: 'include' });
    const data = await resp.json().catch(() => ({} as any));
    if (!resp.ok) throw new Error(data?.error || 'Failed to export');
    const blob = new Blob([JSON.stringify(data.handoff, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ca-handoff-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <SectionTitle title="Income Tax (ITR) — Form 16 v1" />

      <Card>
        <div className="flex flex-col md:flex-row md:items-end gap-3">
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-700 mb-1">Upload Form 16 (PDF, max 1MB)</label>
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="block w-full text-sm text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-slate-900 file:text-white hover:file:bg-slate-800"
            />
          </div>
          <button
            onClick={uploadForm16}
            disabled={!file || loading}
            className={`px-4 py-2 rounded-lg text-sm font-semibold ${
              !file || loading ? 'bg-slate-200 text-slate-400' : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            Upload
          </button>
          <button
            onClick={extractAndValidate}
            disabled={!taxDocumentId || loading}
            className={`px-4 py-2 rounded-lg text-sm font-semibold ${
              !taxDocumentId || loading ? 'bg-slate-200 text-slate-400' : 'bg-slate-900 text-white hover:bg-slate-800'
            }`}
          >
            Extract & Validate
          </button>
        </div>
        {msg && <div className="mt-3 text-sm text-slate-700">{msg}</div>}
      </Card>

      <Card>
        <div className="flex flex-col md:flex-row md:items-end gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Assessment Year</label>
            <input
              value={assessmentYear}
              onChange={(e) => setAssessmentYear(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg bg-white font-mono"
              placeholder="2024-25"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Regime</label>
            <select value={regime} onChange={(e) => setRegime(e.target.value as any)} className="px-3 py-2 border border-slate-300 rounded-lg bg-white">
              <option value="old">Old</option>
              <option value="new">New</option>
            </select>
          </div>
          <button
            onClick={compute}
            disabled={!ready || loading}
            className={`px-4 py-2 rounded-lg text-sm font-semibold ${
              !ready || loading ? 'bg-slate-200 text-slate-400' : 'bg-emerald-600 text-white hover:bg-emerald-700'
            }`}
          >
            Compute worksheet
          </button>
          <button
            onClick={() => void downloadHandoff().catch((e: any) => setMsg(String(e?.message || e)))}
            disabled={loading}
            className="px-4 py-2 rounded-lg text-sm font-semibold border border-slate-300 bg-white hover:bg-slate-50"
          >
            Export CA handoff
          </button>
        </div>

        <div className="mt-4">
          <div className="text-sm font-semibold text-slate-900 mb-2">Readiness</div>
          {issues.length === 0 ? (
            <div className="text-sm text-slate-500">No validation results yet.</div>
          ) : (
            <div className="space-y-2">
              {issues.map((i, idx) => (
                <div key={idx} className="text-sm flex items-start gap-2">
                  <span className={`mt-0.5 px-2 py-0.5 rounded text-xs font-bold ${
                    i.severity === 'error' ? 'bg-rose-100 text-rose-700' : i.severity === 'warning' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'
                  }`}>
                    {i.severity.toUpperCase()}
                  </span>
                  <div className="text-slate-700">
                    <span className="font-mono text-xs text-slate-500">{i.code}</span>
                    <div>{i.message}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {run?.lineItems && (
        <Card>
          <div className="text-sm font-semibold text-slate-900 mb-3">Worksheet</div>
          <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl overflow-hidden">
            {run.lineItems.map((li: any, idx: number) => (
              <div key={idx} className="p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-slate-900">{li.label}</div>
                  <div className="text-xs text-slate-500 font-mono">{li.code}</div>
                </div>
                <div className="text-sm font-bold text-slate-900">₹{Math.round(li.amount).toLocaleString('en-IN')}</div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

// --- Compliance Widget ---
export const Compliance: React.FC = () => {
  return (
    <div className="space-y-6">
      <SectionTitle title="Compliance Calendar" />
      <div className="overflow-hidden bg-white border border-slate-200 rounded-2xl">
        <table className="w-full text-sm text-left text-slate-600">
          <thead className="text-xs text-slate-700 uppercase bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-3">Due Date</th>
              <th className="px-6 py-3">Compliance Type</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            <tr className="bg-white border-b border-slate-100 hover:bg-slate-50">
              <td className="px-6 py-4 font-medium text-slate-900">Jul 31, 2024</td>
              <td className="px-6 py-4">ITR Filing (Individual)</td>
              <td className="px-6 py-4">
                <span className="px-2 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-700">Pending</span>
              </td>
              <td className="px-6 py-4">
                <button className="text-blue-600 hover:underline">Start Filing</button>
              </td>
            </tr>
            <tr className="bg-white border-b border-slate-100 hover:bg-slate-50">
              <td className="px-6 py-4 font-medium text-slate-900">Jun 15, 2024</td>
              <td className="px-6 py-4">Advance Tax (Q1)</td>
              <td className="px-6 py-4">
                <span className="px-2 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-700">Paid</span>
              </td>
              <td className="px-6 py-4">
                <button className="text-slate-400 cursor-not-allowed">View Receipt</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

// --- Reports Widget ---
export const Reports: React.FC = () => {
  const { activeBusinessId } = useBusinessContext();
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);

  const downloadJson = (filename: string, obj: any) => {
    const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadPnl = async () => {
    if (!activeBusinessId) return;
    setBusy(true);
    setMsg(null);
    try {
      const resp = await fetch('/api/accounting/reports/pnl', {
        credentials: 'include',
        headers: { 'X-Entity-Id': activeBusinessId },
      });
      const data = await resp.json().catch(() => ({} as any));
      if (!resp.ok) throw new Error(data?.error || `Failed (${resp.status})`);
      downloadJson(`pnl-${Date.now()}.json`, data);
    } catch (e: any) {
      setMsg(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  };

  const downloadAudit = async () => {
    if (!activeBusinessId) return;
    setBusy(true);
    setMsg(null);
    try {
      const resp = await fetch('/api/accounting/reports/audit-readiness', {
        credentials: 'include',
        headers: { 'X-Entity-Id': activeBusinessId },
      });
      const data = await resp.json().catch(() => ({} as any));
      if (!resp.ok) throw new Error(data?.error || `Failed (${resp.status})`);
      downloadJson(`audit-readiness-${Date.now()}.json`, data);
    } catch (e: any) {
      setMsg(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <SectionTitle title="Financial Reports" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
              <FileText size={20} />
            </div>
            <h3 className="font-bold">Profit & Loss</h3>
          </div>
          <p className="text-sm text-slate-500 mb-4">Based on committed transactions.</p>
          <button
            type="button"
            disabled={busy || !activeBusinessId}
            onClick={downloadPnl}
            className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 disabled:text-slate-400"
          >
            <Download size={16} /> Download
          </button>
        </Card>
        <Card>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
              <Scale size={20} />
            </div>
            <h3 className="font-bold">Audit Readiness</h3>
          </div>
          <p className="text-sm text-slate-500 mb-4">Deterministic readiness based on confirmed vs needs review.</p>
          <button
            type="button"
            disabled={busy || !activeBusinessId}
            onClick={downloadAudit}
            className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 disabled:text-slate-400"
          >
            <Download size={16} /> Download
          </button>
        </Card>
      </div>
      {msg && <div className="text-sm text-slate-700">{msg}</div>}
    </div>
  );
};

// --- Documents Widget ---
export const Documents: React.FC = () => (
  <AccountingDocuments />
);

const AccountingDocuments: React.FC = () => {
  const { activeBusinessId } = useBusinessContext();
  const [mode, setMode] = React.useState<'document' | 'csv'>('document');
  const [sourceType, setSourceType] = React.useState<'bank' | 'upi' | 'card' | 'cash'>('bank');
  const [file, setFile] = React.useState<File | null>(null);
  const [result, setResult] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [reviewLoading, setReviewLoading] = React.useState(false);
  const [reviewItems, setReviewItems] = React.useState<any[]>([]);
  const [categories, setCategories] = React.useState<Array<{ id: string; name: string }>>([]);
  const [activeStatus, setActiveStatus] = React.useState<'needs_review' | 'confirmed'>('needs_review');
  const [currentUploadId, setCurrentUploadId] = React.useState<string | null>(null);
  const [commitMsg, setCommitMsg] = React.useState<string | null>(null);

  const upload = async () => {
    if (!file) return;
    if (!activeBusinessId) {
      setResult('No active business selected.');
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append('file', file);

      const endpoint = mode === 'csv' ? '/api/accounting/uploads' : '/api/accounting/documents/upload';
      if (mode === 'csv') {
        fd.append('sourceType', sourceType);
        fd.append('format', 'csv');
      }

      const resp = await fetch(endpoint, {
        method: 'POST',
        credentials: 'include',
        headers: { 'X-Entity-Id': activeBusinessId },
        body: fd,
      });
      const data = await resp.json().catch(() => ({} as any));
      if (!resp.ok) throw new Error(data?.error || `Upload failed (${resp.status})`);
      const detected = data?.detectedDocumentType ? ` Detected: ${data.detectedDocumentType}.` : '';
      setResult(`Imported ${data.rawCount} transactions (uploadedFileId: ${data.uploadedFileId}).${detected}`);
      setCurrentUploadId(data.uploadedFileId);
      sessionStorage.setItem(`acct_last_uploadedFileId_${activeBusinessId}`, data.uploadedFileId);
      setActiveStatus('needs_review');
      void loadReview(data.uploadedFileId, 'needs_review');
    } catch (e: any) {
      setResult(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  };

  const loadReview = async (uploadedFileId?: string | null, status?: 'needs_review' | 'confirmed') => {
    setReviewLoading(true);
    try {
      if (!activeBusinessId) {
        setReviewItems([]);
        return;
      }
      const upId = uploadedFileId ?? currentUploadId;
      const st = status ?? activeStatus;
      const [catsResp, reviewResp] = await Promise.all([
        fetch('/api/accounting/categories', { credentials: 'include' }),
        fetch(
          `/api/accounting/review?status=${encodeURIComponent(st)}&take=50${upId ? `&uploadedFileId=${encodeURIComponent(upId)}` : ''}`,
          { credentials: 'include', headers: { 'X-Entity-Id': activeBusinessId } }
        ),
      ]);
      const cats = await catsResp.json().catch(() => ({} as any));
      const review = await reviewResp.json().catch(() => ({} as any));
      if (!catsResp.ok) throw new Error(cats?.error || 'Failed to load categories');
      if (!reviewResp.ok) throw new Error(review?.error || 'Failed to load review queue');

      setCategories((cats.categories || []).map((c: any) => ({ id: c.id, name: c.name })));
      setReviewItems(review.items || []);
    } finally {
      setReviewLoading(false);
    }
  };

  const setCategory = async (normalizedTransactionId: string, categoryId: string) => {
    if (!categoryId) return;
    // Optimistic UI update
    setReviewItems((prev) =>
      prev.map((it) =>
        it.normalizedTransactionId === normalizedTransactionId
          ? {
              ...it,
              method: 'manual',
              confidence: 1,
              status: 'confirmed',
              category: { id: categoryId, code: it.category?.code, name: categories.find((c) => c.id === categoryId)?.name || 'Selected' },
            }
          : it
      )
    );

    await fetch(`/api/accounting/transactions/${normalizedTransactionId}/override`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...(activeBusinessId ? { 'X-Entity-Id': activeBusinessId } : {}) },
      body: JSON.stringify({ categoryId }),
    });
    await loadReview();
  };

  const commitUpload = async () => {
    if (!currentUploadId) return;
    setCommitMsg(null);
    const resp = await fetch(`/api/accounting/uploads/${currentUploadId}/commit`, {
      method: 'POST',
      credentials: 'include',
      headers: { ...(activeBusinessId ? { 'X-Entity-Id': activeBusinessId } : {}) },
    });
    const data = await resp.json().catch(() => ({} as any));
    if (!resp.ok) {
      setCommitMsg(data?.error || `Commit failed (${resp.status})`);
      return;
    }
    setCommitMsg('Committed. These transactions are now finalized for accounting.');
  };

  React.useEffect(() => {
    if (!activeBusinessId) return;
    const last = sessionStorage.getItem(`acct_last_uploadedFileId_${activeBusinessId}`);
    if (last) {
      setCurrentUploadId(last);
      void loadReview(last, 'needs_review');
      return;
    }
    setCurrentUploadId(null);
    setReviewItems([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBusinessId]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <SectionTitle title="Accounting Imports" />
      </div>

      <Card>
        <div className="flex items-start justify-between gap-3 mb-2">
          <div>
            <h3 className="font-bold text-slate-900">Upload</h3>
            <p className="text-sm text-slate-500">
              {mode === 'document'
                ? 'Upload a PDF/JPG/PNG to import transactions.'
                : 'Upload a bank/UPI/card CSV export.'}
            </p>
          </div>
          <div className="flex gap-1 p-1 bg-slate-100 rounded-xl">
            <button
              onClick={() => {
                setMode('document');
                setFile(null);
              }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${mode === 'document' ? 'bg-white shadow-sm' : 'text-slate-600'}`}
            >
              Document
            </button>
            <button
              onClick={() => {
                setMode('csv');
                setFile(null);
              }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${mode === 'csv' ? 'bg-white shadow-sm' : 'text-slate-600'}`}
            >
              CSV
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-3 items-end">
          {mode === 'csv' ? (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Source type</label>
                <select
                  value={sourceType}
                  onChange={(e) => setSourceType(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                >
                  <option value="bank">Bank statement</option>
                  <option value="upi">UPI export</option>
                  <option value="card">Card statement</option>
                  <option value="cash">Cash (file)</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">CSV file (max 1MB)</label>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={(e) => {
                    const f = e.target.files?.[0] || null;
                    if (f && f.size > 1024 * 1024) {
                      setResult('File too large. Max 1MB.');
                      setFile(null);
                      return;
                    }
                    setFile(f);
                  }}
                  className="block w-full text-sm text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-slate-900 file:text-white hover:file:bg-slate-800"
                />
                <div className="mt-1 text-xs text-slate-500">Header: <span className="font-mono">date,amount,direction,description</span>.</div>
              </div>
            </>
          ) : (
            <div className="md:col-span-3">
              <label className="block text-sm font-medium text-slate-700 mb-1">Document (PDF/JPG/PNG, max 1MB)</label>
              <input
                type="file"
                accept="application/pdf,image/png,image/jpeg,image/jpg,image/webp"
                onChange={(e) => {
                  const f = e.target.files?.[0] || null;
                  if (f && f.size > 1024 * 1024) {
                    setResult('File too large. Max 1MB.');
                    setFile(null);
                    return;
                  }
                  setFile(f);
                }}
                className="block w-full text-sm text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-slate-900 file:text-white hover:file:bg-slate-800"
              />
              <div className="mt-1 text-xs text-slate-500">Imported transactions will appear below for review.</div>
            </div>
          )}
        </div>

        <div className="mt-4 flex gap-3 items-center">
          <button
            type="button"
            onClick={upload}
            disabled={!file || loading}
            className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${
              !file || loading ? 'bg-slate-200 text-slate-400' : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            <UploadCloud size={16} /> {loading ? 'Importing…' : mode === 'csv' ? 'Import CSV' : 'Import Document'}
          </button>
          {result && <div className="text-sm text-slate-700">{result}</div>}
        </div>
      </Card>

      <Card>
        <h3 className="font-bold text-slate-900 mb-2">Manual override workflow</h3>
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-slate-500">
            Transactions with low confidence or no match appear here as <span className="font-semibold">needs_review</span>. Override sets a
            user rule + audit log.
          </p>
          <button
            type="button"
            onClick={() => loadReview()}
            className="px-3 py-2 rounded-lg text-sm font-medium border border-slate-200 hover:bg-slate-50"
          >
            Refresh
          </button>
        </div>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setActiveStatus('needs_review');
                void loadReview(currentUploadId, 'needs_review');
              }}
              className={`px-3 py-2 rounded-lg text-sm font-semibold border ${
                activeStatus === 'needs_review' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white border-slate-200 text-slate-700'
              }`}
            >
              Needs review
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveStatus('confirmed');
                void loadReview(currentUploadId, 'confirmed');
              }}
              className={`px-3 py-2 rounded-lg text-sm font-semibold border ${
                activeStatus === 'confirmed' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white border-slate-200 text-slate-700'
              }`}
            >
              Confirmed
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={commitUpload}
              disabled={!currentUploadId}
              className={`px-4 py-2 rounded-lg text-sm font-semibold ${
                !currentUploadId ? 'bg-slate-200 text-slate-400' : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              Commit
            </button>
          </div>
        </div>

        {commitMsg && <div className="mb-4 text-sm text-slate-700">{commitMsg}</div>}

        {reviewLoading ? (
          <div className="text-sm text-slate-500">Loading review queue…</div>
        ) : reviewItems.length === 0 ? (
          <div className="text-sm text-slate-500">No items in this list yet.</div>
        ) : (
          <div className="space-y-3">
            {reviewItems.map((it) => (
              <div key={it.normalizedTransactionId} className="p-4 border border-slate-200 rounded-xl bg-white">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  <div className="text-sm">
                    <div className="font-medium text-slate-900">{it.transaction.descriptionClean}</div>
                    <div className="text-slate-500">
                      {new Date(it.transaction.date).toLocaleDateString()} • {it.transaction.direction} • ₹{it.transaction.amount}
                    </div>
                  </div>
                  <div className="text-sm text-slate-600">
                    <span className="font-medium">Method:</span> {it.method} • <span className="font-medium">Confidence:</span>{' '}
                    {Math.round((it.confidence || 0) * 100)}%
                  </div>
                </div>

                <div className="mt-3">
                  <div className="text-xs font-semibold text-slate-600 mb-2">Select category (auto-saves)</div>
                  <div className="flex flex-wrap gap-2">
                    {categories.map((c) => {
                      const selected = (it.category?.id || '') === c.id;
                      return (
                        <button
                          type="button"
                          key={c.id}
                          onClick={() => setCategory(it.normalizedTransactionId, c.id)}
                          className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                            selected
                              ? 'bg-slate-900 text-white border-slate-900'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                          }`}
                          title={c.name}
                        >
                          {c.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

// Helper for icon
const ShieldCheckIcon = ({ size }: { size: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

const DashboardWidgets = {
  Overview,
  Taxes,
  Compliance,
  Reports,
  Documents,
};

export default DashboardWidgets;


