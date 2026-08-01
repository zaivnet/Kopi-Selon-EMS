import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/api';

export interface User {
  id: string;
  username: string;
  role: string;
  email?: string;
  permissions?: string[];
  employee?: any;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, userData: User, rememberMe: boolean) => void;
  logout: () => void;
  updateCurrentUser: (userData: User) => void;
  refreshUser: () => Promise<User>;
  hasPermission: (permissionKey: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  const normalizeUser = (data: any): User => ({
    id: data.id,
    username: data.username,
    role: typeof data.role === 'string' ? data.role : (data.role?.name || ''),
    permissions: Array.isArray(data.permissions) ? data.permissions : [],
    employee: data.employee || null
  });

  const refreshUser = async () => {
    const response = await api.get('/auth/profile');
    const refreshedUser = normalizeUser(response.data);
    setUser(refreshedUser);
    return refreshedUser;
  };

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      
      if (token) {
        try {
          await refreshUser();
        } catch (error) {
          localStorage.removeItem('token');
          sessionStorage.removeItem('token');
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (token: string, userData: User, rememberMe: boolean) => {
    if (rememberMe) {
      localStorage.setItem('token', token);
    } else {
      sessionStorage.setItem('token', token);
    }
    setUser(userData);
    try {
      await refreshUser();
    } catch (err) {
      // refreshUser fallback
    }
    navigate('/dashboard');
  };

  const logout = () => {
    localStorage.removeItem('token');
    sessionStorage.removeItem('token');
    setUser(null);
    navigate('/login');
  };

  const updateCurrentUser = (userData: User) => setUser(userData);

  const hasPermission = (permissionKey: string): boolean => {
    if (!user) return false;
    if (user.role === 'Administrator') return true;
    return Array.isArray(user.permissions) && user.permissions.includes(permissionKey);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, logout, updateCurrentUser, refreshUser, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
