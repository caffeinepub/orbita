import { useNavigate } from "@tanstack/react-router";
import { Activity, Clock, Plus, Search, TrendingUp } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Stage } from "../backend.d";
import type { Deal } from "../backend.d";
import { useActor } from "../hooks/useActor";

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

export default function Pipeline() {
  const navigate = useNavigate();
  const { actor, isFetching } = useActor();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [dragId, setDragId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<Stage | "all">("all");
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
      console.error("Failed to load pipeline", e);
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

  const visibleStages = useMemo(
    () =>
      stageFilter === "all" ? STAGES : STAGES.filter((s) => s === stageFilter),
    [stageFilter],
  );

  const dealsByStage = (stage: Stage) =>
    filteredDeals.filter((d) => d.stage === stage);
  const stageValue = (stage: Stage) =>
    dealsByStage(stage).reduce((s, d) => s + d.value, 0);

  function onDragStart(e: React.DragEvent, id: string) {
    setDragId(id);
    e.dataTransfer.effectAllowed = "move";
  }

  function onDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }

  async function onDrop(e: React.DragEvent, stage: Stage) {
    e.preventDefault();
    if (!dragId || !actor) return;
    const deal = deals.find((d) => d.id === dragId);
    if (!deal) return;
    setDragId(null);
    try {
      await actor.updateDeal(dragId, {
        title: deal.title,
        contactName: deal.contactName,
        value: deal.value,
        tags: deal.tags,
        stage,
        notes: deal.notes,
        companyName: deal.companyName,
        contactId: deal.contactId,
        companyId: deal.companyId,
        nextActivityDate: deal.nextActivityDate,
        nextActivityNote: deal.nextActivityNote,
        nextActivityType: deal.nextActivityType,
      });
      await reload();
    } catch (e) {
      console.error("Failed to update deal stage", e);
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
              Pipeline
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {deals.length} deals
            </p>
          </div>
          <button
            type="button"
            data-ocid="pipeline.primary_button"
            onClick={() =>
              navigate({ to: "/deals/$id", params: { id: "new" } })
            }
            className="flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <Plus size={14} /> New Deal
          </button>
        </div>

        {/* Search + filter bar */}
        <div className="flex flex-wrap gap-2 mb-5">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              data-ocid="pipeline.search_input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search deals..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-lg bg-card focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <select
            data-ocid="pipeline.select"
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
            data-ocid="pipeline.loading_state"
            className="py-10 text-center text-sm text-muted-foreground"
          >
            Loading...
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-4">
            {visibleStages.map((stage) => {
              const sc = STAGE_COLORS[stage];
              const stageDals = dealsByStage(stage);
              return (
                <div
                  key={stage}
                  className={`flex-shrink-0 w-56 flex flex-col border-l-4 ${sc.border} rounded-l-sm`}
                  onDragOver={onDragOver}
                  onDrop={(e) => onDrop(e, stage)}
                >
                  <div className="rounded-r-xl rounded-bl-xl bg-secondary p-3 flex flex-col h-full">
                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs font-semibold text-foreground">
                          {STAGE_LABELS[stage]}
                        </span>
                        <span className="text-xs font-semibold text-foreground">
                          {stageDals.length}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {fmt(stageValue(stage))}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 flex-1">
                      {stageDals.map((deal, i) => (
                        <button
                          type="button"
                          key={deal.id}
                          data-ocid={`pipeline.item.${i + 1}`}
                          draggable
                          onDragStart={(e) => onDragStart(e, deal.id)}
                          onClick={() =>
                            navigate({
                              to: "/deals/$id",
                              params: { id: deal.id },
                            })
                          }
                          className={`bg-card rounded-lg p-3 border border-border shadow-xs cursor-grab active:cursor-grabbing hover:shadow-md transition-all duration-150 text-left w-full ${
                            dragId === deal.id
                              ? "opacity-80 rotate-1 scale-[1.03] shadow-lg"
                              : ""
                          }`}
                        >
                          <div className="text-xs font-semibold text-foreground mb-0.5 truncate">
                            {deal.companyName || deal.title}
                          </div>
                          <div className="text-xs font-bold text-foreground mb-2">
                            {fmt(deal.value)}
                          </div>
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[10px] text-muted-foreground truncate flex-1">
                              {deal.contactName}
                            </span>
                            <span
                              className={`inline-flex items-center text-[9px] font-semibold px-1.5 py-0.5 rounded-full border ${sc.border} ${sc.bg} ${sc.text} flex-shrink-0`}
                            >
                              {STAGE_LABELS[stage]}
                            </span>
                          </div>
                          {deal.nextActivityDate && (
                            <div className="mt-1.5 flex items-center gap-1 text-[10px] text-amber-600">
                              <span>📅</span>
                              <span>
                                {new Date(
                                  Number(deal.nextActivityDate),
                                ).toLocaleDateString()}
                              </span>
                            </div>
                          )}
                        </button>
                      ))}
                      {stageDals.length === 0 && (
                        <div
                          data-ocid={`pipeline.${stage}.empty_state`}
                          className="text-center py-4 text-xs text-muted-foreground"
                        >
                          {search ? "No matches" : "No deals"}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
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
    </div>
  );
}
