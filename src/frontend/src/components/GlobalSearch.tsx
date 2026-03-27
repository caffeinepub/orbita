import { useNavigate } from "@tanstack/react-router";
import {
  Building2,
  CheckSquare,
  Search,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Company, Contact, Deal, Task } from "../backend.d";
import { useActor } from "../hooks/useActor";

interface SearchResults {
  contacts: Contact[];
  companies: Company[];
  deals: Deal[];
  tasks: Task[];
}

interface GlobalSearchProps {
  open: boolean;
  onClose: () => void;
}

export default function GlobalSearch({ open, onClose }: GlobalSearchProps) {
  const navigate = useNavigate();
  const { actor } = useActor();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setResults(null);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const doSearch = useCallback(
    async (q: string) => {
      if (!actor || !q.trim()) {
        setResults(null);
        return;
      }
      setLoading(true);
      try {
        const [contacts, allCompanies, allDeals, allTasks] = await Promise.all([
          actor.searchContacts(q),
          actor.listCompanies(),
          actor.listDeals(),
          actor.listTasks(),
        ]);
        const ql = q.toLowerCase();
        const companies = allCompanies.filter(
          (c) =>
            c.name.toLowerCase().includes(ql) ||
            c.industry.toLowerCase().includes(ql),
        );
        const deals = allDeals.filter(
          (d) =>
            d.title.toLowerCase().includes(ql) ||
            d.companyName.toLowerCase().includes(ql) ||
            d.contactName.toLowerCase().includes(ql),
        );
        const tasks = allTasks.filter(
          (t) =>
            t.title.toLowerCase().includes(ql) ||
            t.description.toLowerCase().includes(ql),
        );
        setResults({
          contacts: contacts.slice(0, 5),
          companies: companies.slice(0, 5),
          deals: deals.slice(0, 5),
          tasks: tasks.slice(0, 5),
        });
      } catch (e) {
        console.error("Search error", e);
      } finally {
        setLoading(false);
      }
    },
    [actor],
  );

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!query.trim()) {
      setResults(null);
      return;
    }
    timerRef.current = setTimeout(() => doSearch(query), 300);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query, doSearch]);

  function handleBackdropKey(e: React.KeyboardEvent) {
    if (e.key === "Escape") onClose();
  }

  function handleInputKey(e: React.KeyboardEvent) {
    if (e.key === "Escape") onClose();
  }

  function goTo(path: string) {
    onClose();
    navigate({ to: path as any });
  }

  const total =
    (results?.contacts.length ?? 0) +
    (results?.companies.length ?? 0) +
    (results?.deals.length ?? 0) +
    (results?.tasks.length ?? 0);

  const hasResults = results !== null && total > 0;
  const noResults = results !== null && total === 0 && !loading;

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4"
      onKeyDown={handleBackdropKey}
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close search"
        className="absolute inset-0 bg-black/50 backdrop-blur-sm w-full"
        onClick={onClose}
        data-ocid="global_search.modal"
      />

      {/* Panel */}
      <div
        className="relative w-full max-w-xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
        aria-label="Global search"
      >
        {/* Input row */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Search size={16} className="text-muted-foreground flex-shrink-0" />
          <input
            ref={inputRef}
            data-ocid="global_search.search_input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleInputKey}
            placeholder="Search contacts, companies, deals, tasks..."
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
          />
          {loading && (
            <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin flex-shrink-0" />
          )}
          <button
            type="button"
            onClick={onClose}
            data-ocid="global_search.close_button"
            className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
            aria-label="Close search"
          >
            <X size={16} />
          </button>
        </div>

        {/* Results */}
        {hasResults && (
          <div className="max-h-[420px] overflow-y-auto">
            {results!.contacts.length > 0 && (
              <ResultGroup
                icon={<Users size={12} />}
                label="Contacts"
                items={results!.contacts.map((c) => ({
                  key: c.id,
                  primary: c.name,
                  secondary: c.company || c.role || "Contact",
                  onClick: () => goTo(`/contacts/${c.id}`),
                }))}
              />
            )}
            {results!.companies.length > 0 && (
              <ResultGroup
                icon={<Building2 size={12} />}
                label="Companies"
                items={results!.companies.map((c) => ({
                  key: c.id,
                  primary: c.name,
                  secondary: c.industry || "Company",
                  onClick: () => goTo(`/companies/${c.id}`),
                }))}
              />
            )}
            {results!.deals.length > 0 && (
              <ResultGroup
                icon={<TrendingUp size={12} />}
                label="Deals"
                items={results!.deals.map((d) => ({
                  key: d.id,
                  primary: d.title,
                  secondary: d.stage,
                  onClick: () => goTo(`/deals/${d.id}`),
                }))}
              />
            )}
            {results!.tasks.length > 0 && (
              <ResultGroup
                icon={<CheckSquare size={12} />}
                label="Tasks"
                items={results!.tasks.map((t) => ({
                  key: t.id,
                  primary: t.title,
                  secondary: t.dueDate
                    ? new Date(Number(t.dueDate)).toLocaleDateString()
                    : "No due date",
                  onClick: () => goTo("/tasks"),
                }))}
              />
            )}
          </div>
        )}

        {noResults && (
          <div
            data-ocid="global_search.empty_state"
            className="px-4 py-8 text-center text-sm text-muted-foreground"
          >
            No results for &ldquo;{query}&rdquo;
          </div>
        )}

        {!query.trim() && (
          <div className="px-4 py-5 text-center text-xs text-muted-foreground">
            Type to search across all records &middot; Press{" "}
            <kbd className="bg-secondary px-1.5 py-0.5 rounded text-[10px] font-mono">
              Esc
            </kbd>{" "}
            to close
          </div>
        )}
      </div>
    </div>
  );
}

interface ResultItem {
  key: string;
  primary: string;
  secondary: string;
  onClick: () => void;
}

function ResultGroup({
  icon,
  label,
  items,
}: {
  icon: React.ReactNode;
  label: string;
  items: ResultItem[];
}) {
  return (
    <div>
      <div className="flex items-center gap-2 px-4 py-2 bg-secondary/50">
        <span className="text-muted-foreground">{icon}</span>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
      </div>
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          onClick={item.onClick}
          className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-secondary/60 transition-colors group"
        >
          <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors truncate flex-1">
            {item.primary}
          </span>
          <span className="text-xs text-muted-foreground ml-3 flex-shrink-0">
            {item.secondary}
          </span>
        </button>
      ))}
    </div>
  );
}
