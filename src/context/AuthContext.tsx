import React, { createContext, useContext, useEffect, useState } from 'react';
import { apiFetch, getAuthToken, setAuthToken, removeAuthToken } from '../services/api';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'farmer' | 'customer' | 'delivery' | 'admin' | 'shopkeeper';
  address: string;
  state: string;
  district: string;
  pincode: string;
  profileImage?: string;
  status: 'pending' | 'approved' | 'rejected' | 'blocked';
  walletBalance: number;
  rewardPoints: number;
  loyaltyTier: 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
  farmName?: string;
  farmLocation?: string;
  vehicleType?: string;
  vehicleNumber?: string;
  businessName?: string;
  businessType?: string;
  businessRegNo?: string;
  city?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (credentials: any) => Promise<User>;
  register: (data: any) => Promise<User>;
  logout: () => void;
  refetchUser: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateUserLocal: (updated: Partial<User>) => void;
  updateUser: (updated: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Store tokens keyed by role so switching portals doesn't lose sessions
const ROLE_TOKEN_PREFIX = 'farmdirect_token_';

function getRoleToken(role: string): string | null {
  return localStorage.getItem(ROLE_TOKEN_PREFIX + role);
}

function setRoleToken(role: string, token: string) {
  localStorage.setItem(ROLE_TOKEN_PREFIX + role, token);
}

function removeRoleToken(role: string) {
  localStorage.removeItem(ROLE_TOKEN_PREFIX + role);
}

// The "active" token is just a pointer to the most recently active session
function getActiveToken(): string | null {
  return getAuthToken();
}

function setActiveToken(token: string) {
  setAuthToken(token);
}

function clearActiveToken() {
  removeAuthToken();
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(getActiveToken());
  const [loading, setLoading] = useState<boolean>(true);

  const fetchProfile = async (tkn?: string) => {
    const activeToken = tkn || getActiveToken();
    if (!activeToken) {
      setLoading(false);
      return;
    }
    try {
      // Temporarily set token in headers by putting it in localStorage
      setAuthToken(activeToken);
      const res = await apiFetch('/auth/profile');
      if (res.success) {
        setUser(res.user);
        // Store role-specific token
        setRoleToken(res.user.role, activeToken);
        if (res.user.role === 'customer') {
          localStorage.setItem('farmdirect_last_customer_email', res.user.email);
        }
      }
    } catch (err) {
      console.error('Failed to fetch profile:', err);
      clearActiveToken();
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchProfile(token);
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = async (credentials: any) => {
    const res = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });

    if (res.success) {
      const loggedUser: User = res.user;
      const newToken: string = res.token;

      if (loggedUser.role === 'customer') {
        localStorage.setItem('farmdirect_last_customer_email', loggedUser.email);
      }

      // Store old token by current user's role so it's preserved
      if (user && user.role !== loggedUser.role) {
        const oldToken = getActiveToken();
        if (oldToken) {
          setRoleToken(user.role, oldToken);
        }
      }

      // Set the new active token
      setActiveToken(newToken);
      setRoleToken(loggedUser.role, newToken);
      setToken(newToken);
      setUser(loggedUser);
      return loggedUser;
    } else {
      throw new Error(res.message);
    }
  };

  const register = async (data: any) => {
    const res = await apiFetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    if (res.success) {
      const loggedUser: User = res.user;
      const newToken: string = res.token;

      // Preserve old token by role
      if (user && user.role !== loggedUser.role) {
        const oldToken = getActiveToken();
        if (oldToken) {
          setRoleToken(user.role, oldToken);
        }
      }

      setActiveToken(newToken);
      setRoleToken(loggedUser.role, newToken);
      setToken(newToken);
      setUser(loggedUser);
      return loggedUser;
    } else {
      throw new Error(res.message || 'Registration failed.');
    }
  };

  const logout = () => {
    if (user) {
      removeRoleToken(user.role);
    }
    clearActiveToken();
    setToken(null);
    setUser(null);
  };

  const updateUserLocal = (updated: Partial<User>) => {
    if (user) {
      setUser({ ...user, ...updated });
    }
  };

  const refetchUser = async () => {
    await fetchProfile();
  };

  const refreshUser = async () => {
    await fetchProfile();
  };

  const updateUser = (updated: Partial<User>) => {
    if (user) {
      setUser({ ...user, ...updated });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        logout,
        refetchUser,
        refreshUser,
        updateUserLocal,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
