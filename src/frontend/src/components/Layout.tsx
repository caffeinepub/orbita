import { Outlet } from "@tanstack/react-router";
import { Menu, Search } from "lucide-react";
import { useState } from "react";
import GlobalSearch from "./GlobalSearch";
import Sidebar from "./Sidebar";

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Mobile overlay backdrop */}
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 bg-black/40 z-20 md:hidden w-full h-full cursor-default"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-30 transition-transform duration-300 md:static md:translate-x-0 md:z-auto ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile top bar */}
        <div className="md:hidden flex items-center gap-3 px-4 py-3 bg-card border-b border-border">
          <button
            type="button"
            data-ocid="layout.open_modal_button"
            onClick={() => setSidebarOpen(true)}
            className="text-foreground/80 hover:text-foreground transition-colors"
            aria-label="Open navigation"
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2 flex-1">
            <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center">
              <span className="text-primary-foreground text-xs font-bold">
                O
              </span>
            </div>
            <span className="text-sm font-semibold text-foreground tracking-tight">
              Orbita
            </span>
          </div>
          <button
            type="button"
            data-ocid="layout.command_palette_open"
            onClick={() => setSearchOpen(true)}
            className="text-foreground/60 hover:text-foreground transition-colors"
            aria-label="Open search"
          >
            <Search size={18} />
          </button>
        </div>

        {/* Desktop top bar */}
        <div className="hidden md:flex items-center justify-end px-6 py-3 border-b border-border bg-card">
          <button
            type="button"
            data-ocid="layout.command_palette_open"
            onClick={() => setSearchOpen(true)}
            className="flex items-center gap-2 pl-3 pr-4 py-2 text-sm text-muted-foreground border border-border rounded-lg bg-secondary/40 hover:bg-secondary transition-colors"
            aria-label="Search"
          >
            <Search size={14} />
            <span>Search...</span>
            <kbd className="ml-2 text-[10px] bg-card border border-border rounded px-1.5 py-0.5 font-mono hidden lg:inline">
              ⌘K
            </kbd>
          </button>
        </div>

        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>

      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
