import React, { createContext, useState, useEffect } from "react";
import { getCurrentUser, login as apiLogin, logout as apiLogout } from "../api";

type Props = {
  children: React.ReactNode;
};

interface User {
  id: number;
  name: string;
  email?: string;
}

export type UserContext = {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
};

export const UserContext = createContext<UserContext>({} as UserContext);

export const UserContextProvider = ({ children }: Props) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Check if user is already logged in on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Try to get current user from API using our helper
        const userData = await getCurrentUser();
        setUser(userData);
      } catch (error) {
        // If not authenticated, clear user
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setLoading(true);

      // Call login API using our helper
      const response = await apiLogin(email, password);
      
      // Set user from response
      setUser(response.user);
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);

      // Call logout API using our helper
      await apiLogout();
      
      // Clear user state
      setUser(null);
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <UserContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </UserContext.Provider>
  );
};
