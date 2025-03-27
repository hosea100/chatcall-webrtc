"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { loginUser, logout } from "@/lib/redux/slices/authSlice";
import { cleanupMedia } from "@/helpers/media-helpers";
import { User } from "@/types/user";

type AuthContextType = {
  token: string | null;
  user: User | null;
  login: (name: string, room: string) => Promise<void>;
  logout: () => void;
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const dispatch = useAppDispatch();
  const { token, user, status, error } = useAppSelector((state) => state.auth);

  const handleLogin = async (name: string, room: string) => {
    await dispatch(loginUser({ name, room })).unwrap();
  };

  const handleLogout = () => {
    // Clean up media resources before logging out
    cleanupMedia();
    dispatch(logout());
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        login: handleLogin,
        logout: handleLogout,
        status,
        error,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
