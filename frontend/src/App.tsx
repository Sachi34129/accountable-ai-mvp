import React, { useEffect, useState } from 'react';
import { ViewState, UserRole, UserProfile } from './types';
import LandingPage from './components/LandingPage';
import AuthFlow from './components/AuthFlow';
import OnboardingFlow from './components/OnboardingFlow';
import DashboardLayout from './components/DashboardLayout';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>(ViewState.LANDING);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    // Cookie-based auth boot: ask backend who we are.
    const boot = async () => {
      try {
        const resp = await fetch('/api/auth/me', { credentials: 'include' });
        const data = await resp.json().catch(() => ({} as any));
        if (!resp.ok) throw new Error('unauthorized');

        const u = data.user as any;
        setUserProfile({
          name: u.name || '',
          email: u.email,
          role: (u.role as UserRole) || UserRole.INDIVIDUAL,
          pan: u.pan || undefined,
        });
        setCurrentView(u.onboardingCompleted ? ViewState.DASHBOARD : ViewState.ONBOARDING);
      } catch {
        setCurrentView(ViewState.LANDING);
      }
    };
    void boot();
  }, []);

  const handleOnboardingComplete = (data: any) => {
    setUserProfile((prev) => ({ ...prev!, ...data }));
    setCurrentView(ViewState.DASHBOARD);
  };

  const renderView = () => {
    switch (currentView) {
      case ViewState.LANDING:
        return <LandingPage onGetStarted={() => setCurrentView(ViewState.AUTH)} />;
      case ViewState.AUTH:
        return (
          <AuthFlow
            onBack={() => setCurrentView(ViewState.LANDING)}
            onAuthed={async () => {
              // Re-run boot after login/signup to route correctly.
              try {
                const resp = await fetch('/api/auth/me', { credentials: 'include' });
                const data = await resp.json().catch(() => ({} as any));
                if (!resp.ok) throw new Error();
                const u = data.user as any;
                setUserProfile({
                  name: u.name || '',
                  email: u.email,
                  role: (u.role as UserRole) || UserRole.INDIVIDUAL,
                  pan: u.pan || undefined,
                });
                setCurrentView(u.onboardingCompleted ? ViewState.DASHBOARD : ViewState.ONBOARDING);
              } catch {
                setCurrentView(ViewState.LANDING);
              }
            }}
          />
        );
      case ViewState.ONBOARDING:
        return (
          <OnboardingFlow
            userRole={userProfile?.role || UserRole.INDIVIDUAL}
            onComplete={handleOnboardingComplete}
            initialName={userProfile?.name}
          />
        );
      case ViewState.DASHBOARD:
        return (
          <DashboardLayout
            userProfile={userProfile!}
            onProfileUpdated={(next) => setUserProfile((prev) => ({ ...(prev as any), ...(next as any) }))}
            onLogout={() => {
              void fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => {});
              setUserProfile(null);
              setCurrentView(ViewState.LANDING);
            }}
          />
        );
      default:
        return <LandingPage onGetStarted={() => setCurrentView(ViewState.AUTH)} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-blue-100 selection:text-blue-900">
      {renderView()}
    </div>
  );
};

export default App;

