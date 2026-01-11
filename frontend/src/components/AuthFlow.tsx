import React, { useState } from 'react';
import { ArrowLeft, Mail, Lock } from 'lucide-react';

interface AuthFlowProps {
  onBack: () => void;
  onAuthed: () => void;
}

const AuthFlow: React.FC<AuthFlowProps> = ({ onBack, onAuthed }) => {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = () => {
    // Goes through Vite proxy (/api -> backend) in dev
    window.location.href = '/api/auth/google';
  };

  const submitEmailAuth = async () => {
    setError(null);
    setLoading(true);
    try {
      const resp = await fetch(`/api/auth/${mode === 'signup' ? 'signup' : 'login'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });
      const data = await resp.json().catch(() => ({} as any));
      if (!resp.ok) throw new Error(data?.error || `Auth failed (${resp.status})`);
      onAuthed();
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4">
      <div className="bg-white w-full max-w-md p-8 rounded-2xl shadow-xl border border-slate-100">
        <button onClick={onBack} className="text-slate-400 hover:text-slate-600 mb-6 flex items-center gap-1 text-sm">
          <ArrowLeft size={16} /> Back
        </button>

        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-900">Sign in to Accountable AI</h2>
          <p className="text-slate-500 mt-1">Continue with Google or use email/password.</p>
        </div>

        <button
          onClick={handleGoogleLogin}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
        >
          Continue with Google
        </button>

        <div className="my-6 flex items-center gap-3">
          <div className="h-px bg-slate-200 flex-1" />
          <div className="text-xs text-slate-400">or</div>
          <div className="h-px bg-slate-200 flex-1" />
        </div>

        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setMode('signin')}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold border ${
              mode === 'signin' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-200'
            }`}
          >
            Sign in
          </button>
          <button
            onClick={() => setMode('signup')}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold border ${
              mode === 'signup' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-200'
            }`}
          >
            Sign up
          </button>
        </div>

        {error && <div className="mb-4 text-sm text-rose-600 bg-rose-50 border border-rose-100 p-3 rounded-lg">{error}</div>}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 text-slate-400" size={18} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                placeholder="you@example.com"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 text-slate-400" size={18} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                placeholder="••••••••"
              />
            </div>
            <div className="text-[11px] text-slate-400 mt-1">Minimum 8 characters for sign up.</div>
          </div>

          <button
            onClick={submitEmailAuth}
            disabled={loading || !email || !password}
            className={`w-full py-2.5 rounded-lg font-semibold transition-all ${
              loading || !email || !password
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : 'bg-slate-900 text-white hover:bg-slate-800'
            }`}
          >
            {mode === 'signup' ? 'Create account' : 'Sign in'}
          </button>
        </div>

        <div className="mt-6 text-center text-xs text-slate-500">
          By continuing, you agree to our Terms and Privacy Policy.
        </div>
      </div>
    </div>
  );
};

export default AuthFlow;


