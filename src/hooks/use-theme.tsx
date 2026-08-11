import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { usePreferences, useUpdatePreferences, type ThemeChoice } from "./use-preferences";
import { useAuth } from "./use-auth";

const STORAGE_KEY = "dominus.theme";

interface ThemeContextValue {
  theme: ThemeChoice;
  resolvedTheme: "light" | "dark";
  setTheme: (t: ThemeChoice) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function readStoredTheme(): ThemeChoice {
  if (typeof window === "undefined") return "system";
  const v = window.localStorage.getItem(STORAGE_KEY);
  if (v === "light" || v === "dark" || v === "system") return v;
  return "system";
}

function resolve(theme: ThemeChoice): "light" | "dark" {
  if (theme === "system") {
    if (typeof window === "undefined") return "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return theme;
}

function applyTheme(resolved: "light" | "dark") {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.toggle("dark", resolved === "dark");
  root.style.colorScheme = resolved;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeChoice>("system");
  const [resolved, setResolved] = useState<"light" | "dark">("dark");
  const { user } = useAuth();
  const { data: prefs } = usePreferences();
  const updatePrefs = useUpdatePreferences();

  // Bootstrap: local, então sync com remoto quando disponível
  useEffect(() => {
    const initial = readStoredTheme();
    setThemeState(initial);
  }, []);

  // ThemeProvider é montado uma única vez na raiz e sobrevive a login/logout
  // (troca de rota client-side, sem reload) — sem isso, o tema explícito do
  // usuário que acabou de sair ficaria visível (na tela de login, e por um
  // instante na sessão do próximo usuário até as preferências dele
  // carregarem). Só reseta numa transição real logado→deslogado, nunca no
  // mount inicial (onde `user` também começa null, mas aí o valor do
  // localStorage É o bootstrap legítimo pré-autenticação).
  const prevUserIdRef = useRef<string | null>(null);
  useEffect(() => {
    const prevUserId = prevUserIdRef.current;
    prevUserIdRef.current = user?.id ?? null;
    if (prevUserId && !user) {
      if (typeof window !== "undefined") window.localStorage.removeItem(STORAGE_KEY);
      setThemeState("system");
    }
  }, [user]);

  useEffect(() => {
    if (prefs?.theme) {
      setThemeState(prefs.theme);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(STORAGE_KEY, prefs.theme);
      }
    }
  }, [prefs?.theme]);

  useEffect(() => {
    const r = resolve(theme);
    setResolved(r);
    applyTheme(r);
    if (theme === "system" && typeof window !== "undefined") {
      const mql = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = () => {
        const nr = resolve("system");
        setResolved(nr);
        applyTheme(nr);
      };
      mql.addEventListener("change", handler);
      return () => mql.removeEventListener("change", handler);
    }
  }, [theme]);

  const setTheme = useCallback(
    (t: ThemeChoice) => {
      setThemeState(t);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(STORAGE_KEY, t);
      }
      if (user) {
        updatePrefs.mutate({ theme: t });
      }
    },
    [user, updatePrefs],
  );

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme: resolved, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme deve ser usado dentro de <ThemeProvider>");
  return ctx;
}
