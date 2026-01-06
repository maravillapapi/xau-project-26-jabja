import { useState, useEffect } from 'react';
import { Home, Box, Users, BarChart3, PieChart, Menu, X, WifiOff, Gem } from 'lucide-react';

type Page = 'dashboard' | 'production' | 'workers' | 'inventory' | 'reports';

interface SidebarProps {
    currentPage: Page;
    onPageChange: (page: Page) => void;
}

const menuItems = [
    { id: 'dashboard' as Page, label: 'Tableau de bord', icon: Home },
    { id: 'production' as Page, label: 'Production', icon: Gem },
    { id: 'workers' as Page, label: 'Personnel', icon: Users },
    { id: 'inventory' as Page, label: 'Inventaire', icon: Box },
    { id: 'reports' as Page, label: 'Rapports', icon: BarChart3 },
];

export function Sidebar({ currentPage, onPageChange }: SidebarProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    const handlePageChange = (page: Page) => {
        onPageChange(page);
        setIsOpen(false);
    };

    return (
        <>
            {/* Mobile Toggle */}
            <button
                className="mobile-menu-toggle"
                onClick={() => setIsOpen(!isOpen)}
                aria-label="Toggle menu"
            >
                {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>

            {/* Overlay */}
            {isOpen && (
                <div
                    className="sidebar-overlay"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
                <div className="sidebar-header">
                    <div className="logo">
                        <div className="logo-icon">
                            <Gem size={24} />
                        </div>
                        <div className="logo-text">
                            <span className="logo-title">Mine d'Or</span>
                            <span className="logo-subtitle">Congo</span>
                        </div>
                    </div>
                </div>

                <nav className="sidebar-nav">
                    {menuItems.map((item) => (
                        <button
                            key={item.id}
                            className={`nav-item ${currentPage === item.id ? 'active' : ''}`}
                            onClick={() => handlePageChange(item.id)}
                        >
                            <item.icon size={20} />
                            <span>{item.label}</span>
                        </button>
                    ))}
                </nav>

                <div className="sidebar-footer">
                    <div className={`connection-status ${isOnline ? 'online' : 'offline'}`}>
                        {isOnline ? (
                            <>
                                <PieChart size={16} />
                                <span>Connecté</span>
                            </>
                        ) : (
                            <>
                                <WifiOff size={16} />
                                <span>Hors ligne</span>
                            </>
                        )}
                    </div>
                </div>
            </aside>

            <style>{`
        .mobile-menu-toggle {
          display: none;
          position: fixed;
          top: var(--spacing-md);
          left: var(--spacing-md);
          z-index: 1001;
          width: 44px;
          height: 44px;
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-lg);
          color: var(--text-primary);
          cursor: pointer;
          align-items: center;
          justify-content: center;
          transition: all var(--transition-fast);
        }

        .mobile-menu-toggle:hover {
          background: var(--bg-tertiary);
        }

        .sidebar-overlay {
          display: none;
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(4px);
          z-index: 998;
        }

        .sidebar {
          position: fixed;
          top: 0;
          left: 0;
          width: var(--sidebar-width);
          height: 100vh;
          background: var(--bg-secondary);
          border-right: 1px solid var(--border-color);
          display: flex;
          flex-direction: column;
          z-index: 999;
          transition: transform var(--transition-base);
        }

        .sidebar-header {
          padding: var(--spacing-lg);
          border-bottom: 1px solid var(--border-color);
        }

        .logo {
          display: flex;
          align-items: center;
          gap: var(--spacing-md);
        }

        .logo-icon {
          width: 48px;
          height: 48px;
          background: var(--gradient-gold);
          border-radius: var(--radius-lg);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: var(--shadow-gold);
        }

        .logo-icon svg {
          color: var(--bg-primary);
        }

        .logo-text {
          display: flex;
          flex-direction: column;
        }

        .logo-title {
          font-size: var(--font-size-lg);
          font-weight: 700;
          color: var(--text-primary);
          line-height: 1.2;
        }

        .logo-subtitle {
          font-size: var(--font-size-sm);
          color: var(--gold-400);
          font-weight: 500;
        }

        .sidebar-nav {
          flex: 1;
          padding: var(--spacing-md);
          display: flex;
          flex-direction: column;
          gap: var(--spacing-xs);
        }

        .nav-item {
          display: flex;
          align-items: center;
          gap: var(--spacing-md);
          padding: var(--spacing-md);
          background: transparent;
          border: none;
          border-radius: var(--radius-lg);
          color: var(--text-secondary);
          font-size: var(--font-size-base);
          font-family: inherit;
          cursor: pointer;
          transition: all var(--transition-fast);
          text-align: left;
          width: 100%;
        }

        .nav-item:hover {
          background: var(--bg-glass);
          color: var(--text-primary);
        }

        .nav-item.active {
          background: var(--gradient-gold);
          color: var(--bg-primary);
          font-weight: 500;
          box-shadow: var(--shadow-gold);
        }

        .nav-item.active svg {
          color: var(--bg-primary);
        }

        .sidebar-footer {
          padding: var(--spacing-lg);
          border-top: 1px solid var(--border-color);
        }

        .connection-status {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
          font-size: var(--font-size-sm);
          padding: var(--spacing-sm) var(--spacing-md);
          border-radius: var(--radius-full);
        }

        .connection-status.online {
          background: var(--success-light);
          color: var(--success);
        }

        .connection-status.offline {
          background: var(--warning-light);
          color: var(--warning);
        }

        @media (max-width: 1024px) {
          .mobile-menu-toggle {
            display: flex;
          }

          .sidebar-overlay {
            display: block;
          }

          .sidebar {
            transform: translateX(-100%);
          }

          .sidebar.open {
            transform: translateX(0);
          }
        }
      `}</style>
        </>
    );
}

export type { Page };
