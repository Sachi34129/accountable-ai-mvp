import React from 'react';
import { UserProfile } from '../types';

const Card: React.FC<{ title: string; description?: string; children: React.ReactNode }> = ({ title, description, children }) => (
  <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
    <div>
      <div className="font-bold text-slate-900">{title}</div>
      {description && <div className="text-sm text-slate-500">{description}</div>}
    </div>
    {children}
  </div>
);

const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'danger' | 'ghost' }> = ({
  className = '',
  variant = 'primary',
  ...props
}) => {
  const base = 'px-4 py-2 rounded-lg text-sm font-medium transition-colors';
  const styles =
    variant === 'danger'
      ? props.disabled
        ? 'bg-rose-200 text-rose-400'
        : 'bg-rose-600 text-white hover:bg-rose-700'
      : variant === 'ghost'
        ? props.disabled
          ? 'bg-slate-100 text-slate-400'
          : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
        : props.disabled
          ? 'bg-slate-200 text-slate-400'
          : 'bg-blue-600 text-white hover:bg-blue-700';
  return <button {...props} className={`${base} ${styles} ${className}`} />;
};

type Props = {
  userProfile: UserProfile;
  onProfileUpdated?: (next: Partial<UserProfile>) => void;
  onLogout: () => void;
};

export default function AccountSettings({ userProfile, onProfileUpdated, onLogout }: Props) {
  const [name, setName] = React.useState(userProfile.name || '');
  const [pan, setPan] = React.useState(userProfile.pan || '');
  const [phone, setPhone] = React.useState('');

  const [email, setEmail] = React.useState(userProfile.email || '');
  const [newEmail, setNewEmail] = React.useState('');
  const [currentPassword, setCurrentPassword] = React.useState('');

  const [serverInfo, setServerInfo] = React.useState<any>(null);
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);

  const loadMe = React.useCallback(async () => {
    const resp = await fetch('/api/users/me', { credentials: 'include' });
    const data = await resp.json().catch(() => ({} as any));
    if (!resp.ok) throw new Error(data?.error || 'Failed to load user');
    setServerInfo(data.user);
    setEmail(data.user.email);
    setPhone(data.user.phone || '');
  }, []);

  React.useEffect(() => {
    void loadMe().catch(() => {});
  }, [loadMe]);

  const saveProfile = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const resp = await fetch('/api/users/me/profile', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), pan: pan.trim(), phone: phone.trim() || null }),
      });
      const data = await resp.json().catch(() => ({} as any));
      if (!resp.ok) throw new Error(data?.error || `Update failed (${resp.status})`);
      setMsg('Profile updated.');
      onProfileUpdated?.({ name: data.user.name || '', pan: data.user.pan || undefined });
      await loadMe();
    } catch (e: any) {
      setMsg(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  };

  const changeEmail = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const resp = await fetch('/api/users/me/email', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newEmail: newEmail.trim(), currentPassword: currentPassword || undefined }),
      });
      const data = await resp.json().catch(() => ({} as any));
      if (!resp.ok) throw new Error(data?.error || `Change email failed (${resp.status})`);
      setMsg('Email updated.');
      setNewEmail('');
      setCurrentPassword('');
      onProfileUpdated?.({ email: data.user.email });
      await loadMe();
    } catch (e: any) {
      setMsg(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  };

  const deleteAccount = async () => {
    const ok = window.confirm('Delete account permanently? This will delete ALL your data.');
    if (!ok) return;
    setBusy(true);
    setMsg(null);
    try {
      const resp = await fetch('/api/users/me', { method: 'DELETE', credentials: 'include' });
      const data = await resp.json().catch(() => ({} as any));
      if (!resp.ok) throw new Error(data?.error || `Delete failed (${resp.status})`);
      onLogout();
    } catch (e: any) {
      setMsg(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  };

  const canChangeEmail = serverInfo ? !serverInfo.isGoogleUser && serverInfo.hasPassword : false;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Settings</h2>
        <p className="text-sm text-slate-500">Manage your profile and account security.</p>
      </div>

      <Card title="Profile" description="Update your name, PAN, and phone number.">
        <div className="grid md:grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Full name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">PAN</label>
            <input
              value={pan}
              onChange={(e) => setPan(e.target.value.toUpperCase())}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-mono"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91XXXXXXXXXX"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-mono"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <Button disabled={busy || !name.trim() || !pan.trim()} onClick={saveProfile}>
            {busy ? 'Working…' : 'Save profile'}
          </Button>
        </div>
      </Card>

      <Card title="Email" description="Change your login email (only for email/password accounts).">
        <div className="grid md:grid-cols-3 gap-3 items-end">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Current email</label>
            <input value={email} disabled className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">New email</label>
            <input
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
              disabled={!canChangeEmail}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Current password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
              disabled={!canChangeEmail}
            />
          </div>
        </div>
        {!canChangeEmail && (
          <div className="text-sm text-slate-500">Email change is disabled for Google-only accounts.</div>
        )}
        <div className="flex gap-2">
          <Button disabled={busy || !canChangeEmail || !newEmail.trim() || !currentPassword} onClick={changeEmail}>
            {busy ? 'Working…' : 'Change email'}
          </Button>
        </div>
      </Card>

      <Card title="Danger zone" description="Delete your account and all data permanently.">
        <Button variant="danger" disabled={busy} onClick={deleteAccount}>
          {busy ? 'Working…' : 'Delete account'}
        </Button>
      </Card>

      {msg && <div className="text-sm text-slate-600">{msg}</div>}
    </div>
  );
}


