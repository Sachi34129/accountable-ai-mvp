import React, { useState } from 'react';
import { UserRole } from '../types';
import { Check, Building2, Briefcase, FileText, Zap, Settings, ShieldAlert } from 'lucide-react';

interface OnboardingProps {
  userRole: UserRole;
  onComplete: (data: any) => void;
  initialName?: string;
}

const OnboardingFlow: React.FC<OnboardingProps> = ({ userRole, onComplete, initialName }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: initialName || '',
    pan: '',
    sources: [] as string[],
    riskAppetite: 50,
    connectBank: false,
    connectGst: false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalSteps = 4;

  const nextStep = () => {
    if (step < totalSteps) setStep(step + 1);
    else onComplete(formData);
  };

  const finishSetup = async () => {
    setSaving(true);
    setError(null);
    try {
      const resp = await fetch('/api/users/me', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: formData.name,
          pan: formData.pan,
          role: userRole,
        }),
      });
      const data = await resp.json().catch(() => ({} as any));
      if (!resp.ok) throw new Error(data?.error || `Failed to save (${resp.status})`);
      onComplete(formData);
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally {
      setSaving(false);
    }
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-10">
      {[1, 2, 3, 4].map((s) => (
        <div key={s} className="flex items-center">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
              s === step
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                : s < step
                  ? 'bg-emerald-500 text-white'
                  : 'bg-slate-200 text-slate-500'
            }`}
          >
            {s < step ? <Check size={16} /> : s}
          </div>
          {s < 4 && <div className={`w-12 h-1 ${s < step ? 'bg-emerald-500' : 'bg-slate-200'} mx-2 rounded-full`}></div>}
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 flex flex-col items-center">
      <div className="w-full max-w-2xl">
        <h1 className="text-3xl font-bold text-center text-slate-900 mb-2">Setting up your AI CA</h1>
        <p className="text-center text-slate-500 mb-8">Let's personalize your financial experience.</p>

        {renderStepIndicator()}

        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
          {error && (
            <div className="mb-6 text-sm text-rose-700 bg-rose-50 border border-rose-100 p-3 rounded-lg">
              {error}
            </div>
          )}
          {/* Step 1: Profile */}
          {step === 1 && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <FileText className="text-blue-500" /> Profile Setup
              </h2>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  placeholder="John Doe"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">PAN Number</label>
                <input
                  type="text"
                  value={formData.pan}
                  onChange={(e) => setFormData({ ...formData, pan: e.target.value.toUpperCase() })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg uppercase tracking-widest placeholder:tracking-normal"
                  placeholder="ABCDE1234F"
                  maxLength={10}
                  required
                />
                <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                  <ShieldAlert size={12} /> Your PAN is encrypted and stored securely.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Income Sources</label>
                <div className="grid grid-cols-2 gap-3">
                  {['Salary', 'Business/Profession', 'Capital Gains', 'House Property', 'Other Sources'].map((src) => (
                    <label key={src} className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-slate-50">
                      <input
                        type="checkbox"
                        className="rounded text-blue-600 focus:ring-blue-500"
                        onChange={(e) => {
                          const s = new Set(formData.sources);
                          e.target.checked ? s.add(src) : s.delete(src);
                          setFormData({ ...formData, sources: Array.from(s) });
                        }}
                      />
                      <span className="text-sm text-slate-700">{src}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Role Specific */}
          {step === 2 && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Briefcase className="text-blue-500" /> {userRole === UserRole.BUSINESS ? 'Business Details' : 'Employment Details'}
              </h2>
              {userRole === UserRole.BUSINESS ? (
                <div className="grid gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">GSTIN (Optional)</label>
                    <input type="text" className="w-full px-4 py-2 border border-slate-300 rounded-lg uppercase" placeholder="22AAAAA0000A1Z5" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Annual Turnover Range</label>
                    <select className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-white">
                      <option>₹0 - ₹20 Lakhs</option>
                      <option>₹20 Lakhs - ₹1 Crore</option>
                      <option>₹1 Crore - ₹5 Crores</option>
                      <option>₹5 Crores +</option>
                    </select>
                  </div>
                </div>
              ) : (
                <div className="grid gap-4">
                  <label className="flex items-center justify-between p-4 border rounded-xl cursor-pointer hover:border-blue-500 transition-all">
                    <div>
                      <span className="block font-medium text-slate-900">Salaried Employee</span>
                      <span className="text-sm text-slate-500">I receive Form 16 from my employer</span>
                    </div>
                    <input type="radio" name="empType" className="text-blue-600 focus:ring-blue-500" />
                  </label>
                  <label className="flex items-center justify-between p-4 border rounded-xl cursor-pointer hover:border-blue-500 transition-all">
                    <div>
                      <span className="block font-medium text-slate-900">Freelancer / Consultant</span>
                      <span className="text-sm text-slate-500">I raise invoices for my services</span>
                    </div>
                    <input type="radio" name="empType" className="text-blue-600 focus:ring-blue-500" />
                  </label>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Data Connect */}
          {step === 3 && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Zap className="text-blue-500" /> Connect Data Sources
              </h2>
              <p className="text-sm text-slate-600">Securely connect your financial accounts for automated insights.</p>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 border rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-700 font-bold">
                      <Building2 size={20} />
                    </div>
                    <div>
                      <div className="font-medium text-slate-900">Bank Accounts</div>
                      <div className="text-xs text-slate-500">via Account Aggregator</div>
                    </div>
                  </div>
                  <button
                    onClick={() => setFormData((p) => ({ ...p, connectBank: !p.connectBank }))}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      formData.connectBank ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {formData.connectBank ? 'Connected' : 'Connect'}
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center text-orange-700 font-bold">
                      IT
                    </div>
                    <div>
                      <div className="font-medium text-slate-900">Income Tax Portal</div>
                      <div className="text-xs text-slate-500">Read-only access for Form 26AS</div>
                    </div>
                  </div>
                  <button className="px-4 py-1.5 rounded-full text-sm font-medium bg-slate-100 text-slate-600 hover:bg-slate-200">Connect</button>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: AI Calibration */}
          {step === 4 && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Settings className="text-blue-500" /> AI Calibration
              </h2>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-4">
                  Risk Appetite: {formData.riskAppetite < 30 ? 'Conservative' : formData.riskAppetite > 70 ? 'Aggressive' : 'Balanced'}
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={formData.riskAppetite}
                  onChange={(e) => setFormData({ ...formData, riskAppetite: parseInt(e.target.value) })}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <div className="flex justify-between text-xs text-slate-400 mt-2">
                  <span>Conservative (FDs/Gold)</span>
                  <span>Aggressive (Stocks/Crypto)</span>
                </div>
              </div>

              <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                <h4 className="font-medium text-blue-900 text-sm mb-2">What this controls:</h4>
                <ul className="text-xs text-blue-800 space-y-1 list-disc pl-4">
                  <li>Tax saving recommendations</li>
                  <li>Investment portfolio suggestions</li>
                  <li>Aggressiveness of tax deductions claimed</li>
                </ul>
              </div>
            </div>
          )}

          <div className="mt-8 pt-6 border-t border-slate-100 flex justify-between items-center">
            {step >= 2 ? (
              <button
                onClick={finishSetup}
                disabled={saving}
                className="px-4 py-2.5 rounded-lg font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-slate-200 transition-all"
              >
                Skip for now
              </button>
            ) : (
              <div />
            )}
            <button
              onClick={step === totalSteps ? finishSetup : nextStep}
              disabled={saving}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-md transition-all"
            >
              {step === totalSteps ? (saving ? 'Saving…' : 'Finish Setup') : 'Continue'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingFlow;


