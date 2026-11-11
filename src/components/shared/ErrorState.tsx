import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ErrorState({
  title = "Unable to load data",
  message,
  onRetry,
}: {
  title?: string;
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-rose-500/20 bg-[#141419] px-6 py-12 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-500/10 text-rose-400">
        <AlertTriangle className="h-5 w-5" />
      </div>
      <h3 className="mt-4 text-base font-semibold text-white">{title}</h3>
      <p className="mt-1.5 max-w-md text-sm text-[#A1A1AA]">{message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry} className="mt-5">
          <RotateCcw className="h-3.5 w-3.5" />
          Retry
        </Button>
      )}
    </div>
  );
}

