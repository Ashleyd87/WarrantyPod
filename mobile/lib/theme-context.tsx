import React, { createContext, useCallback, useContext, useState } from "react";
import * as SecureStore from "expo-secure-store";
import { api } from "./api";
import { THEMES, type AccentTokens, type ThemeName } from "./theme";

const THEME_KEY = "warranty-vault.theme";

/** Coerce any stored value (incl. the retired "violet") to a valid theme. */
function normalize(v: string | null | undefined): ThemeName | null {
  if (v === "lime" || v === "periwinkle" || v === "mono") return v;
  if (v === "violet") return "lime"; // legacy default from the previous design
  return null;
}

interface ThemeContextValue {
  themeName: ThemeName;
  t: AccentTokens;
  /** Instant local switch + persist (SecureStore + server settings). */
  setTheme: (name: ThemeName) => void;
  /** Adopt the server-stored preference without re-persisting. */
  syncFromServer: (name: string | undefined) => void;
}

function cachedTheme(): ThemeName {
  try {
    const v = normalize(SecureStore.getItem(THEME_KEY));
    if (v) return v;
  } catch {
    // First launch / no secure store — fall through to default.
  }
  return "lime";
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeName, setThemeName] = useState<ThemeName>(cachedTheme);

  const setTheme = useCallback((name: ThemeName) => {
    setThemeName(name);
    try {
      SecureStore.setItem(THEME_KEY, name);
    } catch {
      // non-fatal
    }
    // Persist per account; fire-and-forget.
    api("/api/settings", {
      method: "PATCH",
      body: JSON.stringify({ theme: name }),
    }).catch(() => {});
  }, []);

  const syncFromServer = useCallback((name: string | undefined) => {
    const v = normalize(name);
    if (v) {
      setThemeName((current) => {
        if (current !== v) {
          try {
            SecureStore.setItem(THEME_KEY, v);
          } catch {}
        }
        return v;
      });
    }
  }, []);

  return (
    <ThemeContext.Provider
      value={{ themeName, t: THEMES[themeName], setTheme, syncFromServer }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme outside ThemeProvider");
  return ctx;
}
