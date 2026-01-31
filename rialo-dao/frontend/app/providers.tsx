"use client";

import '@rainbow-me/rainbowkit/styles.css';
import { getDefaultConfig, RainbowKitProvider, lightTheme, darkTheme } from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import { baseSepolia } from 'wagmi/chains';
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import React, { createContext, useContext, useState, useEffect } from 'react';

// --- CONFIGURATION ---
const config = getDefaultConfig({
  appName: 'Rialo DAO',
  projectId: 'YOUR_PROJECT_ID', 
  chains: [baseSepolia],
  ssr: true,
});

const queryClient = new QueryClient();

// --- THEME CONTEXT (The Brain) ---
type ThemeContextType = {
  isDark: boolean;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextType>({
  isDark: false,
  toggleTheme: () => {},
});

// Export this hook so pages can use it
export const useTheme = () => useContext(ThemeContext);

export function Providers({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  // 1. Load saved theme from browser memory
  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("rialo-theme");
    if (saved === "dark") setIsDark(true);
  }, []);

  // 2. Toggle function
  const toggleTheme = () => {
    setIsDark((prev) => {
      const newTheme = !prev;
      localStorage.setItem("rialo-theme", newTheme ? "dark" : "light");
      return newTheme;
    });
  };

  // Prevent hydration mismatch by waiting for mount
  if (!mounted) return null;

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <ThemeContext.Provider value={{ isDark, toggleTheme }}>
          <RainbowKitProvider 
            theme={isDark ? darkTheme({
                accentColor: '#e8e3d5',
                accentColorForeground: '#010101',
            }) : lightTheme({
                accentColor: '#010101',
                borderRadius: 'medium',
            })}
          >
            {children}
          </RainbowKitProvider>
        </ThemeContext.Provider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}