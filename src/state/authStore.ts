import { create } from "zustand";
import type { AuthUser } from "@/types/auth";
import { fetchCurrentUser } from "@/lib/api";

const TOKEN_KEY = "vhm_bearer_token";

/** When true in development, auto-login with a mock user so Kaiko Dashboard need not run. */
const DEV_BYPASS_AUTH =
  process.env.NODE_ENV === "development" &&
  process.env.NEXT_PUBLIC_VHM_DEV_BYPASS_AUTH === "true";

const DEV_BYPASS_USER: AuthUser = {
  id: "dev-bypass",
  email: "dev@local",
  first_name: "Dev",
  last_name: "User",
};

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  isInitialized: boolean;
}

interface AuthActions {
  initialize: () => Promise<void>;
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState & AuthActions>((set) => ({
  token: null,
  user: null,
  isInitialized: false,

  initialize: async () => {
    if (typeof window === "undefined") {
      set({ isInitialized: true });
      return;
    }
    if (DEV_BYPASS_AUTH) {
      set({
        token: "dev-bypass",
        user: DEV_BYPASS_USER,
        isInitialized: true,
      });
      return;
    }
    const token = sessionStorage.getItem(TOKEN_KEY);
    if (!token) {
      set({ token: null, user: null, isInitialized: true });
      return;
    }
    try {
      const user = await fetchCurrentUser(token);
      set({ token, user, isInitialized: true });
    } catch {
      sessionStorage.removeItem(TOKEN_KEY);
      set({ token: null, user: null, isInitialized: true });
    }
  },

  login: (token, user) => {
    sessionStorage.setItem(TOKEN_KEY, token);
    set({ token, user });
  },

  logout: () => {
    sessionStorage.removeItem(TOKEN_KEY);
    set({ token: null, user: null });
  },
}));
