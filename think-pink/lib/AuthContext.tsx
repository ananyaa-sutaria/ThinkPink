import React, { createContext, useContext, useEffect, useState } from "react";
import { API_BASE } from "../lib/api";

interface User {
  userId: string;
  name: string;
  wallet?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  signIn: (userData: User) => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  signIn: async () => {},
  signOut: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 300);
    return () => clearTimeout(timer);
  }, []);

  const syncUser = async (userData: User) => {
    try {
      const res = await fetch(`${API_BASE}/api/users/sync`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true",
        },
        body: JSON.stringify({
          userId: userData.userId,
          name: userData.name,
          wallet: userData.wallet || "",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Sync failed");
    } catch (err: any) {
      console.warn("User sync failed:", err?.message || err);
    }
  };

  const signIn = async (userData: User) => {
    setUser(userData);
    await syncUser(userData);
  };

  const signOut = () => {
    setUser(null);
  };

  return <AuthContext.Provider value={{ user, isLoading, signIn, signOut }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
