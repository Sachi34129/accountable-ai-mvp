import React, { useState } from 'react';
import { UserProfile, DashboardTab } from '../types';
import DashboardWidgets from './DashboardWidgets';
import AIChat from './AIChat';
import { LayoutDashboard, MessageSquare, FileText, Scale, PieChart, Settings, LogOut, Menu, X, Bell, Search, FolderOpen, Building2 } from 'lucide-react';
import { BusinessProvider, useBusinessContext } from '../contexts/business-context';
import BusinessSettings from './BusinessSettings';
import AccountSettings from './AccountSettings';

interface LayoutProps {
  userProfile: UserProfile;
  onLogout: () => void;
  onProfileUpdated?: (next: Partial<UserProfile>) => void;
}

const DashboardLayout: React.FC<LayoutProps> = ({ userProfile, onLogout, onProfileUpdated }) => {
  return (
    <BusinessProvider>
      <LayoutInner userProfile={userProfile} onLogout={onLogout} onProfileUpdated={onProfileUpdated} />
    </BusinessProvider>
  );
};

const LayoutInner: React.FC<LayoutProps> = ({ userProfile, onLogout, onProfileUpdated }) => {
  const [activeTab, setActiveTab] = useState<DashboardTab>(DashboardTab.OVERVIEW);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { businesses, activeBusinessId, setActiveBusinessId, loading: businessesLoading } = useBusinessContext();

  const NavItem = ({ tab, icon: Icon, label }: { tab: DashboardTab; icon: any; label: string }) => (
    <button
      onClick={() => {
        setActiveTab(tab);
        setMobileMenuOpen(false);
      }}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${
        activeTab === tab ? 'bg-blue-50 text-blue-700 shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
      }`}
    >
      <Icon size={20} />
      <span>{label}</span>
    </button>
  );

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 h-screen sticky top-0">
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">A</div>
            <span className="text-xl font-bold text-slate-900">Accountable AI</span>
          </div>
        </div>

        <div className="flex-1 p-4 space-y-2 overflow-y-auto">
          <NavItem tab={DashboardTab.OVERVIEW} icon={LayoutDashboard} label="Overview" />
          <NavItem tab={DashboardTab.AI_WORKSPACE} icon={MessageSquare} label="AI CA Workspace" />
          <NavItem tab={DashboardTab.TAXES} icon={FileText} label="Taxes" />
          <NavItem tab={DashboardTab.COMPLIANCE} icon={Scale} label="Compliance" />
          <NavItem tab={DashboardTab.REPORTS} icon={PieChart} label="Reports" />
          <NavItem tab={DashboardTab.DOCUMENTS} icon={FolderOpen} label="Documents" />
          <NavItem tab={DashboardTab.BUSINESS} icon={Building2} label="Business & GSTIN" />
        </div>

        <div className="p-4 border-t border-slate-100 space-y-2">
          <NavItem tab={DashboardTab.SETTINGS} icon={Settings} label="Settings" />
          <button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-3 text-rose-600 hover:bg-rose-50 rounded-xl transition-all font-medium">
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
          <div className="flex items-center justify-between px-4 py-3 md:px-8 md:py-4">
            <div className="flex items-center gap-3 md:hidden">
              <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="text-slate-500">
                {mobileMenuOpen ? <X /> : <Menu />}
              </button>
              <span className="font-bold text-lg">Accountable AI</span>
            </div>

            <div className="hidden md:flex flex-1 max-w-md mx-4 relative">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Search invoices, notices, or ask a question..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>

            <div className="flex items-center gap-4">
              <div className="hidden md:flex items-center gap-2">
                <span className="text-xs font-medium text-slate-500">Business</span>
                <select
                  value={activeBusinessId || ''}
                  onChange={(e) => setActiveBusinessId(e.target.value)}
                  disabled={businessesLoading || businesses.length === 0}
                  className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                >
                  {businesses.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} {b.isDefault ? '(default)' : ''}
                    </option>
                  ))}
                </select>
              </div>
              <button className="relative p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors">
                <Bell size={20} />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full border border-white"></span>
              </button>
              <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
                <div className="text-right hidden sm:block">
                  <div className="text-sm font-medium text-slate-900">{userProfile.name}</div>
                  <div className="text-xs text-slate-500 capitalize">{userProfile.role.toLowerCase()} Account</div>
                </div>
                <div className="w-9 h-9 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold border border-blue-200">
                  {userProfile.name.charAt(0)}
                </div>
              </div>
            </div>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden border-t border-slate-200 bg-white absolute w-full left-0 top-full shadow-lg z-30 p-4 space-y-2">
              <NavItem tab={DashboardTab.OVERVIEW} icon={LayoutDashboard} label="Overview" />
              <NavItem tab={DashboardTab.AI_WORKSPACE} icon={MessageSquare} label="AI CA Workspace" />
              <NavItem tab={DashboardTab.TAXES} icon={FileText} label="Taxes" />
              <NavItem tab={DashboardTab.COMPLIANCE} icon={Scale} label="Compliance" />
              <button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-3 text-rose-600 font-medium">
                <LogOut size={20} /> Logout
              </button>
            </div>
          )}
        </header>

        {/* View Content */}
        <main className="flex-1 overflow-auto bg-slate-50/50 p-4 md:p-8">
          <div className="max-w-7xl mx-auto">
            {activeTab === DashboardTab.OVERVIEW && <DashboardWidgets.Overview userProfile={userProfile} />}
            {activeTab === DashboardTab.AI_WORKSPACE && <AIChat userProfile={userProfile} />}
            {activeTab === DashboardTab.TAXES && <DashboardWidgets.Taxes />}
            {activeTab === DashboardTab.COMPLIANCE && <DashboardWidgets.Compliance />}
            {activeTab === DashboardTab.REPORTS && <DashboardWidgets.Reports />}
            {activeTab === DashboardTab.DOCUMENTS && <DashboardWidgets.Documents />}
            {activeTab === DashboardTab.BUSINESS && <BusinessSettings />}
            {activeTab === DashboardTab.SETTINGS && (
              <AccountSettings userProfile={userProfile} onProfileUpdated={onProfileUpdated} onLogout={onLogout} />
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;


