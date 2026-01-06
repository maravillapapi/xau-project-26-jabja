import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { db, getTimestamp } from '../db/database';

export type UserRole = 'admin' | 'supervisor' | 'worker';
export type ViewMode = 'admin' | 'supervisor' | 'worker';

export interface User {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    role: UserRole;
    avatar?: string;
    siteId: number;
    team: string;
    createdAt: string;
}

interface AuthContextType {
    user: User | null;
    viewMode: ViewMode;
    isAdmin: boolean;
    isSupervisor: boolean;
    isWorker: boolean;
    setViewMode: (mode: ViewMode) => void;
    updateUser: (updates: Partial<User>) => void;
    canAccess: (requiredRole: UserRole) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [viewMode, setViewMode] = useState<ViewMode>('admin');

    useEffect(() => {
        loadUser();
    }, []);

    const loadUser = async () => {
        // Check if user exists in localStorage
        const savedUser = localStorage.getItem('mineOrUser');
        if (savedUser) {
            const parsed = JSON.parse(savedUser);
            setUser(parsed);
            setViewMode(parsed.role);
        } else {
            // Create default admin user
            const site = await db.sites.toCollection().first();
            const defaultUser: User = {
                id: 1,
                firstName: 'Administrateur',
                lastName: 'Principal',
                email: 'admin@mineor.cd',
                phone: '+243 812 345 678',
                role: 'admin',
                siteId: site?.id || 1,
                team: 'Direction',
                createdAt: getTimestamp()
            };
            setUser(defaultUser);
            setViewMode('admin');
            localStorage.setItem('mineOrUser', JSON.stringify(defaultUser));
        }
    };

    const updateUser = (updates: Partial<User>) => {
        if (user) {
            const updated = { ...user, ...updates };
            setUser(updated);
            localStorage.setItem('mineOrUser', JSON.stringify(updated));
        }
    };

    const canAccess = (requiredRole: UserRole): boolean => {
        const roleHierarchy: Record<UserRole, number> = {
            admin: 3,
            supervisor: 2,
            worker: 1
        };

        const currentLevel = roleHierarchy[viewMode];
        const requiredLevel = roleHierarchy[requiredRole];

        return currentLevel >= requiredLevel;
    };

    const isAdmin = viewMode === 'admin';
    const isSupervisor = viewMode === 'supervisor' || viewMode === 'admin';
    const isWorker = true; // Everyone has worker access

    return (
        <AuthContext.Provider value={{
            user,
            viewMode,
            isAdmin,
            isSupervisor,
            isWorker,
            setViewMode,
            updateUser,
            canAccess
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
