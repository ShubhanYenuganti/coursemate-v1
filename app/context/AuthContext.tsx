"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
    id: string;
    name: string;
    email: string;
    profilePictureUrl?: string;
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
            // Fetch user info from API instead of decoding JWT
            fetch('/api/users/me', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            })
            .then(response => {
                if (response.ok) {
                    return response.json();
                } else {
                    throw new Error('Failed to fetch user info');
                }
            })
            .then(userData => {
                setUser({
                    id: userData.id,
                    name: userData.name || 'User',
                    email: userData.email || '',
                    profilePictureUrl: userData.profile_picture_url
                });
            })
            .catch(error => {
                console.error("Failed to fetch user info:", error);
                setUser(null);
            });
        }
    }, []);

    return (
        <AuthContext.Provider value={{ user }}>
            {children}
        </AuthContext.Provider>
    );
}; 