import React, { createContext, useContext, useState, useEffect } from "react";

// 1. Define the shape of our user data
interface User {
  id: string;
  name: string;
  wallet?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (userData: User) => void;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signIn: () => {},
  signOut: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // For the Hackathon: Simulate checking for an existing session
    const timer = setTimeout(() => {
      // Logic: If there's a stored user in local storage, load it here
      setLoading(false);
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
    <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to use the auth state
export const useAuth = () => useContext(AuthContext);