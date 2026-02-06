import React, { createContext, useContext, useState } from 'react';

interface User {
    id: number;
    username: string;
    email?: string;
    role: 'super_admin' | 'admin' | 'user';
    createdAt: string;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    login: (token: string, user: User) => void;
    logout: () => void;
    isAuthenticated: boolean;
    isAdmin: boolean;
    isSuperAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(() => {
        const savedUser = localStorage.getItem('sr_user');
        if (savedUser) {
            const parsedUser = JSON.parse(savedUser);
            // Ensure smartAdmin is always super_admin, blake becomes regular user
            if (parsedUser.username && parsedUser.username.toLowerCase() === 'smartadmin' && parsedUser.role !== 'super_admin') {
                parsedUser.role = 'super_admin';
                parsedUser.createdAt = parsedUser.createdAt || new Date().toISOString();
                localStorage.setItem('sr_user', JSON.stringify(parsedUser));
                console.log('Set smartAdmin as super_admin in AuthContext');
            } else if (parsedUser.username && parsedUser.username.toLowerCase() === 'blake' && parsedUser.role === 'admin') {
                parsedUser.role = 'user';
                parsedUser.createdAt = parsedUser.createdAt || new Date().toISOString();
                localStorage.setItem('sr_user', JSON.stringify(parsedUser));
                console.log('Set blake as user in AuthContext');
            }
            return parsedUser;
        }
        return null;
    });
    const [token, setToken] = useState<string | null>(() => {
        return localStorage.getItem('sr_token');
    });

    const login = (newToken: string, newUser: User) => {
        // Clear any cached data from previous user
        localStorage.removeItem('sr_businesses_cache');
        localStorage.removeItem('sr_routes_cache');
        localStorage.removeItem('sr_datasets_cache');

        setToken(newToken);
        setUser(newUser);
        localStorage.setItem('sr_token', newToken);
        localStorage.setItem('sr_user', JSON.stringify(newUser));
    };

    const logout = () => {
        setToken(null);
        setUser(null);
        localStorage.removeItem('sr_token');
        localStorage.removeItem('sr_user');
    };

    const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
    const isSuperAdmin = user?.role === 'super_admin';

    return (
        <AuthContext.Provider value={{
            user,
            token,
            login,
            logout,
            isAuthenticated: !!token,
            isAdmin,
            isSuperAdmin
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
