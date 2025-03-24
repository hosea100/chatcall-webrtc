"use client";

import type { ReactNode } from "react";
import { AuthProvider } from "@/hooks/use-auth";
import { Provider } from "react-redux";
import { store } from "@/lib/redux/store";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <Provider store={store}>
      <AuthProvider>{children}</AuthProvider>
    </Provider>
  );
}
