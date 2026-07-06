import { ThemeToggle } from "@/components/ThemeToggle";
import { GlobalSearch } from "@/components/GlobalSearch";

export function TopBar() {
  return (
    <header className="sticky top-0 z-10 flex items-center gap-4 border-b border-border bg-bg/80 px-6 py-3 backdrop-blur">
      <div className="flex-1">
        <GlobalSearch />
      </div>
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-sm font-semibold text-brand-fg">
          CC
        </div>
      </div>
    </header>
  );
}
