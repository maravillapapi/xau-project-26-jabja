import { useState, useEffect } from 'react';
import { Gem, Plus, Calendar, Search } from 'lucide-react';
import { Modal } from '../components/Modal';
import { db, type Production, formatDate, getTimestamp } from '../db/database';

interface ProductionPageProps {
    siteId: number;
}

export function ProductionPage({ siteId }: ProductionPageProps) {
    const [productions, setProductions] = useState<Production[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProduction, setEditingProduction] = useState<Production | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterTeam, setFilterTeam] = useState('');

    const [formData, setFormData] = useState({
        date: formatDate(),
        quantityGrams: '',
        team: 'Équipe A',
        shift: 'morning' as 'morning' | 'afternoon' | 'night',
        notes: ''
    });

    useEffect(() => {
        loadProductions();
    }, [siteId]);

    const loadProductions = async () => {
        try {
            const data = await db.productions.where('siteId').equals(siteId).reverse().sortBy('date');
            setProductions(data);
        } catch (error) {
            console.error('Error loading productions:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const productionData = {
                siteId,
                date: formData.date,
                quantityGrams: Number(formData.quantityGrams),
                team: formData.team,
                shift: formData.shift,
                notes: formData.notes,
                updatedAt: getTimestamp()
            };

            if (editingProduction?.id) {
                await db.productions.update(editingProduction.id, productionData);
            } else {
                await db.productions.add({ ...productionData, createdAt: getTimestamp() });
            }

            await loadProductions();
            closeModal();
        } catch (error) {
            console.error('Error saving production:', error);
        }
    };

    const handleEdit = (production: Production) => {
        setEditingProduction(production);
        setFormData({
            date: production.date,
            quantityGrams: String(production.quantityGrams),
            team: production.team,
            shift: production.shift,
            notes: production.notes
        });
        setIsModalOpen(true);
    };

    const handleDelete = async (id: number) => {
        if (window.confirm('Supprimer cet enregistrement ?')) {
            await db.productions.delete(id);
            await loadProductions();
        }
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingProduction(null);
        setFormData({ date: formatDate(), quantityGrams: '', team: 'Équipe A', shift: 'morning', notes: '' });
    };

    const formatG = (g: number) => g >= 1000 ? `${(g / 1000).toFixed(2)} kg` : `${g} g`;
    const formatDateDisplay = (d: string) => new Date(d).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
    const getShiftLabel = (s: string) => ({ morning: 'Matin', afternoon: 'Après-midi', night: 'Nuit' }[s] || s);

    const filteredProductions = productions.filter(p => {
        const matchesSearch = p.notes.toLowerCase().includes(searchQuery.toLowerCase()) || p.team.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesTeam = !filterTeam || p.team === filterTeam;
        return matchesSearch && matchesTeam;
    });

    const totalFiltered = filteredProductions.reduce((s, p) => s + p.quantityGrams, 0);

    return (
        <div className="main-content animate-fade">
            <div className="page-header">
                <h1><Gem size={24} /> Production</h1>
                <p className="page-description">Suivi de l'extraction d'or</p>
            </div>

            <div className="card mb-md">
                <div style={{ position: 'relative' }}>
                    <Search size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input type="text" className="form-input" placeholder="Rechercher..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ paddingLeft: 40 }} />
                </div>
                <select className="form-select mt-sm" value={filterTeam} onChange={(e) => setFilterTeam(e.target.value)}>
                    <option value="">Toutes les équipes</option>
                    <option value="Équipe A">Équipe A</option>
                    <option value="Équipe B">Équipe B</option>
                    <option value="Équipe C">Équipe C</option>
                </select>
                {filteredProductions.length > 0 && (
                    <div className="mt-sm text-sm text-muted">Total: <span className="font-bold text-gold">{formatG(totalFiltered)}</span></div>
                )}
            </div>

            <button className="btn btn-primary btn-block mb-md" onClick={() => setIsModalOpen(true)}>
                <Plus size={20} /> Nouvelle entrée
            </button>

            <div className="list-view">
                {loading ? (
                    <div className="card"><div className="skeleton" style={{ height: 100 }} /></div>
                ) : filteredProductions.length > 0 ? (
                    filteredProductions.map(prod => (
                        <div key={prod.id} className="list-item">
                            <div className="list-item-header">
                                <div>
                                    <div className="list-item-title flex items-center gap-sm">
                                        <Calendar size={16} className="text-muted" />
                                        {formatDateDisplay(prod.date)}
                                    </div>
                                    <div className="list-item-subtitle">{prod.team}</div>
                                </div>
                                <div className="list-item-value">{formatG(prod.quantityGrams)}</div>
                            </div>
                            <div className="list-item-meta">
                                <span className="badge badge-gold">{getShiftLabel(prod.shift)}</span>
                                {prod.notes && <span className="text-xs text-muted">{prod.notes}</span>}
                            </div>
                            <div className="list-item-actions">
                                <button className="btn btn-ghost btn-sm" onClick={() => handleEdit(prod)}>✏️ Modifier</button>
                                <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(prod.id!)}>🗑️</button>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="card empty-state"><Gem /><h3>Aucune production</h3><p>Ajoutez votre première entrée</p></div>
                )}
            </div>

            <Modal isOpen={isModalOpen} onClose={closeModal} title={editingProduction ? 'Modifier' : 'Nouvelle production'}
                footer={<><button className="btn btn-secondary" onClick={closeModal}>Annuler</button><button className="btn btn-primary" onClick={handleSubmit}>{editingProduction ? 'Enregistrer' : 'Ajouter'}</button></>}>
                <form onSubmit={handleSubmit}>
                    <div className="form-group"><label className="form-label">Date</label><input type="date" className="form-input" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} required /></div>
                    <div className="form-group"><label className="form-label">Quantité (g)</label><input type="number" className="form-input" placeholder="250" value={formData.quantityGrams} onChange={(e) => setFormData({ ...formData, quantityGrams: e.target.value })} min="0" step="0.01" required /></div>
                    <div className="grid grid-2">
                        <div className="form-group"><label className="form-label">Équipe</label><select className="form-select" value={formData.team} onChange={(e) => setFormData({ ...formData, team: e.target.value })}><option>Équipe A</option><option>Équipe B</option><option>Équipe C</option></select></div>
                        <div className="form-group"><label className="form-label">Quart</label><select className="form-select" value={formData.shift} onChange={(e) => setFormData({ ...formData, shift: e.target.value as 'morning' | 'afternoon' | 'night' })}><option value="morning">Matin</option><option value="afternoon">Après-midi</option><option value="night">Nuit</option></select></div>
                    </div>
                    <div className="form-group"><label className="form-label">Notes</label><textarea className="form-textarea" placeholder="Observations..." value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} /></div>
                </form>
            </Modal>
        </div>
    );
}
