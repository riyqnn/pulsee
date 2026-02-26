import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { supabase } from '../utils/supabase';
import type { User } from '@supabase/supabase-js';

interface UserProfile {
  id: string;
  email: string;
  wallet_address: string | null;
  default_origin_city: string | null; 
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loginGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  linkWallet: (walletAddress: string) => Promise<void>;
  updateOriginCity: (city: string) => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // //NEW: Fungsi rahasia buat ngirim Token Google ke Database Backend
  const saveGoogleTokens = async (userId: string, accessToken: string, refreshToken?: string) => {
    try {
      await supabase.from('user_profiles').update({
        google_access_token: accessToken,
        // Refresh token mungkin undefined tergantung settingan GCP lo, tapi tetep kita tangkep kalo ada
        ...(refreshToken ? { google_refresh_token: refreshToken } : {})
      }).eq('id', userId);
      console.log("🔐 [AuthContext] Google Token synced to Database!");
    } catch (e) {
      console.error("Failed to sync Google Token", e);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
        // //NEW: Nangkep token pas load awal
        if (session.provider_token) {
            saveGoogleTokens(
                session.user.id, 
                session.provider_token, 
                session.provider_refresh_token ?? undefined
            );
        }
      } else {
        setIsLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
        // //NEW: Nangkep token pas user baru aja login
        if (session.provider_token) {
            saveGoogleTokens(
                session.user.id, 
                session.provider_token, 
                session.provider_refresh_token ?? undefined
            );
        }
      } else {
        setProfile(null);
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();
        
      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loginGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
        // //PENTING: Kita minta access ke events kalender (ini udah bener)
        scopes: 'https://www.googleapis.com/auth/calendar.events.readonly'
      }
    });
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  const linkWallet = async (walletAddress: string) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ wallet_address: walletAddress })
        .eq('id', user.id);
        
      if (error) throw error;
      setProfile(prev => prev ? { ...prev, wallet_address: walletAddress } : null);
    } catch (error) {
      console.error('Error linking wallet:', error);
      throw error;
    }
  };

  const updateOriginCity = async (city: string) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ default_origin_city: city })
        .eq('id', user.id);
        
      if (error) throw error;
      setProfile(prev => prev ? { ...prev, default_origin_city: city } : null);
    } catch (error) {
      console.error('Error updating origin city:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loginGoogle, logout, linkWallet, updateOriginCity, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};