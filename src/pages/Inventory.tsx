import { useState, useEffect } from 'react';
import { Box, Plus, Search, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { Modal } from '../components/Modal';
import { db, type InventoryItem, getTimestamp } from '../db/database';

interface InventoryPageProps {
    siteId: number;
}

export function InventoryPage({ siteId }: InventoryPageProps) {
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterCategory, setFilterCategory] = useState('');

    const [formData, setFormData] = useState({
        name: '', category: 'equipment' as InventoryItem['category'],
        quantity: '', unit: 'pièces', minQuantity: '',
        condition: 'good' as InventoryItem['condition'], location: '', notes: ''
    });

    useEffect(() => { loadInventory(); }, [siteId]);

    const loadInventory = async () => {
        try {
            const data = await db.inventory.where('siteId').equals(siteId).sortBy('name');
            setInventory(data);
        } catch (error) { console.error('Error:', error); }
        finally { setLoading(false); }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const itemData = {
                siteId, name: formData.name, category: formData.category,
                quantity: Number(formData.quantity), unit: formData.unit,
                minQuantity: Number(formData.minQuantity), condition: formData.condition,
                location: formData.location, notes: formData.notes, updatedAt: getTimestamp()
            };
            if (editingItem?.id) await db.inventory.update(editingItem.id, itemData);
            else await db.inventory.add({ ...itemData, createdAt: getTimestamp() });
            await loadInventory();
            closeModal();
        } catch (error) { console.error('Error:', error); }
    };

    const handleEdit = (item: InventoryItem) => {
        setEditingItem(item);
        setFormData({
            name: item.name, category: item.category, quantity: String(item.quantity),
            unit: item.unit, minQuantity: String(item.minQuantity),
            condition: item.condition, location: item.location, notes: item.notes
        });
        setIsModalOpen(true);
    };

    const handleDelete = async (id: number) => {
        if (window.confirm('Supprimer cet article ?')) { await db.inventory.delete(id); await loadInventory(); }
    };

    const closeModal = () => {
        setIsModalOpen(false); setEditingItem(null);
        setFormData({ name: '', category: 'equipment', quantity: '', unit: 'pièces', minQuantity: '', condition: 'good', location: '', notes: '' });
    };

    const getCategoryLabel = (c: string) => ({ equipment: 'Équipement', tools: 'Outils', spare_parts: 'Pièces', consumables: 'Consommables', safety: 'Sécurité' }[c] || c);
    const getConditionBadge = (c: string) => {
        const badges: Record<string, { cls: string; icon: JSX.Element; label: string }> = {
            good: { cls: 'badge-success', icon: <CheckCircle size={12} />, label: 'Bon' },
            fair: { cls: 'badge-warning', icon: <AlertTriangle size={12} />, label: 'Correct' },
            poor: { cls: 'badge-danger', icon: <XCircle size={12} />, label: 'Mauvais' },
            broken: { cls: 'badge-danger', icon: <XCircle size={12} />, label: 'Cassé' }
        };
        const b = badges[c] || badges.good;
        return <span className={`badge ${b.cls}`}>{b.icon} {b.label}</span>;
    };

    const isLowStock = (item: InventoryItem) => item.quantity <= item.minQuantity;
    const filteredInventory = inventory.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesSearch && (!filterCategory || item.category === filterCategory);
    });
    const lowStockCount = inventory.filter(isLowStock).length;

    return (
        <div className="main-content animate-fade">
            <div className="page-header"><h1><Box size={24} /> Inventaire</h1><p className="page-description">Équipements et stock</p></div>

            {lowStockCount > 0 && (
                <div className="card mb-md" style={{ borderColor: 'var(--warning)', background: 'rgba(245, 158, 11, 0.1)' }}>
                    <div className="flex items-center gap-md">
                        <AlertTriangle size={24} style={{ color: 'var(--warning)' }} />
                        <div><div className="font-semibold" style={{ color: 'var(--warning)' }}>{lowStockCount} article{lowStockCount > 1 ? 's' : ''} en stock faible</div></div>
                    </div>
                </div>
            )}

            <div className="card mb-md">
                <div style={{ position: 'relative' }}>
                    <Search size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input type="text" className="form-input" placeholder="Rechercher..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ paddingLeft: 40 }} />
                </div>
                <select className="form-select mt-sm" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
                    <option value="">Toutes catégories</option>
                    <option value="equipment">Équipement</option><option value="tools">Outils</option>
                    <option value="spare_parts">Pièces</option><option value="consumables">Consommables</option><option value="safety">Sécurité</option>
                </select>
            </div>

            <button className="btn btn-primary btn-block mb-md" onClick={() => setIsModalOpen(true)}><Plus size={20} /> Nouvel article</button>

            <div className="list-view">
                {loading ? <div className="card"><div className="skeleton" style={{ height: 100 }} /></div> : filteredInventory.length > 0 ? (
                    filteredInventory.map(item => (
                        <div key={item.id} className="list-item" style={isLowStock(item) ? { borderColor: 'var(--warning)' } : {}}>
                            <div className="list-item-header">
                                <div>
                                    <div className="list-item-title flex items-center gap-sm">
                                        {isLowStock(item) && <AlertTriangle size={14} style={{ color: 'var(--warning)' }} />}
                                        {item.name}
                                    </div>
                                    <div className="list-item-subtitle">{item.location}</div>
                                </div>
                                <div className={`list-item-value ${isLowStock(item) ? 'text-gold' : ''}`}>{item.quantity} {item.unit}</div>
                            </div>
                            <div className="list-item-meta">
                                <span className="badge badge-gold">{getCategoryLabel(item.category)}</span>
                                {getConditionBadge(item.condition)}
                            </div>
                            <div className="list-item-actions">
                                <button className="btn btn-ghost btn-sm" onClick={() => handleEdit(item)}>✏️ Modifier</button>
                                <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(item.id!)}>🗑️</button>
                            </div>
                        </div>
                    ))
                ) : <div className="card empty-state"><Box /><h3>Aucun article</h3><p>Ajoutez votre premier article</p></div>}
            </div>

            <Modal isOpen={isModalOpen} onClose={closeModal} title={editingItem ? 'Modifier' : 'Nouvel article'}
                footer={<><button className="btn btn-secondary" onClick={closeModal}>Annuler</button><button className="btn btn-primary" onClick={handleSubmit}>{editingItem ? 'Enregistrer' : 'Ajouter'}</button></>}>
                <form onSubmit={handleSubmit}>
                    <div className="form-group"><label className="form-label">Nom</label><input type="text" className="form-input" placeholder="Foreuse" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required /></div>
                    <div className="form-group"><label className="form-label">Catégorie</label><select className="form-select" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value as InventoryItem['category'] })}>
                        <option value="equipment">Équipement</option><option value="tools">Outils</option><option value="spare_parts">Pièces</option><option value="consumables">Consommables</option><option value="safety">Sécurité</option>
                    </select></div>
                    <div className="grid grid-2">
                        <div className="form-group"><label className="form-label">Quantité</label><input type="number" className="form-input" placeholder="10" value={formData.quantity} onChange={(e) => setFormData({ ...formData, quantity: e.target.value })} min="0" required /></div>
                        <div className="form-group"><label className="form-label">Unité</label><input type="text" className="form-input" placeholder="pièces" value={formData.unit} onChange={(e) => setFormData({ ...formData, unit: e.target.value })} /></div>
                    </div>
                    <div className="grid grid-2">
                        <div className="form-group"><label className="form-label">Qté min.</label><input type="number" className="form-input" placeholder="5" value={formData.minQuantity} onChange={(e) => setFormData({ ...formData, minQuantity: e.target.value })} min="0" /></div>
                        <div className="form-group"><label className="form-label">État</label><select className="form-select" value={formData.condition} onChange={(e) => setFormData({ ...formData, condition: e.target.value as InventoryItem['condition'] })}>
                            <option value="good">Bon</option><option value="fair">Correct</option><option value="poor">Mauvais</option><option value="broken">Cassé</option>
                        </select></div>
                    </div>
                    <div className="form-group"><label className="form-label">Emplacement</label><input type="text" className="form-input" placeholder="Entrepôt" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} /></div>
                </form>
            </Modal>
        </div>
    );
}
