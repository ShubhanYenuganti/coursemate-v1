"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';

interface User {
    id: string;
    name: string;
    email: string;
}

interface IAuthContext {
    user: User | null;
}

const AuthContext = createContext<IAuthContext | null>(null);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            try {
                const decodedToken: any = jwtDecode(token);
                // The 'sub' claim in a JWT often holds the user ID.
                // You might need to adjust this based on your JWT structure.
                setUser({
                    id: decodedToken.sub, 
                    name: decodedToken.name || 'User', 
                    email: decodedToken.email || ''
                });
            } catch (error) {
                console.error("Failed to decode JWT:", error);
                setUser(null);
            }
        }
    }, []);

    return (
        <AuthContext.Provider value={{ user }}>
            {children}
        </AuthContext.Provider>
    );
}; 