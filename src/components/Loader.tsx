import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoaderProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  text?: string;
  fullScreen?: boolean;
}

const sizeClasses = {
  sm: "h-6 w-6",
  md: "h-8 w-8",
  lg: "h-10 w-10",
  xl: "h-16 w-16",
};

const iconSizeClasses = {
  sm: "h-3 w-3",
  md: "h-4 w-4",
  lg: "h-5 w-5",
  xl: "h-8 w-8",
};

export function Loader({ size = "md", className, text, fullScreen = false }: LoaderProps) {
  const loaderContent = (
    <div className={cn("flex flex-col items-center justify-center gap-3", className)}>
      <div
        className={cn(
          "flex items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/60 shadow-md animate-pulse",
          sizeClasses[size]
        )}
      >
        <Sparkles className={cn("text-primary-foreground", iconSizeClasses[size])} />
      </div>
      {text && (
        <p className={cn(
          "text-muted-foreground",
          size === "sm" ? "text-xs" : size === "md" ? "text-sm" : "text-base"
        )}>
          {text}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-hero">
        {loaderContent}
      </div>
    );
  }

  return loaderContent;
}

