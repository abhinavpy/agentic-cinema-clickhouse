import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

function LoadingBox({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-xl border border-border bg-card",
        className
      )}
    >
      <Spinner className="size-6 text-muted-foreground" />
    </div>
  );
}

export default LoadingBox;
