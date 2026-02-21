import React, { createContext, useContext, useState, useEffect } from "react";
import { API_BASE } from "../lib/api"; // make sure this points to your API config

// -------------------------
// Types
// -------------------------
interface User {
  userId: string; // Must match your backend field
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

// -------------------------
// Provider
// -------------------------
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load stored user from AsyncStorage/localStorage if needed
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  // -------------------------
  // Sync user with backend
  // -------------------------
  const syncUser = async (userData: User) => {
    try {
      const res = await fetch(`${API_BASE}/api/users/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: userData.userId,
          name: userData.name,
          wallet: userData.wallet || "",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Sync failed");
      console.log("✅ User synced:", data);
    } catch (err: any) {
      console.warn("User sync failed:", err.message);
    }
  };

  // -------------------------
  // Sign in
  // -------------------------
  const signIn = async (userData: User) => {
    setUser(userData);
    await syncUser(userData); // sync immediately after login
  };

  const signOut = () => setUser(null);

  return (
    <AuthContext.Provider value={{ user, isLoading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

// -------------------------
// Hook
// -------------------------
export const useAuth = () => useContext(AuthContext);