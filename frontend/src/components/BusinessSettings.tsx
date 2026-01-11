import React from 'react';
import { useBusinessContext } from '../contexts/business-context';

const Card: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="bg-white rounded-2xl border border-slate-200 p-5">{children}</div>
);

const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ className = '', ...props }) => (
  <button
    {...props}
    className={`px-4 py-2 rounded-lg text-sm font-medium ${
      props.disabled ? 'bg-slate-200 text-slate-400' : 'bg-blue-600 text-white hover:bg-blue-700'
    } ${className}`}
  />
);

export default function BusinessSettings() {
  const { businesses, activeBusiness, activeBusinessId, setActiveBusinessId, refreshBusinesses, loading } =
    useBusinessContext();

  const [newName, setNewName] = React.useState('');
  const [gstin, setGstin] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);

  const createBusiness = async () => {
    const name = newName.trim();
    if (!name) return;
    setBusy(true);
    setMsg(null);
    try {
      const resp = await fetch('/api/entities', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const data = await resp.json().catch(() => ({} as any));
      if (!resp.ok) throw new Error(data?.error || `Create failed (${resp.status})`);
      setNewName('');
      await refreshBusinesses();
      if (data?.entity?.id) setActiveBusinessId(data.entity.id);
      setMsg('Business created.');
    } catch (e: any) {
      setMsg(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  };

  const addGstin = async () => {
    if (!activeBusinessId) return;
    const value = gstin.trim().toUpperCase();
    if (!value) return;
    setBusy(true);
    setMsg(null);
    try {
      const resp = await fetch(`/api/entities/${encodeURIComponent(activeBusinessId)}/gstins`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gstin: value }),
      });
      const data = await resp.json().catch(() => ({} as any));
      if (!resp.ok) throw new Error(data?.error || `Add GSTIN failed (${resp.status})`);
      setGstin('');
      await refreshBusinesses();
      setMsg('GSTIN added.');
    } catch (e: any) {
      setMsg(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  };

  const setPrimary = async (gstinId: string) => {
    if (!activeBusinessId) return;
    setBusy(true);
    setMsg(null);
    try {
      const resp = await fetch(`/api/entities/${encodeURIComponent(activeBusinessId)}/gstins/${encodeURIComponent(gstinId)}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPrimary: true }),
      });
      const data = await resp.json().catch(() => ({} as any));
      if (!resp.ok) throw new Error(data?.error || `Update GSTIN failed (${resp.status})`);
      await refreshBusinesses();
      setMsg('Primary GSTIN updated.');
    } catch (e: any) {
      setMsg(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  };

  const removeGstin = async (gstinId: string) => {
    if (!activeBusinessId) return;
    setBusy(true);
    setMsg(null);
    try {
      const resp = await fetch(`/api/entities/${encodeURIComponent(activeBusinessId)}/gstins/${encodeURIComponent(gstinId)}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await resp.json().catch(() => ({} as any));
      if (!resp.ok) throw new Error(data?.error || `Delete GSTIN failed (${resp.status})`);
      await refreshBusinesses();
      setMsg('GSTIN removed.');
    } catch (e: any) {
      setMsg(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Business & GSTIN</h2>
        <p className="text-sm text-slate-500">Businesses fully isolate imports, rules, transactions, and audit logs.</p>
      </div>

      <Card>
        <div className="flex flex-col md:flex-row md:items-end gap-3">
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-700 mb-1">Create new business</label>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Personal, My Shop, Consulting"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
            />
          </div>
          <Button disabled={busy || !newName.trim()} onClick={createBusiness}>
            {busy ? 'Working…' : 'Create business'}
          </Button>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-slate-700 mb-1">Active business</label>
          <select
            value={activeBusinessId || ''}
            onChange={(e) => setActiveBusinessId(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
            disabled={loading || businesses.length === 0}
          >
            {businesses.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} {b.isDefault ? '(default)' : ''}
              </option>
            ))}
          </select>
        </div>
      </Card>

      <Card>
        <div className="mb-3">
          <h3 className="font-bold text-slate-900">GSTINs</h3>
          <p className="text-sm text-slate-500">Add one or more GSTINs per business (mark one as primary).</p>
        </div>

        {!activeBusiness ? (
          <div className="text-sm text-slate-500">No active business selected.</div>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-col md:flex-row md:items-end gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-700 mb-1">Add GSTIN</label>
                <input
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value)}
                  placeholder="15-char GSTIN"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-mono"
                />
              </div>
              <Button disabled={busy || !gstin.trim()} onClick={addGstin}>
                {busy ? 'Working…' : 'Add GSTIN'}
              </Button>
            </div>

            <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl overflow-hidden">
              {(activeBusiness.gstins || []).length === 0 ? (
                <div className="p-4 text-sm text-slate-500">No GSTINs yet.</div>
              ) : (
                activeBusiness.gstins.map((g) => (
                  <div key={g.id} className="p-4 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-mono text-slate-900">{g.gstin}</div>
                      <div className="text-xs text-slate-500">{g.isPrimary ? 'Primary' : 'Secondary'}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${
                          g.isPrimary
                            ? 'border-blue-300 bg-blue-50 text-blue-700'
                            : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                        disabled={busy || g.isPrimary}
                        onClick={() => setPrimary(g.id)}
                      >
                        Set primary
                      </button>
                      <button
                        className="px-3 py-1.5 rounded-lg text-xs font-medium border border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100"
                        disabled={busy}
                        onClick={() => removeGstin(g.id)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {msg && <div className="mt-3 text-sm text-slate-600">{msg}</div>}
      </Card>
    </div>
  );
}


