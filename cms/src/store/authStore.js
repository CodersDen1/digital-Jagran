import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const SESSION_DURATION = 3 * 60 * 60 * 1000; // 3 hours in milliseconds

const useAuthStore = create(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      user: null,
      loginTime: null,

      login: (email) => {
        const loginTime = Date.now();
        set({
          isAuthenticated: true,
          user: { email },
          loginTime,
        });
      },

      logout: () => {
        set({
          isAuthenticated: false,
          user: null,
          loginTime: null,
        });
      },

      checkSession: () => {
        const { loginTime, isAuthenticated } = get();
        
        if (!isAuthenticated || !loginTime) {
          return false;
        }

        const currentTime = Date.now();
        const sessionExpired = currentTime - loginTime > SESSION_DURATION;

        if (sessionExpired) {
          get().logout();
          return false;
        }

        return true;
      },

      getSessionTimeRemaining: () => {
        const { loginTime, isAuthenticated } = get();
        
        if (!isAuthenticated || !loginTime) {
          return 0;
        }

        const currentTime = Date.now();
        const elapsed = currentTime - loginTime;
        const remaining = SESSION_DURATION - elapsed;

        return Math.max(0, remaining);
      },
    }),
    {
      name: 'cms-auth-storage',
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        user: state.user,
        loginTime: state.loginTime,
      }),
    }
  )
);

export default useAuthStore;
