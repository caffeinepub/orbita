import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DollarSign, TrendingUp, Trophy } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Deal, Task } from "../backend";
import { Stage } from "../backend.d";
import { useActor } from "../hooks/useActor";

function formatCurrency(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n}`;
}

function getLast6Months() {
  const months: { label: string; year: number; month: number }[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      label: d.toLocaleString("default", { month: "short" }),
      year: d.getFullYear(),
      month: d.getMonth(),
    });
  }
  return months;
}

const STAGE_ORDER: Stage[] = [
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

const STAGE_COLORS: Record<Stage, string> = {
  [Stage.Lead]: "#64748b",
  [Stage.Qualified]: "#6366f1",
  [Stage.Proposal]: "#8b5cf6",
  [Stage.Negotiation]: "#f59e0b",
  [Stage.ClosedWon]: "#10b981",
  [Stage.ClosedLost]: "#f43f5e",
};

function computeChartData(deals: Deal[], tasks: Task[]) {
  const months = getLast6Months();
  const now = Date.now();

  const winRateData = months.map(({ label, year, month }) => {
    const inMonth = deals.filter((d) => {
      const ms = Number(d.createdAt) / 1_000_000;
      const dt = new Date(ms);
      return (
        dt.getFullYear() === year &&
        dt.getMonth() === month &&
        (d.stage === Stage.ClosedWon || d.stage === Stage.ClosedLost)
      );
    });
    const won = inMonth.filter((d) => d.stage === Stage.ClosedWon).length;
    const total = inMonth.length;
    const rate = total > 0 ? Math.round((won / total) * 100) : 0;
    return { month: label, rate };
  });

  const dealsClosedData = months.map(({ label, year, month }) => {
    const count = deals.filter((d) => {
      const ms = Number(d.createdAt) / 1_000_000;
      const dt = new Date(ms);
      return (
        dt.getFullYear() === year &&
        dt.getMonth() === month &&
        (d.stage === Stage.ClosedWon || d.stage === Stage.ClosedLost)
      );
    }).length;
    return { month: label, count };
  });

  // Pipeline value by stage
  const pipelineByStage = STAGE_ORDER.map((stage) => {
    const total = deals
      .filter((d) => d.stage === stage)
      .reduce((s, d) => s + d.value, 0);
    return { stage: STAGE_LABELS[stage], value: total, stageKey: stage };
  });

  // Average deal size over time
  const avgDealSizeData = months.map(({ label, year, month }) => {
    const inMonth = deals.filter((d) => {
      const ms = Number(d.createdAt) / 1_000_000;
      const dt = new Date(ms);
      return dt.getFullYear() === year && dt.getMonth() === month;
    });
    const avg =
      inMonth.length > 0
        ? inMonth.reduce((s, d) => s + d.value, 0) / inMonth.length
        : 0;
    return { month: label, avg: Math.round(avg) };
  });

  // Task completion rate by month
  const taskRateData = months.map(({ label, year, month }) => {
    const inMonth = tasks.filter((t) => {
      const ms = Number(t.createdAt) / 1_000_000;
      const dt = new Date(ms);
      return dt.getFullYear() === year && dt.getMonth() === month;
    });
    const completed = inMonth.filter((t) => t.completed).length;
    const overdue = inMonth.filter((t) => {
      if (t.completed) return false;
      if (t.dueDate == null) return false;
      const duems = Number(t.dueDate) / 1_000_000;
      return duems < now;
    }).length;
    return { month: label, completed, overdue };
  });

  return {
    winRateData,
    dealsClosedData,
    pipelineByStage,
    avgDealSizeData,
    taskRateData,
  };
}

const CustomTooltipWinRate = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-background border border-border rounded-lg px-3 py-2 shadow-lg text-xs">
      <p className="font-semibold text-foreground mb-0.5">{label}</p>
      <p className="text-muted-foreground">
        Win rate:{" "}
        <span className="font-medium text-foreground">{payload[0].value}%</span>
      </p>
    </div>
  );
};

const CustomTooltipClosed = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-background border border-border rounded-lg px-3 py-2 shadow-lg text-xs">
      <p className="font-semibold text-foreground mb-0.5">{label}</p>
      <p className="text-muted-foreground">
        Closed:{" "}
        <span className="font-medium text-foreground">{payload[0].value}</span>
      </p>
    </div>
  );
};

const CustomTooltipPipeline = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-background border border-border rounded-lg px-3 py-2 shadow-lg text-xs">
      <p className="font-semibold text-foreground mb-0.5">
        {payload[0].payload.stage}
      </p>
      <p className="text-muted-foreground">
        Value:{" "}
        <span className="font-medium text-foreground">
          {formatCurrency(payload[0].value)}
        </span>
      </p>
    </div>
  );
};

const CustomTooltipAvgDeal = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-background border border-border rounded-lg px-3 py-2 shadow-lg text-xs">
      <p className="font-semibold text-foreground mb-0.5">{label}</p>
      <p className="text-muted-foreground">
        Avg size:{" "}
        <span className="font-medium text-foreground">
          {formatCurrency(payload[0].value)}
        </span>
      </p>
    </div>
  );
};

const CustomTooltipTasks = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-background border border-border rounded-lg px-3 py-2 shadow-lg text-xs">
      <p className="font-semibold text-foreground mb-0.5">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} className="text-muted-foreground">
          {p.dataKey === "completed" ? "Completed" : "Overdue"}:{" "}
          <span className="font-medium text-foreground">{p.value}</span>
        </p>
      ))}
    </div>
  );
};

export default function Reports() {
  const { actor, isFetching } = useActor();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!actor) return;
    try {
      const [dealData, taskData] = await Promise.all([
        actor.listDeals(),
        actor.listTasks(),
      ]);
      setDeals(dealData);
      setTasks(taskData);
    } catch (e) {
      console.error("Failed to load reports data", e);
    } finally {
      setLoading(false);
    }
  }, [actor]);

  useEffect(() => {
    if (!isFetching && actor) loadData();
  }, [actor, isFetching, loadData]);

  const closedWon = deals.filter((d) => d.stage === Stage.ClosedWon);
  const closedLost = deals.filter((d) => d.stage === Stage.ClosedLost);
  const totalClosed = closedWon.length + closedLost.length;
  const winRate =
    totalClosed > 0 ? Math.round((closedWon.length / totalClosed) * 100) : 0;
  const totalWonValue = closedWon.reduce((s, d) => s + d.value, 0);

  const {
    winRateData,
    dealsClosedData,
    pipelineByStage,
    avgDealSizeData,
    taskRateData,
  } = computeChartData(deals, tasks);

  const statCards = [
    {
      label: "Total Closed Deals",
      value: totalClosed.toString(),
      icon: TrendingUp,
      iconBg: "bg-indigo-50",
      iconColor: "text-indigo-600",
    },
    {
      label: "Overall Win Rate",
      value: totalClosed > 0 ? `${winRate}%` : "0%",
      icon: Trophy,
      iconBg: winRate >= 50 ? "bg-emerald-50" : "bg-amber-50",
      iconColor: winRate >= 50 ? "text-emerald-600" : "text-amber-600",
      extra: "winRate",
    },
    {
      label: "Total Won Value",
      value: formatCurrency(totalWonValue),
      icon: DollarSign,
      iconBg: "bg-emerald-50",
      iconColor: "text-emerald-600",
    },
  ];

  return (
    <div className="p-4 md:p-8 max-w-5xl">
      <div className="mb-6 md:mb-8">
        <h1 className="font-heading text-xl font-semibold text-foreground">
          Reports
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Pipeline performance and deal analytics
        </p>
      </div>

      {loading ? (
        <div data-ocid="reports.loading_state" className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      ) : (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            {statCards.map((card) => (
              <div
                key={card.label}
                className="bg-card rounded-xl p-5 border border-border shadow-xs"
              >
                <div
                  className={`inline-flex items-center justify-center w-9 h-9 rounded-lg ${card.iconBg} mb-3`}
                >
                  <card.icon size={18} className={card.iconColor} />
                </div>
                <div className="text-2xl font-bold text-foreground">
                  {card.value}
                </div>
                <div className="text-xs font-medium text-muted-foreground mt-0.5">
                  {card.label}
                </div>
                {card.extra === "winRate" && totalClosed > 0 && (
                  <div className="mt-2 h-1.5 rounded-full bg-border overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        winRate >= 50 ? "bg-emerald-400" : "bg-amber-400"
                      }`}
                      style={{ width: `${winRate}%` }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Win Rate Over Time */}
          <Card className="mb-6 border-border shadow-xs">
            <CardHeader className="pb-4">
              <CardTitle className="font-heading text-sm font-semibold text-foreground">
                Win Rate Over Time
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Monthly win rate (last 6 months)
              </p>
            </CardHeader>
            <CardContent>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={winRateData}
                    margin={{ top: 4, right: 16, left: -16, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--border)"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => `${v}%`}
                      domain={[0, 100]}
                    />
                    <Tooltip content={<CustomTooltipWinRate />} />
                    <Line
                      type="monotone"
                      dataKey="rate"
                      stroke="var(--chart-1)"
                      strokeWidth={2}
                      dot={{ fill: "var(--chart-1)", r: 4, strokeWidth: 0 }}
                      activeDot={{ r: 5, strokeWidth: 0 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Deals Closed Per Month */}
          <Card className="mb-6 border-border shadow-xs">
            <CardHeader className="pb-4">
              <CardTitle className="font-heading text-sm font-semibold text-foreground">
                Deals Closed Per Month
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Won + lost deals per month (last 6 months)
              </p>
            </CardHeader>
            <CardContent>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={dealsClosedData}
                    margin={{ top: 4, right: 16, left: -16, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--border)"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip content={<CustomTooltipClosed />} />
                    <Bar
                      dataKey="count"
                      fill="var(--chart-2)"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Pipeline Value by Stage */}
          <Card className="mb-6 border-border shadow-xs">
            <CardHeader className="pb-4">
              <CardTitle className="font-heading text-sm font-semibold text-foreground">
                Pipeline Value by Stage
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Total deal value across all open and closed stages
              </p>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={pipelineByStage}
                    layout="vertical"
                    margin={{ top: 4, right: 24, left: 16, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--border)"
                      horizontal={false}
                    />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => formatCurrency(v)}
                    />
                    <YAxis
                      type="category"
                      dataKey="stage"
                      tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                      axisLine={false}
                      tickLine={false}
                      width={80}
                    />
                    <Tooltip content={<CustomTooltipPipeline />} />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {pipelineByStage.map((entry) => (
                        <Cell
                          key={entry.stageKey}
                          fill={STAGE_COLORS[entry.stageKey as Stage]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Average Deal Size Over Time */}
          <Card className="mb-6 border-border shadow-xs">
            <CardHeader className="pb-4">
              <CardTitle className="font-heading text-sm font-semibold text-foreground">
                Average Deal Size Over Time
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Mean deal value for deals created per month (last 6 months)
              </p>
            </CardHeader>
            <CardContent>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={avgDealSizeData}
                    margin={{ top: 4, right: 16, left: 8, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--border)"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => formatCurrency(v)}
                    />
                    <Tooltip content={<CustomTooltipAvgDeal />} />
                    <Line
                      type="monotone"
                      dataKey="avg"
                      stroke="#8b5cf6"
                      strokeWidth={2}
                      dot={{ fill: "#8b5cf6", r: 4, strokeWidth: 0 }}
                      activeDot={{ r: 5, strokeWidth: 0 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Task Completion Rate */}
          <Card className="border-border shadow-xs">
            <CardHeader className="pb-4">
              <CardTitle className="font-heading text-sm font-semibold text-foreground">
                Task Completion Rate
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Completed vs overdue tasks per month (last 6 months)
              </p>
            </CardHeader>
            <CardContent>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={taskRateData}
                    margin={{ top: 4, right: 16, left: -16, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--border)"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip content={<CustomTooltipTasks />} />
                    <Bar
                      dataKey="completed"
                      fill="#10b981"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="overdue"
                      fill="#f43f5e"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
