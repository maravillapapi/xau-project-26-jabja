import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, MapPin, Plus, Eye, EyeOff, Trash2 } from 'lucide-react';
import { Modal } from '../components/Modal';
import { db, type Site, type Settings, getSettings, updateSettings, getTimestamp } from '../db/database';

interface SettingsPageProps {
    sites: Site[];
    activeSiteId: number;
    onSiteChange: (id: number) => void;
    onRefreshSites: () => void;
}

export function SettingsPage({ sites, activeSiteId, onSiteChange, onRefreshSites }: SettingsPageProps) {
    const [settings, setSettings] = useState<Settings | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSite, setEditingSite] = useState<Site | null>(null);
    const [siteForm, setSiteForm] = useState({ name: '', location: '' });

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        const s = await getSettings();
        setSettings(s);
    };

    const handleToggle = async (key: keyof Settings, value: boolean) => {
        await updateSettings({ [key]: value });
        setSettings(prev => prev ? { ...prev, [key]: value } : null);
    };

    const handleAddSite = () => {
        setEditingSite(null);
        setSiteForm({ name: '', location: '' });
        setIsModalOpen(true);
    };

    const handleEditSite = (site: Site) => {
        setEditingSite(site);
        setSiteForm({ name: site.name, location: site.location });
        setIsModalOpen(true);
    };

    const handleSaveSite = async () => {
        try {
            if (editingSite?.id) {
                await db.sites.update(editingSite.id, {
                    name: siteForm.name,
                    location: siteForm.location
                });
            } else {
                await db.sites.add({
                    name: siteForm.name,
                    location: siteForm.location,
                    isActive: sites.length === 0,
                    createdAt: getTimestamp()
                });
            }
            onRefreshSites();
            setIsModalOpen(false);
        } catch (error) {
            console.error('Error saving site:', error);
        }
    };

    const handleDeleteSite = async (id: number) => {
        if (sites.length <= 1) {
            alert('Vous devez avoir au moins un site');
            return;
        }
        if (window.confirm('Supprimer ce site ? Toutes les données associées seront perdues.')) {
            try {
                await db.sites.delete(id);
                // Delete associated data
                await db.productions.where('siteId').equals(id).delete();
                await db.workers.where('siteId').equals(id).delete();
                await db.inventory.where('siteId').equals(id).delete();
                await db.purchases.where('siteId').equals(id).delete();
                await db.dailyReports.where('siteId').equals(id).delete();
                onRefreshSites();
                if (id === activeSiteId && sites.length > 1) {
                    const remaining = sites.find(s => s.id !== id);
                    if (remaining?.id) onSiteChange(remaining.id);
                }
            } catch (error) {
                console.error('Error deleting site:', error);
            }
        }
    };

    const handleSetActiveSite = async (id: number) => {
        await db.sites.toCollection().modify({ isActive: false });
        await db.sites.update(id, { isActive: true });
        onSiteChange(id);
        onRefreshSites();
    };

    if (!settings) return null;

    return (
        <div className="main-content animate-fade">
            <div className="page-header">
                <h1><SettingsIcon size={24} /> Paramètres</h1>
                <p className="page-description">Configuration de l'application</p>
            </div>

            {/* Sites Management */}
            <div className="card mb-md">
                <div className="card-header">
                    <h3 className="card-title"><MapPin size={18} /> Sites</h3>
                    <button className="btn btn-primary btn-sm" onClick={handleAddSite}>
                        <Plus size={16} /> Ajouter
                    </button>
                </div>
                <div className="list-view" style={{ marginTop: '0.5rem' }}>
                    {sites.map(site => (
                        <div
                            key={site.id}
                            className="list-item"
                            style={site.id === activeSiteId ? { borderColor: 'var(--gold-400)', borderWidth: 2 } : {}}
                        >
                            <div className="list-item-header">
                                <div>
                                    <div className="list-item-title">{site.name}</div>
                                    <div className="list-item-subtitle">{site.location}</div>
                                </div>
                                {site.id === activeSiteId && (
                                    <span className="badge badge-gold">Actif</span>
                                )}
                            </div>
                            <div className="list-item-actions">
                                {site.id !== activeSiteId && (
                                    <button className="btn btn-ghost btn-sm" onClick={() => handleSetActiveSite(site.id!)}>
                                        ✓ Activer
                                    </button>
                                )}
                                <button className="btn btn-ghost btn-sm" onClick={() => handleEditSite(site)}>✏️</button>
                                <button className="btn btn-ghost btn-sm" onClick={() => handleDeleteSite(site.id!)}>
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Display Settings */}
            <div className="card">
                <div className="card-header">
                    <h3 className="card-title"><Eye size={18} /> Affichage du tableau de bord</h3>
                </div>
                <div className="settings-group">
                    <div className="setting-item">
                        <div>
                            <div className="setting-label">Comparaison vs Veille</div>
                            <div className="setting-desc">Afficher la variation par rapport à hier</div>
                        </div>
                        <label className="toggle">
                            <input
                                type="checkbox"
                                checked={settings.showVsYesterday}
                                onChange={(e) => handleToggle('showVsYesterday', e.target.checked)}
                            />
                            <span className="toggle-slider"></span>
                        </label>
                    </div>

                    <div className="setting-item">
                        <div>
                            <div className="setting-label">Comparaison vs Semaine</div>
                            <div className="setting-desc">Afficher la variation sur 7 jours</div>
                        </div>
                        <label className="toggle">
                            <input
                                type="checkbox"
                                checked={settings.showVsLastWeek}
                                onChange={(e) => handleToggle('showVsLastWeek', e.target.checked)}
                            />
                            <span className="toggle-slider"></span>
                        </label>
                    </div>

                    <div className="setting-item">
                        <div>
                            <div className="setting-label">Jours travaillés</div>
                            <div className="setting-desc">Compteur mensuel des jours de production</div>
                        </div>
                        <label className="toggle">
                            <input
                                type="checkbox"
                                checked={settings.showWorkingDays}
                                onChange={(e) => handleToggle('showWorkingDays', e.target.checked)}
                            />
                            <span className="toggle-slider"></span>
                        </label>
                    </div>

                    <div className="setting-item">
                        <div>
                            <div className="setting-label">Comparaison Production</div>
                            <div className="setting-desc">Variation de production en %</div>
                        </div>
                        <label className="toggle">
                            <input
                                type="checkbox"
                                checked={settings.showProductionComparison}
                                onChange={(e) => handleToggle('showProductionComparison', e.target.checked)}
                            />
                            <span className="toggle-slider"></span>
                        </label>
                    </div>

                    <div className="setting-item">
                        <div>
                            <div className="setting-label">Comparaison Achats</div>
                            <div className="setting-desc">Variation des dépenses</div>
                        </div>
                        <label className="toggle">
                            <input
                                type="checkbox"
                                checked={settings.showPurchaseComparison}
                                onChange={(e) => handleToggle('showPurchaseComparison', e.target.checked)}
                            />
                            <span className="toggle-slider"></span>
                        </label>
                    </div>
                </div>
            </div>

            {/* Site Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingSite ? 'Modifier le site' : 'Nouveau site'}
                footer={
                    <>
                        <button className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Annuler</button>
                        <button className="btn btn-primary" onClick={handleSaveSite}>Enregistrer</button>
                    </>
                }
            >
                <div className="form-group">
                    <label className="form-label">Nom du site</label>
                    <input
                        type="text"
                        className="form-input"
                        placeholder="Ex: Site Kolwezi"
                        value={siteForm.name}
                        onChange={(e) => setSiteForm({ ...siteForm, name: e.target.value })}
                    />
                </div>
                <div className="form-group">
                    <label className="form-label">Localisation</label>
                    <input
                        type="text"
                        className="form-input"
                        placeholder="Ex: Kolwezi, Lualaba"
                        value={siteForm.location}
                        onChange={(e) => setSiteForm({ ...siteForm, location: e.target.value })}
                    />
                </div>
            </Modal>
        </div>
    );
}
