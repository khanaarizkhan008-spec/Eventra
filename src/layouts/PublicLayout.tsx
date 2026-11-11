import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/utils/cn";
import { AlertTriangle } from "lucide-react";

interface PublicIntroContextValue {
  introMode: boolean;
  navbarVisible: boolean;
  revealNavbar: () => void;
}

const PublicIntroContext = createContext<PublicIntroContextValue>({
  introMode: false,
  navbarVisible: true,
  revealNavbar: () => {},
});

export function usePublicIntro() {
  return useContext(PublicIntroContext);
}

export function PublicLayout({
  children,
  introMode = false,
}: {
  children: ReactNode;
  introMode?: boolean;
}) {
  const { isConfigured } = useAuth();
  const reduce = useReducedMotion();
  const [navbarVisible, setNavbarVisible] = useState(!introMode || Boolean(reduce));

  useEffect(() => {
    if (!introMode || reduce) {
      setNavbarVisible(true);
    }
  }, [introMode, reduce]);

  const revealNavbar = useCallback(() => {
    setNavbarVisible(true);
  }, []);

  return (
    <PublicIntroContext.Provider value={{ introMode, navbarVisible, revealNavbar }}>
      <div className="flex min-h-[100dvh] flex-col bg-[#09090B] text-white">
        <motion.div
          className={cn("sticky top-0 z-40", !navbarVisible && "pointer-events-none")}
          initial={introMode && !reduce ? { y: -76, opacity: 0 } : false}
          animate={navbarVisible ? { y: 0, opacity: 1 } : { y: -76, opacity: 0 }}
          transition={{ duration: 0.72, ease: [0.22, 1, 0.36, 1] }}
        >
          <Navbar />
        </motion.div>

        {!isConfigured && navbarVisible && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="border-b border-amber-500/20 bg-amber-500/10 px-4 py-2.5 text-center text-xs text-amber-200"
          >
            <span className="inline-flex items-center gap-2">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
              Supabase environment variables (`VITE_SUPABASE_URL` & `VITE_SUPABASE_ANON_KEY`) are not configured yet. Configure `frontend/.env.local` to connect live database, auth, and Cashfree sandbox payments.
            </span>
          </motion.div>
        )}

        <motion.main
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="flex-1"
        >
          {children}
        </motion.main>

        <motion.div
          initial={false}
          animate={navbarVisible ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Footer />
        </motion.div>
      </div>
    </PublicIntroContext.Provider>
  );
}

