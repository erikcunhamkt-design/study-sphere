import { cn } from "@/lib/utils";
import { APP_CONFIG } from "@/lib/app-config";

interface AppBrandProps {
  isCollapsed?: boolean;
  className?: string;
}

export function AppBrand({ isCollapsed = false, className }: AppBrandProps) {
  return (
    <div className={cn("flex items-center gap-2", isCollapsed && "justify-center", className)}>
      <img
        src="/logo-dominus.png"
        alt={`${APP_CONFIG.name} Logo`}
        className="h-9 w-9 object-contain"
      />
      {!isCollapsed && (
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold tracking-tight">
            Dominus<span className="text-primary">App</span>
          </p>
          <p className="text-xs text-muted-foreground truncate">{APP_CONFIG.tagline}</p>
        </div>
      )}
    </div>
  );
}
