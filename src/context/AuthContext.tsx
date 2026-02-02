import React, { createContext, useContext, useState } from 'react';

interface User {
    id: number;
    username: string;
    email?: string;
    role: 'superAdmin' | 'admin' | 'user';
    createdAt: string;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    login: (token: string, user: User) => void;
    logout: () => void;
    isAuthenticated: boolean;
    isSuperAdmin: boolean;
    isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(() => {
        const savedUser = localStorage.getItem('sr_user');
        if (savedUser) {
            const parsedUser = JSON.parse(savedUser);
            // Upgrade existing users to superAdmin if they don't have a role
            if (!parsedUser.role) {
                parsedUser.role = 'superAdmin';
                parsedUser.createdAt = parsedUser.createdAt || new Date().toISOString();
                localStorage.setItem('sr_user', JSON.stringify(parsedUser));
            }
            return parsedUser;
        }
        return null;
    });
    const [token, setToken] = useState<string | null>(() => {
        return localStorage.getItem('sr_token');
    });

    const login = (newToken: string, newUser: User) => {
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

    const isSuperAdmin = user?.role === 'superAdmin';
    const isAdmin = user?.role === 'admin' || user?.role === 'superAdmin';

    return (
        <AuthContext.Provider value={{ 
            user, 
            token, 
            login, 
            logout, 
            isAuthenticated: !!token,
            isSuperAdmin,
            isAdmin
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
