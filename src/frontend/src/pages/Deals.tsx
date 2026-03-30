import { useNavigate } from "@tanstack/react-router";
import {
  Activity,
  Clock,
  Download,
  Plus,
  Search,
  TrendingUp,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Stage } from "../backend.d";
import type { Deal } from "../backend.d";
import { useActor } from "../hooks/useActor";
import { exportCSV } from "../lib/csv";

const STAGES: Stage[] = [
  Stage.Lead,
  Stage.Qualified,
  Stage.Proposal,
  Stage.Negotiation,
  Stage.ClosedWon,
  Stage.ClosedLost,
];

const STAGE_LABELS: Record<Stage, string> = {
  [Stage.Lead]: "Lead",
  [Stage.Qualified]: "Qualified",
  [Stage.Proposal]: "Proposal",
  [Stage.Negotiation]: "Negotiation",
  [Stage.ClosedWon]: "Closed Won",
  [Stage.ClosedLost]: "Closed Lost",
};

const STAGE_COLORS: Record<
  Stage,
  { border: string; bg: string; text: string }
> = {
  [Stage.Lead]: {
    border: "border-slate-400",
    bg: "bg-slate-100",
    text: "text-slate-700",
  },
  [Stage.Qualified]: {
    border: "border-indigo-400",
    bg: "bg-indigo-50",
    text: "text-indigo-700",
  },
  [Stage.Proposal]: {
    border: "border-violet-400",
    bg: "bg-violet-50",
    text: "text-violet-700",
  },
  [Stage.Negotiation]: {
    border: "border-amber-400",
    bg: "bg-amber-50",
    text: "text-amber-700",
  },
  [Stage.ClosedWon]: {
    border: "border-emerald-500",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
  },
  [Stage.ClosedLost]: {
    border: "border-rose-400",
    bg: "bg-rose-50",
    text: "text-rose-700",
  },
};

function fmt(n: number) {
  if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}K`;
  return `$${n}`;
}

export default function Deals() {
  const navigate = useNavigate();
  const { actor, isFetching } = useActor();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<Stage | "all">("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkStage, setBulkStage] = useState<Stage | "">("");
  const [bulkWorking, setBulkWorking] = useState(false);
  const [stats, setStats] = useState({
    pipeline: 0,
    open: 0,
    overdue: 0,
    activities: 0,
  });

  const reload = useCallback(async () => {
    if (!actor) return;
    try {
      const [d, tasks, activities] = await Promise.all([
        actor.listDeals(),
        actor.listTasks(),
        actor.listActivities(),
      ]);
      setDeals(d);
      const open = d.filter(
        (x) => x.stage !== Stage.ClosedWon && x.stage !== Stage.ClosedLost,
      );
      const now = BigInt(Date.now());
      const overdue = tasks.filter(
        (t) => !t.completed && t.dueDate !== undefined && t.dueDate < now,
      ).length;
      setStats({
        pipeline: open.reduce((s, x) => s + x.value, 0),
        open: open.length,
        overdue,
        activities: activities.length,
      });
    } catch (e) {
      console.error("Failed to load deals", e);
    } finally {
      setLoading(false);
    }
  }, [actor]);

  useEffect(() => {
    if (!isFetching && actor) reload();
  }, [actor, isFetching, reload]);

  const filteredDeals = useMemo(() => {
    let result = deals;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (d) =>
          d.title.toLowerCase().includes(q) ||
          d.companyName.toLowerCase().includes(q) ||
          d.contactName.toLowerCase().includes(q),
      );
    }
    if (stageFilter !== "all") {
      result = result.filter((d) => d.stage === stageFilter);
    }
    return result;
  }, [deals, search, stageFilter]);

  function navigateToDeal(id: string) {
    navigate({ to: "/deals/$id", params: { id } });
  }

  function handleExport() {
    exportCSV(
      "deals.csv",
      deals.map((d) => ({
        Title: d.title,
        Company: d.companyName,
        Contact: d.contactName,
        Stage: STAGE_LABELS[d.stage],
        Value: d.value,
        Tags: d.tags.join(";"),
        Notes: d.notes,
      })),
    );
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === filteredDeals.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredDeals.map((d) => d.id)));
    }
  }

  async function handleBulkChangeStage() {
    if (!actor || !bulkStage || selectedIds.size === 0) return;
    setBulkWorking(true);
    try {
      await Promise.all(
        Array.from(selectedIds).map((id) => {
          const deal = deals.find((d) => d.id === id);
          if (!deal) return Promise.resolve();
          return actor.updateDeal(id, {
            title: deal.title,
            contactName: deal.contactName,
            value: deal.value,
            tags: deal.tags,
            stage: bulkStage as Stage,
            notes: deal.notes,
            companyName: deal.companyName,
            contactId: deal.contactId,
            companyId: deal.companyId,
            nextActivityDate: deal.nextActivityDate,
            nextActivityNote: deal.nextActivityNote,
            nextActivityType: deal.nextActivityType,
          });
        }),
      );
      setSelectedIds(new Set());
      setBulkStage("");
      await reload();
    } catch (e) {
      console.error("Bulk stage change failed", e);
    } finally {
      setBulkWorking(false);
    }
  }

  async function handleBulkDelete() {
    if (!actor || selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} selected deal(s)?`)) return;
    setBulkWorking(true);
    try {
      await Promise.all(
        Array.from(selectedIds).map((id) => actor.deleteDeal(id)),
      );
      setSelectedIds(new Set());
      await reload();
    } catch (e) {
      console.error("Bulk delete failed", e);
    } finally {
      setBulkWorking(false);
    }
  }

  const statCards = [
    {
      label: "Total Pipeline Value",
      value: fmt(stats.pipeline),
      icon: TrendingUp,
      color: "text-primary",
      bg: "bg-blue-50",
    },
    {
      label: "Open Deals",
      value: stats.open.toString(),
      icon: TrendingUp,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      label: "Overdue Tasks",
      value: stats.overdue.toString(),
      icon: Clock,
      color: "text-rose-500",
      bg: "bg-rose-50",
    },
    {
      label: "Activities",
      value: stats.activities.toString(),
      icon: Activity,
      color: "text-violet-600",
      bg: "bg-violet-50",
    },
  ];

  return (
    <div className="flex flex-col lg:flex-row h-full">
      <div className="flex-1 p-4 md:p-8 overflow-auto">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="font-heading text-xl font-semibold text-foreground">
              Deals
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {deals.length} deals
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              data-ocid="deals.secondary_button"
              onClick={handleExport}
              className="flex items-center gap-1.5 border border-border bg-card hover:bg-secondary text-sm text-foreground/80 font-medium px-3 py-2 rounded-lg transition-colors"
            >
              <Download size={14} /> Export CSV
            </button>
            <button
              type="button"
              data-ocid="deals.primary_button"
              onClick={() =>
                navigate({ to: "/deals/$id", params: { id: "new" } })
              }
              className="flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              <Plus size={14} /> New Deal
            </button>
          </div>
        </div>

        {/* Search + filter bar */}
        <div className="flex flex-wrap gap-2 mb-5">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              data-ocid="deals.search_input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search deals..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-lg bg-card focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <select
            data-ocid="deals.select"
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value as Stage | "all")}
            className="px-3 py-2 text-sm border border-border rounded-lg bg-card focus:outline-none appearance-none cursor-pointer"
          >
            <option value="all">All Stages</option>
            {STAGES.map((s) => (
              <option key={s} value={s}>
                {STAGE_LABELS[s]}
              </option>
            ))}
          </select>
        </div>

        {/* Stats bar on smaller screens */}
        <div className="lg:hidden grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {statCards.map((card) => (
            <div
              key={card.label}
              className="bg-card rounded-xl p-3 border border-border shadow-xs"
            >
              <div
                className={`inline-flex items-center justify-center w-7 h-7 rounded-lg ${card.bg} mb-1.5`}
              >
                <card.icon size={14} className={card.color} />
              </div>
              <div className="text-lg font-bold text-foreground">
                {card.value}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5 leading-tight">
                {card.label}
              </div>
            </div>
          ))}
        </div>

        {loading ? (
          <div
            data-ocid="deals.loading_state"
            className="py-10 text-center text-sm text-muted-foreground"
          >
            Loading...
          </div>
        ) : (
          <div className="bg-card rounded-xl border border-border shadow-xs overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-secondary">
                  <th className="px-4 py-3 w-10">
                    <input
                      type="checkbox"
                      data-ocid="deals.list.checkbox"
                      checked={
                        selectedIds.size > 0 &&
                        selectedIds.size === filteredDeals.length
                      }
                      onChange={toggleSelectAll}
                      className="rounded border-border cursor-pointer"
                    />
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Deal
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden sm:table-cell">
                    Company
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Stage
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">
                    Value
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden lg:table-cell">
                    Next Activity
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredDeals.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      data-ocid="deals.empty_state"
                      className="text-center py-10 text-sm text-muted-foreground"
                    >
                      No deals found.
                    </td>
                  </tr>
                ) : (
                  filteredDeals.map((deal, i) => {
                    const sc = STAGE_COLORS[deal.stage];
                    const checked = selectedIds.has(deal.id);
                    return (
                      <tr
                        key={deal.id}
                        data-ocid={`deals.list.item.${i + 1}`}
                        onClick={() => navigateToDeal(deal.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ")
                            navigateToDeal(deal.id);
                        }}
                        tabIndex={0}
                        className={`group hover:bg-secondary/50 transition-colors cursor-pointer outline-none focus:bg-secondary/50 ${checked ? "bg-primary/5" : ""}`}
                      >
                        <td
                          className="px-4 py-3 w-10"
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleSelect(deal.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="rounded border-border cursor-pointer"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm font-medium text-foreground">
                            {deal.title}
                          </div>
                          <div className="text-xs text-muted-foreground sm:hidden">
                            {deal.companyName}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-foreground/80 hidden sm:table-cell">
                          {deal.companyName || "—"}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full border ${sc.border} ${sc.bg} ${sc.text}`}
                          >
                            {STAGE_LABELS[deal.stage]}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-foreground hidden md:table-cell">
                          {fmt(deal.value)}
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          {deal.nextActivityDate ? (
                            <div className="text-xs">
                              <span className="text-foreground/80">
                                {new Date(
                                  Number(deal.nextActivityDate),
                                ).toLocaleDateString()}
                              </span>
                              {deal.nextActivityType && (
                                <span className="ml-1.5 text-muted-foreground">
                                  · {deal.nextActivityType as unknown as string}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground/50">
                              —
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Sidebar stats panel - lg+ only */}
      <div className="hidden lg:block w-60 flex-shrink-0 p-4 pt-8 pr-6 border-l border-border bg-card space-y-3">
        <h2 className="font-heading text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-4">
          Pipeline Stats
        </h2>
        {statCards.map((card) => (
          <div
            key={card.label}
            className="bg-card rounded-xl p-4 border border-border"
          >
            <div
              className={`inline-flex items-center justify-center w-7 h-7 rounded-lg ${card.bg} mb-1.5`}
            >
              <card.icon size={14} className={card.color} />
            </div>
            <div className="text-lg font-bold text-foreground">
              {card.value}
            </div>
            <div className="text-xs text-muted-foreground leading-tight">
              {card.label}
            </div>
          </div>
        ))}
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div
          data-ocid="deals.bulk_action.panel"
          className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-foreground text-background rounded-xl shadow-lg px-4 py-3 flex items-center gap-3 z-50 flex-wrap"
        >
          <span className="text-sm font-medium whitespace-nowrap">
            {selectedIds.size} selected
          </span>
          <div className="flex items-center gap-1">
            <select
              data-ocid="deals.bulk_action.select"
              value={bulkStage}
              onChange={(e) => setBulkStage(e.target.value as Stage | "")}
              className="px-2 py-1.5 text-sm border border-background/30 rounded-lg bg-foreground text-background focus:outline-none appearance-none cursor-pointer"
            >
              <option value="">Change Stage...</option>
              {STAGES.map((s) => (
                <option key={s} value={s}>
                  {STAGE_LABELS[s]}
                </option>
              ))}
            </select>
            {bulkStage && (
              <button
                type="button"
                data-ocid="deals.bulk_action.confirm_button"
                disabled={bulkWorking}
                onClick={handleBulkChangeStage}
                className="px-3 py-1.5 bg-background text-foreground text-sm font-medium rounded-lg hover:bg-background/90 transition-colors disabled:opacity-60"
              >
                Apply
              </button>
            )}
          </div>
          <button
            type="button"
            data-ocid="deals.bulk_action.delete_button"
            disabled={bulkWorking}
            onClick={handleBulkDelete}
            className="px-3 py-1.5 bg-rose-500 text-white text-sm font-medium rounded-lg hover:bg-rose-600 transition-colors disabled:opacity-60"
          >
            Delete
          </button>
          <button
            type="button"
            data-ocid="deals.bulk_action.cancel_button"
            onClick={() => setSelectedIds(new Set())}
            className="px-3 py-1.5 text-sm text-background/70 hover:text-background transition-colors"
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
}
