import { useState, useEffect } from 'react';
import { Home, Gem, FileText, DollarSign, User, ChevronDown, MapPin, Clock, Box, Users, Settings } from 'lucide-react';
import { Dashboard } from './pages/Dashboard';
import { ProductionPage } from './pages/Production';
import { WorkersPage } from './pages/Workers';
import { InventoryPage } from './pages/Inventory';
import { PurchasesPage } from './pages/Purchases';
import { DailyReportsPage } from './pages/DailyReports';
import { SettingsPage } from './pages/Settings';
import { ProfilePage } from './pages/Profile';
import { AttendancePage } from './pages/Attendance';
import { db, type Site, seedDatabase } from './db/database';
import { useAuth } from './contexts/AuthContext';
import './index.css';

type Page = 'dashboard' | 'production' | 'workers' | 'inventory' | 'purchases' | 'reports' | 'settings' | 'profile' | 'attendance';

function AppContent() {
  const { user, viewMode, isAdmin, isSupervisor } = useAuth();
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [sites, setSites] = useState<Site[]>([]);
  const [activeSiteId, setActiveSiteId] = useState<number>(0);
  const [showSiteMenu, setShowSiteMenu] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Navigation items based on role
  const getNavItems = () => {
    const base = [
      { id: 'dashboard' as Page, label: 'Accueil', icon: Home },
      { id: 'attendance' as Page, label: 'Pointage', icon: Clock },
      { id: 'production' as Page, label: 'Production', icon: Gem },
    ];

    if (isSupervisor) {
      base.push(
        { id: 'reports' as Page, label: 'Rapports', icon: FileText },
        { id: 'purchases' as Page, label: 'Achats', icon: DollarSign }
      );
    } else {
      base.push({ id: 'profile' as Page, label: 'Profil', icon: User });
    }

    return base;
  };

  const getSidebarItems = () => {
    const items = [
      { id: 'dashboard' as Page, label: 'Tableau de bord', icon: Home },
      { id: 'attendance' as Page, label: 'Pointage', icon: Clock },
      { id: 'production' as Page, label: 'Production', icon: Gem },
    ];

    if (isSupervisor) {
      items.push(
        { id: 'workers' as Page, label: 'Personnel', icon: Users },
        { id: 'inventory' as Page, label: 'Inventaire', icon: Box },
        { id: 'reports' as Page, label: 'Rapports', icon: FileText },
        { id: 'purchases' as Page, label: 'Achats', icon: DollarSign }
      );
    }

    if (isAdmin) {
      items.push({ id: 'settings' as Page, label: 'Paramètres', icon: Settings });
    }

    items.push({ id: 'profile' as Page, label: 'Mon Compte', icon: User });

    return items;
  };

  useEffect(() => {
    initApp();
  }, []);

  const initApp = async () => {
    await seedDatabase();
    await loadSites();
    setIsInitialized(true);
  };

  const loadSites = async () => {
    const allSites = await db.sites.toArray();
    setSites(allSites);
    const active = allSites.find(s => s.isActive);
    if (active?.id) setActiveSiteId(active.id);
  };

  const handleSiteChange = async (id: number) => {
    await db.sites.toCollection().modify({ isActive: false });
    await db.sites.update(id, { isActive: true });
    setActiveSiteId(id);
    setShowSiteMenu(false);
    await loadSites();
  };

  const handleNavigate = (page: string) => {
    setCurrentPage(page as Page);
  };

  const activeSite = sites.find(s => s.id === activeSiteId);
  const navItems = getNavItems();
  const sidebarItems = getSidebarItems();

  const renderPage = () => {
    if (!isInitialized || activeSiteId === 0) {
      return <div className="main-content"><div className="skeleton" style={{ height: 200 }} /></div>;
    }

    switch (currentPage) {
      case 'dashboard':
        return <Dashboard siteId={activeSiteId} onNavigate={handleNavigate} />;
      case 'production':
        return <ProductionPage siteId={activeSiteId} />;
      case 'workers':
        return isSupervisor ? <WorkersPage siteId={activeSiteId} /> : <Dashboard siteId={activeSiteId} onNavigate={handleNavigate} />;
      case 'inventory':
        return isSupervisor ? <InventoryPage siteId={activeSiteId} /> : <Dashboard siteId={activeSiteId} onNavigate={handleNavigate} />;
      case 'purchases':
        return isSupervisor ? <PurchasesPage siteId={activeSiteId} /> : <Dashboard siteId={activeSiteId} onNavigate={handleNavigate} />;
      case 'reports':
        return isSupervisor ? <DailyReportsPage siteId={activeSiteId} /> : <Dashboard siteId={activeSiteId} onNavigate={handleNavigate} />;
      case 'settings':
        return isAdmin ? <SettingsPage sites={sites} activeSiteId={activeSiteId} onSiteChange={handleSiteChange} onRefreshSites={loadSites} /> : <Dashboard siteId={activeSiteId} onNavigate={handleNavigate} />;
      case 'profile':
        return <ProfilePage />;
      case 'attendance':
        return <AttendancePage siteId={activeSiteId} />;
      default:
        return <Dashboard siteId={activeSiteId} onNavigate={handleNavigate} />;
    }
  };

  const getInitials = () => {
    if (!user) return '??';
    return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
  };

  return (
    <div className="app-layout">
      {/* Mobile Header */}
      <header className="app-header">
        <div className="header-left">
          <button className="site-selector" onClick={() => setShowSiteMenu(!showSiteMenu)}>
            <MapPin size={16} />
            <span>{activeSite?.name || 'Site'}</span>
            <ChevronDown size={14} />
          </button>
        </div>
        <div className="header-logo">
          <div className="header-logo-icon"><Gem size={20} /></div>
          <span>Mine d'Or</span>
        </div>
        <div className="header-actions">
          <button className="btn btn-ghost" onClick={() => setCurrentPage('profile')}>
            <div className="avatar avatar-sm">
              <div className="avatar-ring" />
              <div className="avatar-inner" style={{ width: 32, height: 32, fontSize: '0.75rem' }}>
                {getInitials()}
              </div>
            </div>
          </button>
        </div>
      </header>

      {/* Site Menu Dropdown */}
      {showSiteMenu && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 150 }} onClick={() => setShowSiteMenu(false)} />
          <div style={{
            position: 'fixed',
            top: 'calc(var(--header-height) + env(safe-area-inset-top, 0px) + 0.5rem)',
            left: '1rem', right: '1rem',
            background: 'var(--bg-primary)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-xl)',
            padding: '0.5rem',
            zIndex: 200,
            boxShadow: 'var(--shadow-xl)'
          }}>
            {sites.map(site => (
              <button
                key={site.id}
                onClick={() => handleSiteChange(site.id!)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  width: '100%', padding: '0.875rem', background: site.id === activeSiteId ? 'var(--bg-tertiary)' : 'none',
                  border: 'none', borderRadius: 'var(--radius-lg)', color: 'var(--text-primary)',
                  fontSize: '0.9375rem', cursor: 'pointer', textAlign: 'left'
                }}
              >
                <MapPin size={18} style={{ color: site.id === activeSiteId ? 'var(--primary)' : 'var(--text-muted)' }} />
                <div>
                  <div style={{ fontWeight: site.id === activeSiteId ? 600 : 400 }}>{site.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{site.location}</div>
                </div>
                {site.id === activeSiteId && <span style={{ marginLeft: 'auto', color: 'var(--primary)' }}>✓</span>}
              </button>
            ))}
          </div>
        </>
      )}

      {/* Desktop Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <div className="sidebar-logo-icon"><Gem size={26} /></div>
            <div>
              <div className="sidebar-logo-text">Mine d'Or</div>
              <div className="sidebar-logo-sub">Congo</div>
            </div>
          </div>
        </div>
        <div className="sidebar-site">
          <button className="site-selector" style={{ width: '100%' }} onClick={() => setShowSiteMenu(!showSiteMenu)}>
            <MapPin size={16} />
            <span style={{ flex: 1, textAlign: 'left' }}>{activeSite?.name || 'Site'}</span>
            <ChevronDown size={14} />
          </button>
        </div>
        <nav className="sidebar-nav">
          {sidebarItems.map(item => (
            <button
              key={item.id}
              className={`sidebar-item ${currentPage === item.id ? 'active' : ''}`}
              onClick={() => setCurrentPage(item.id)}
            >
              <item.icon size={22} />
              {item.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="flex items-center gap-md" style={{ padding: '0.5rem' }}>
            <div className="avatar">
              <div className="avatar-ring" />
              <div className="avatar-inner">{getInitials()}</div>
            </div>
            <div style={{ flex: 1 }}>
              <div className="font-semibold text-sm">{user?.firstName} {user?.lastName}</div>
              <div className="text-xs text-muted">{viewMode === 'admin' ? 'Admin' : viewMode === 'supervisor' ? 'Superviseur' : 'Travailleur'}</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      {renderPage()}

      {/* Mobile Bottom Navigation */}
      <nav className="bottom-nav">
        {navItems.map(item => (
          <button
            key={item.id}
            className={`nav-item ${currentPage === item.id ? 'active' : ''}`}
            onClick={() => setCurrentPage(item.id)}
          >
            <item.icon size={24} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

export default function App() {
  return <AppContent />;
}
