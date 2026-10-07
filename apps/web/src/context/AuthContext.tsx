import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { UserProfile, ProfileCompleteness, calculateProfileCompleteness } from '@applyflow/types';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  image?: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  profile: UserProfile | null;
  completion: ProfileCompleteness | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  loginWithGoogle: (credential: string) => Promise<{ success: boolean; isNewUser?: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  saveProfile: (partial: Partial<UserProfile>) => Promise<UserProfile | null>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [completion, setCompletion] = useState<ProfileCompleteness | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const refreshSession = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/session', {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        credentials: 'include'
      });

      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        if (data.authenticated && data.user) {
          setUser(data.user);
          setProfile(data.profile || null);
          setCompletion(data.completion || (data.profile ? calculateProfileCompleteness(data.profile) : null));
          setIsAuthenticated(true);
          return;
        }
      }

      // Not authenticated, session expired, or non-JSON/404 response
      setUser(null);
      setProfile(null);
      setCompletion(null);
      setIsAuthenticated(false);
    } catch (err: any) {
      console.error('[AuthContext] Failed to restore session:', err);
      setUser(null);
      setProfile(null);
      setCompletion(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  const loginWithGoogle = async (credential: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ credential })
      });

      const contentType = res.headers.get('content-type') || '';
      const isJson = contentType.includes('application/json');

      if (!res.ok) {
        let msg = `Authentication request failed (${res.status})`;
        if (isJson) {
          try {
            const errData = await res.json();
            msg = errData.error?.message || errData.message || msg;
          } catch {
            // Ignore parse failure on error body
          }
        } else {
          const rawText = await res.text();
          console.warn('[AuthContext] Non-JSON error response received:', rawText.slice(0, 120));
        }
        setError(msg);
        setIsLoading(false);
        return { success: false, error: msg };
      }

      if (!isJson) {
        const rawText = await res.text();
        console.warn('[AuthContext] Expected JSON but received:', rawText.slice(0, 120));
        const msg = `Unexpected server response format (${res.status})`;
        setError(msg);
        setIsLoading(false);
        return { success: false, error: msg };
      }

      const data = await res.json();

      if (!data.success) {
        const msg = data.error?.message || 'Google sign-in failed. Please try again.';
        setError(msg);
        setIsLoading(false);
        return { success: false, error: msg };
      }

      setUser(data.user);
      setProfile(data.profile);
      setCompletion(data.completion || calculateProfileCompleteness(data.profile));
      setIsAuthenticated(true);
      setIsLoading(false);

      return {
        success: true,
        isNewUser: data.isNewUser
      };
    } catch (err: any) {
      const msg = err.message || 'Network error during Google sign-in. Please try again.';
      setError(msg);
      setIsLoading(false);
      return { success: false, error: msg };
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Accept': 'application/json' },
        credentials: 'include'
      });
    } catch (err) {
      console.error('[AuthContext] Error logging out:', err);
    } finally {
      setUser(null);
      setProfile(null);
      setCompletion(null);
      setIsAuthenticated(false);
      setError(null);
    }
  };

  const saveProfile = async (partial: Partial<UserProfile>): Promise<UserProfile | null> => {
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(partial)
      });

      const contentType = res.headers.get('content-type') || '';
      if (!res.ok || !contentType.includes('application/json')) {
        throw new Error(`Failed to save profile (${res.status})`);
      }

      const data = await res.json();
      const updatedProfile = data.data?.profile || data.profile;
      if (updatedProfile) {
        setProfile(updatedProfile);
        setCompletion(data.data?.completion || calculateProfileCompleteness(updatedProfile));
        return updatedProfile;
      }
      return null;
    } catch (err: any) {
      console.error('[AuthContext] Error saving profile:', err);
      return null;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        completion,
        isAuthenticated,
        isLoading,
        error,
        loginWithGoogle,
        logout,
        refreshSession,
        saveProfile,
        clearError: () => setError(null)
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
