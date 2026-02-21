import React, { createContext, useContext, useState, useEffect } from "react";

// 1. Updated to match your Backend (index.js)
interface User {
  id: string; // Changed from 'id' to 'userId'
  name: string;
  wallet?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean; // Changed from 'loading' to 'isLoading' to match your _layout.tsx
  signIn: (userData: User) => void;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  signIn: () => {},
  signOut: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Matches the new name

  useEffect(() => {
    // For the Hackathon: Simulate checking for an existing session
    const timer = setTimeout(() => {
      // Logic: If there's a stored user in local storage, load it here
      setIsLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const signIn = (userData: User) => {
    setUser(userData);
  };

  const signOut = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to use the auth state
export const useAuth = () => useContext(AuthContext);