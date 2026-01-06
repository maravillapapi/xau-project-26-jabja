import { useState } from 'react';
import { User, Settings, Bell, Shield, ChevronRight, LogOut, Camera, Phone, Mail, Briefcase } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Modal } from '../components/Modal';

export function ProfilePage() {
    const { user, viewMode, setViewMode, updateUser, isAdmin } = useAuth();
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        firstName: user?.firstName || '',
        lastName: user?.lastName || '',
        email: user?.email || '',
        phone: user?.phone || ''
    });

    const handleSaveProfile = () => {
        updateUser(formData);
        setIsEditModalOpen(false);
    };

    const getInitials = () => {
        if (!user) return '??';
        return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    };

    const getRoleName = (role: string) => {
        const roles: Record<string, string> = {
            admin: 'Administrateur',
            supervisor: 'Superviseur',
            worker: 'Travailleur'
        };
        return roles[role] || role;
    };

    if (!user) return null;

    return (
        <div className="main-content animate-fade">
            <div className="page-header">
                <h1><User size={26} /> Mon Compte</h1>
            </div>

            {/* Profile Card */}
            <div className="card profile-card mb-md">
                <div className="profile-avatar avatar avatar-xl" style={{ width: 86, height: 86, margin: '0 auto' }}>
                    <div className="avatar-ring" />
                    <div className="avatar-inner">
                        {user.avatar ? (
                            <img src={user.avatar} alt="Avatar" className="avatar-img" />
                        ) : (
                            getInitials()
                        )}
                    </div>
                </div>
                <div className="profile-name">{user.firstName} {user.lastName}</div>
                <div className="profile-email">{user.email}</div>
                <div className="profile-role">{getRoleName(user.role)}</div>

                <button
                    className="btn btn-secondary btn-sm mt-md"
                    onClick={() => {
                        setFormData({
                            firstName: user.firstName,
                            lastName: user.lastName,
                            email: user.email,
                            phone: user.phone
                        });
                        setIsEditModalOpen(true);
                    }}
                >
                    ✏️ Modifier le profil
                </button>
            </div>

            {/* Admin Role Switch */}
            {user.role === 'admin' && (
                <div className="card mb-md">
                    <div className="card-title" style={{ marginBottom: '1rem' }}>
                        <Shield size={20} />
                        Test de Vue (Admin uniquement)
                    </div>
                    <p className="text-sm text-muted mb-md">
                        En tant qu'administrateur, vous pouvez tester l'application comme si vous étiez un superviseur ou un travailleur.
                    </p>
                    <div className="role-switch">
                        <button
                            className={`role-switch-item ${viewMode === 'admin' ? 'active' : ''}`}
                            onClick={() => setViewMode('admin')}
                        >
                            Admin
                        </button>
                        <button
                            className={`role-switch-item ${viewMode === 'supervisor' ? 'active' : ''}`}
                            onClick={() => setViewMode('supervisor')}
                        >
                            Superviseur
                        </button>
                        <button
                            className={`role-switch-item ${viewMode === 'worker' ? 'active' : ''}`}
                            onClick={() => setViewMode('worker')}
                        >
                            Travailleur
                        </button>
                    </div>
                </div>
            )}

            {/* Menu Items */}
            <div className="card">
                <div className="menu-list">
                    <button className="menu-item">
                        <div className="menu-item-icon">
                            <Phone size={20} />
                        </div>
                        <div className="menu-item-content">
                            <div className="menu-item-label">Téléphone</div>
                            <div className="menu-item-desc">{user.phone}</div>
                        </div>
                        <ChevronRight size={20} className="menu-item-arrow" />
                    </button>

                    <button className="menu-item">
                        <div className="menu-item-icon">
                            <Briefcase size={20} />
                        </div>
                        <div className="menu-item-content">
                            <div className="menu-item-label">Équipe</div>
                            <div className="menu-item-desc">{user.team}</div>
                        </div>
                        <ChevronRight size={20} className="menu-item-arrow" />
                    </button>

                    <button className="menu-item">
                        <div className="menu-item-icon gradient">
                            <Bell size={20} />
                        </div>
                        <div className="menu-item-content">
                            <div className="menu-item-label">Notifications</div>
                            <div className="menu-item-desc">Gérer les alertes</div>
                        </div>
                        <ChevronRight size={20} className="menu-item-arrow" />
                    </button>

                    <button className="menu-item">
                        <div className="menu-item-icon">
                            <Settings size={20} />
                        </div>
                        <div className="menu-item-content">
                            <div className="menu-item-label">Paramètres</div>
                            <div className="menu-item-desc">Affichage, langue</div>
                        </div>
                        <ChevronRight size={20} className="menu-item-arrow" />
                    </button>
                </div>
            </div>

            {/* Edit Profile Modal */}
            <Modal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                title="Modifier le profil"
                footer={
                    <>
                        <button className="btn btn-secondary" onClick={() => setIsEditModalOpen(false)}>Annuler</button>
                        <button className="btn btn-primary" onClick={handleSaveProfile}>Enregistrer</button>
                    </>
                }
            >
                <div className="form-group">
                    <label className="form-label">Prénom</label>
                    <input
                        type="text"
                        className="form-input"
                        value={formData.firstName}
                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    />
                </div>
                <div className="form-group">
                    <label className="form-label">Nom</label>
                    <input
                        type="text"
                        className="form-input"
                        value={formData.lastName}
                        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    />
                </div>
                <div className="form-group">
                    <label className="form-label">Email</label>
                    <input
                        type="email"
                        className="form-input"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                </div>
                <div className="form-group">
                    <label className="form-label">Téléphone</label>
                    <input
                        type="tel"
                        className="form-input"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                </div>
            </Modal>
        </div>
    );
}
