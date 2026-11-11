import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";

export type ToastVariant = "success" | "error" | "info";

interface ToastItem {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  toast: (opts: { title: string; description?: string; variant?: ToastVariant }) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback(
    ({
      title,
      description,
      variant = "info",
    }: {
      title: string;
      description?: string;
      variant?: ToastVariant;
    }) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setItems((prev) => [...prev.slice(-3), { id, title, description, variant }]);
      window.setTimeout(() => {
        dismiss(id);
      }, 4800);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="pointer-events-none fixed bottom-5 right-5 z-50 flex w-full max-w-sm flex-col gap-2.5 px-4 sm:px-0">
        <AnimatePresence mode="popLayout">
          {items.map((item) => {
            const Icon =
              item.variant === "success"
                ? CheckCircle2
                : item.variant === "error"
                  ? AlertCircle
                  : Info;
            const accent =
              item.variant === "success"
                ? "text-emerald-400 border-emerald-500/30"
                : item.variant === "error"
                  ? "text-rose-400 border-rose-500/30"
                  : "text-[#A78BFA] border-[#A78BFA]/30";

            return (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 18, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 12, scale: 0.96 }}
                transition={{ type: "spring", stiffness: 280, damping: 24 }}
                className={`pointer-events-auto flex items-start gap-3 rounded-2xl border bg-[#141419]/95 p-4 shadow-2xl shadow-black/50 backdrop-blur-xl ${accent}`}
              >
                <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-white">{item.title}</p>
                  {item.description && (
                    <p className="mt-0.5 text-xs leading-relaxed text-[#A1A1AA]">
                      {item.description}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => dismiss(item.id)}
                  className="rounded-lg p-1 text-[#A1A1AA] transition-colors hover:bg-white/5 hover:text-white"
                  aria-label="Close notification"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

