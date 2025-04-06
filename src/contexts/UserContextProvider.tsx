import React, { createContext, useState, useEffect } from "react";
import axios from "axios";

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
        // Try to get current user from API
        const response = await axios.get(
          `${process.env.VITE_API_URL}/auth/me`,
          {
            withCredentials: true,
          },
        );

        setUser(response.data);
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

      // Call login API
      const response = await axios.post(
        `${process.env.VITE_API_URL}/auth/login`,
        { email, password },
        { withCredentials: true },
      );

      // Set user from response
      setUser(response.data.user);

      // Store token in localStorage for API requests
      localStorage.setItem("token", response.data.token);

      // Configure axios to use token for future requests
      axios.defaults.headers.common["Authorization"] =
        `Bearer ${response.data.token}`;
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

      // Call logout API
      await axios.post(
        `${process.env.VITE_API_URL}/auth/logout`,
        {},
        { withCredentials: true },
      );

      // Clear user state
      setUser(null);

      // Remove token from localStorage
      localStorage.removeItem("token");

      // Remove Authorization header
      delete axios.defaults.headers.common["Authorization"];
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
