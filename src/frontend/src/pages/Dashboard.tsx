import { useNavigate } from "@tanstack/react-router";
import {
  Activity as ActivityIcon,
  Calendar,
  Clock,
  FileText,
  Mail,
  Phone,
  TrendingUp,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { Activity, Deal } from "../backend";
import { ActivityType, Stage } from "../backend.d";
import { useActor } from "../hooks/useActor";

function formatCurrency(n: number) {
  if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}K`;
  return `$${n}`;
}

function formatRelative(ts: bigint) {
  const diff = Date.now() - Number(ts);
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(diff / 3600000);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

const typeColors: Record<ActivityType, string> = {
  [ActivityType.Call]: "bg-emerald-100 text-emerald-700",
  [ActivityType.Meeting]: "bg-indigo-100 text-indigo-700",
  [ActivityType.Note]: "bg-amber-100 text-amber-700",
  [ActivityType.Email]: "bg-violet-100 text-violet-700",
};

const typeIcons: Record<ActivityType, React.ReactNode> = {
  [ActivityType.Call]: <Phone size={12} />,
  [ActivityType.Meeting]: <Users size={12} />,
  [ActivityType.Note]: <FileText size={12} />,
  [ActivityType.Email]: <Mail size={12} />,
};

const stageConfig: Record<
  Stage,
  { label: string; badge: string; bar: string }
> = {
  [Stage.Lead]: {
    label: "Lead",
    badge: "bg-slate-100 text-slate-700",
    bar: "bg-slate-400",
  },
  [Stage.Qualified]: {
    label: "Qualified",
    badge: "bg-indigo-100 text-indigo-700",
    bar: "bg-indigo-400",
  },
  [Stage.Proposal]: {
    label: "Proposal",
    badge: "bg-violet-100 text-violet-700",
    bar: "bg-violet-400",
  },
  [Stage.Negotiation]: {
    label: "Negotiation",
    badge: "bg-amber-100 text-amber-700",
    bar: "bg-amber-400",
  },
  [Stage.ClosedWon]: {
    label: "Closed Won",
    badge: "bg-emerald-100 text-emerald-700",
    bar: "bg-emerald-400",
  },
  [Stage.ClosedLost]: {
    label: "Closed Lost",
    badge: "bg-rose-100 text-rose-700",
    bar: "bg-rose-400",
  },
};

const activityTypeLabel: Record<ActivityType, string> = {
  [ActivityType.Call]: "Call",
  [ActivityType.Email]: "Email",
  [ActivityType.Meeting]: "Meeting",
  [ActivityType.Note]: "Note",
};

const _STAGE_ORDER = [
  Stage.Lead,
  Stage.Qualified,
  Stage.Proposal,
  Stage.ClosedWon,
  Stage.ClosedLost,
];

const METRIC_SKELETON_KEYS = [
  "pipeline",
  "open-deals",
  "win-rate",
  "tasks-today",
  "overdue",
  "contacts",
];
const STAGE_SKELETON_KEYS = [
  "lead",
  "qualified",
  "proposal",
  "closed-won",
  "closed-lost",
];
const STAGE_SKELETON_WIDTHS = [42, 66, 54, 30, 78];
const ACTIVITY_SKELETON_KEYS = ["act-a", "act-b", "act-c", "act-d", "act-e"];
const ACTIVITY_TITLE_WIDTHS = ["55%", "70%", "60%", "85%", "65%"];
const ACTIVITY_SUB_WIDTHS = ["35%", "45%", "55%", "40%", "50%"];

interface StageBreakdown {
  stage: Stage;
  count: number;
  value: number;
}

interface FollowUp {
  deal: Deal;
  isOverdue: boolean;
  isDueToday: boolean;
}

function DashboardSkeleton() {
  return (
    <div data-ocid="dashboard.loading_state" className="animate-pulse">
      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6 md:mb-8">
        {METRIC_SKELETON_KEYS.map((key) => (
          <div
            key={key}
            className="bg-card rounded-xl p-4 md:p-5 border border-border shadow-xs"
          >
            <div className="w-9 h-9 rounded-lg bg-muted mb-3" />
            <div className="h-7 w-16 rounded-md bg-muted mb-1.5" />
            <div className="h-3 w-24 rounded bg-muted/70" />
          </div>
        ))}
      </div>

      {/* Pipeline by Stage */}
      <div className="bg-card rounded-xl border border-border shadow-xs mb-6 md:mb-8">
        <div className="px-4 md:px-6 py-4 border-b border-border">
          <div className="h-4 w-32 rounded bg-muted" />
        </div>
        <div className="divide-y divide-border">
          {STAGE_SKELETON_KEYS.map((key, i) => (
            <div
              key={key}
              className="flex items-center gap-3 md:gap-4 px-4 md:px-6 py-3"
            >
              <div className="h-5 w-24 rounded-full bg-muted flex-shrink-0" />
              <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-border"
                  style={{ width: `${STAGE_SKELETON_WIDTHS[i]}%` }}
                />
              </div>
              <div className="flex-shrink-0 flex gap-2">
                <div className="h-3 w-12 rounded bg-muted/70" />
                <div className="h-3 w-10 rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-card rounded-xl border border-border shadow-xs">
        <div className="flex items-center justify-between px-4 md:px-6 py-4 border-b border-border">
          <div className="h-4 w-28 rounded bg-muted" />
          <div className="h-3 w-12 rounded bg-muted/60" />
        </div>
        <div className="divide-y divide-border">
          {ACTIVITY_SKELETON_KEYS.map((key, i) => (
            <div
              key={key}
              className="flex items-center gap-3 md:gap-4 px-4 md:px-6 py-3.5"
            >
              <div className="w-7 h-7 rounded-full bg-muted flex-shrink-0" />
              <div className="flex-1 min-w-0 space-y-1.5">
                <div
                  className="h-3.5 rounded bg-muted"
                  style={{ width: ACTIVITY_TITLE_WIDTHS[i] }}
                />
                <div
                  className="h-3 rounded bg-muted/60"
                  style={{ width: ACTIVITY_SUB_WIDTHS[i] }}
                />
              </div>
              <div className="h-3 w-10 rounded bg-muted/50 flex-shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { actor, isFetching } = useActor();
  const [stats, setStats] = useState({
    pipeline: 0,
    openDeals: 0,
    overdueTasks: 0,
    winRate: 0,
    tasksDueToday: 0,
    totalContacts: 0,
  });
  const [stageBreakdown, setStageBreakdown] = useState<StageBreakdown[]>([]);
  const [recentActivities, setRecentActivities] = useState<Activity[]>([]);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [overdueFollowUps, setOverdueFollowUps] = useState(0);
  const [todayFollowUps, setTodayFollowUps] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!actor) return;
    try {
      const todayStart = BigInt(new Date().setHours(0, 0, 0, 0));
      const todayEnd = BigInt(new Date().setHours(23, 59, 59, 999));

      const summary = await actor.getDashboardSummary(todayStart, todayEnd);

      setStats({
        pipeline: summary.pipeline,
        openDeals: summary.openDeals,
        overdueTasks: summary.overdueTasks,
        winRate: Math.round(summary.winRate),
        tasksDueToday: summary.tasksDueToday,
        totalContacts: summary.totalContacts,
      });
      setStageBreakdown(
        summary.stageBreakdown.map((s) => ({
          stage: s.stage,
          count: s.count,
          value: s.value,
        })),
      );
      setRecentActivities(summary.recentActivities);

      const followUpList: FollowUp[] = summary.followUpDeals.map((deal) => {
        const dt = deal.nextActivityDate!;
        const isOverdue = dt < todayStart;
        const isDueToday = dt >= todayStart && dt <= todayEnd;
        return { deal, isOverdue, isDueToday };
      });
      setFollowUps(followUpList);
      setOverdueFollowUps(summary.overdueFollowUps);
      setTodayFollowUps(summary.todayFollowUps);
    } catch (e) {
      console.error("Failed to load dashboard", e);
    } finally {
      setLoading(false);
    }
  }, [actor]);

  useEffect(() => {
    if (!isFetching && actor) loadData();
  }, [actor, isFetching, loadData]);

  const maxStageValue = Math.max(...stageBreakdown.map((s) => s.value), 1);

  const metricCards = [
    {
      label: "Total Pipeline Value",
      value: formatCurrency(stats.pipeline),
      icon: TrendingUp,
      color: "text-primary",
      bg: "bg-indigo-50",
      extra: null,
    },
    {
      label: "Open Deals",
      value: stats.openDeals.toString(),
      icon: TrendingUp,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      extra: null,
    },
    {
      label: "Win Rate",
      value: `${stats.winRate}%`,
      icon: ActivityIcon,
      color: stats.winRate >= 50 ? "text-emerald-600" : "text-amber-600",
      bg: stats.winRate >= 50 ? "bg-emerald-50" : "bg-amber-50",
      extra: "winRate",
    },
    {
      label: "Tasks Due Today",
      value: stats.tasksDueToday.toString(),
      icon: Clock,
      color: "text-amber-600",
      bg: "bg-amber-50",
      extra: null,
    },
    {
      label: "Overdue Tasks",
      value: stats.overdueTasks.toString(),
      icon: Clock,
      color: "text-rose-500",
      bg: "bg-rose-50",
      extra: null,
    },
    {
      label: "Total Contacts",
      value: stats.totalContacts.toString(),
      icon: Users,
      color: "text-slate-600",
      bg: "bg-slate-100",
      extra: null,
    },
  ];

  return (
    <div className="p-4 md:p-8 max-w-6xl">
      <div className="mb-6 md:mb-8">
        <h1 className="font-heading text-xl font-semibold text-foreground">
          Dashboard
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Your CRM overview
        </p>
      </div>

      {loading ? (
        <DashboardSkeleton />
      ) : (
        <>
          {/* Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6 md:mb-8">
            {metricCards.map((card) => (
              <div
                key={card.label}
                className="bg-card rounded-xl p-4 md:p-5 border border-border shadow-xs"
              >
                <div
                  className={`inline-flex items-center justify-center w-9 h-9 rounded-lg ${card.bg} mb-3`}
                >
                  <card.icon size={18} className={card.color} />
                </div>
                <div className="text-2xl font-bold text-foreground">
                  {card.value}
                </div>
                <div className="text-xs font-medium text-muted-foreground mt-0.5">
                  {card.label}
                </div>
                {card.extra === "winRate" && (
                  <div className="mt-2 h-1.5 rounded-full bg-border overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        stats.winRate >= 50 ? "bg-emerald-400" : "bg-amber-400"
                      }`}
                      style={{ width: `${stats.winRate}%` }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Follow-ups Widget */}
          {(followUps.length > 0 ||
            overdueFollowUps > 0 ||
            todayFollowUps > 0) && (
            <div className="bg-card rounded-xl border border-border shadow-xs mb-6 md:mb-8">
              <div className="flex items-center gap-3 px-4 md:px-6 py-4 border-b border-border">
                <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center">
                  <Calendar size={14} className="text-amber-600" />
                </div>
                <h2 className="font-heading text-sm font-semibold text-foreground flex-1">
                  Follow-ups
                </h2>
                <div className="flex items-center gap-2">
                  {overdueFollowUps > 0 && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-700 border border-rose-200">
                      {overdueFollowUps} overdue
                    </span>
                  )}
                  {todayFollowUps > 0 && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 border border-amber-200">
                      {todayFollowUps} today
                    </span>
                  )}
                </div>
              </div>
              <div className="divide-y divide-border">
                {followUps.map((fu, i) => {
                  const dateStr = fu.deal.nextActivityDate
                    ? new Date(
                        Number(fu.deal.nextActivityDate),
                      ).toLocaleDateString()
                    : "";
                  return (
                    <button
                      type="button"
                      key={fu.deal.id}
                      data-ocid={`dashboard.followup.item.${i + 1}`}
                      onClick={() =>
                        navigate({
                          to: "/deals/$id",
                          params: { id: fu.deal.id },
                        })
                      }
                      className="w-full flex items-center gap-3 md:gap-4 px-4 md:px-6 py-3 hover:bg-secondary/60 transition-colors text-left"
                    >
                      <div
                        className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          fu.isOverdue
                            ? "bg-rose-400"
                            : fu.isDueToday
                              ? "bg-amber-400"
                              : "bg-slate-300"
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-foreground truncate">
                          {fu.deal.title}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {fu.deal.companyName || fu.deal.contactName}
                        </div>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        {fu.deal.nextActivityType && (
                          <div className="text-xs text-muted-foreground">
                            {activityTypeLabel[fu.deal.nextActivityType]}
                          </div>
                        )}
                        <div
                          className={`text-xs font-medium ${
                            fu.isOverdue
                              ? "text-rose-600"
                              : fu.isDueToday
                                ? "text-amber-600"
                                : "text-muted-foreground"
                          }`}
                        >
                          {dateStr}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Pipeline by Stage */}
          <div className="bg-card rounded-xl border border-border shadow-xs mb-6 md:mb-8">
            <div className="px-4 md:px-6 py-4 border-b border-border">
              <h2 className="font-heading text-sm font-semibold text-foreground">
                Pipeline by Stage
              </h2>
            </div>
            <div className="divide-y divide-border">
              {stageBreakdown.map((row) => {
                const cfg = stageConfig[row.stage];
                const pct =
                  row.value > 0
                    ? Math.max((row.value / maxStageValue) * 100, 2)
                    : 0;
                return (
                  <div
                    key={row.stage}
                    className="flex items-center gap-3 md:gap-4 px-4 md:px-6 py-3"
                  >
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium flex-shrink-0 w-24 justify-center ${cfg.badge}`}
                    >
                      {cfg.label}
                    </span>
                    <div className="flex-1 h-2 rounded-full bg-border overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${cfg.bar}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <span className="text-xs text-muted-foreground">
                        {row.count} deal{row.count !== 1 ? "s" : ""}
                      </span>
                      <span className="text-xs font-medium text-foreground ml-2">
                        {formatCurrency(row.value)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-card rounded-xl border border-border shadow-xs">
            <div className="flex items-center justify-between px-4 md:px-6 py-4 border-b border-border">
              <h2 className="font-heading text-sm font-semibold text-foreground">
                Recent Activity
              </h2>
              <button
                type="button"
                data-ocid="dashboard.activity_link"
                onClick={() => navigate({ to: "/activity" })}
                className="text-xs text-primary hover:underline"
              >
                View all
              </button>
            </div>
            <div className="divide-y divide-border">
              {recentActivities.map((a, i) => (
                <div
                  key={a.id}
                  data-ocid={`dashboard.item.${i + 1}`}
                  className="flex items-center gap-3 md:gap-4 px-4 md:px-6 py-3.5"
                >
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${typeColors[a.activityType]}`}
                  >
                    {typeIcons[a.activityType]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">
                      {a.title}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {a.contactName || a.dealName}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground/70 flex-shrink-0">
                    {formatRelative(a.occurredAt)}
                  </div>
                </div>
              ))}
              {recentActivities.length === 0 && (
                <div
                  data-ocid="dashboard.empty_state"
                  className="px-6 py-8 text-center text-sm text-muted-foreground"
                >
                  No activity yet
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mt-6 flex flex-wrap gap-2 md:gap-3">
            <button
              type="button"
              data-ocid="dashboard.add_contact_button"
              onClick={() =>
                navigate({ to: "/contacts/$id", params: { id: "new" } })
              }
              className="bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
            >
              + Add Contact
            </button>
            <button
              type="button"
              data-ocid="dashboard.new_deal_button"
              onClick={() =>
                navigate({ to: "/deals/$id", params: { id: "new" } })
              }
              className="bg-card border border-border hover:bg-secondary text-foreground text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
            >
              + New Deal
            </button>
            <button
              type="button"
              data-ocid="dashboard.tasks_button"
              onClick={() => navigate({ to: "/tasks" })}
              className="bg-card border border-border hover:bg-secondary text-foreground text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
            >
              View Tasks
            </button>
          </div>
        </>
      )}
    </div>
  );
}
