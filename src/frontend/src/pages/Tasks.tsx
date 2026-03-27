import { AlertCircle, CheckCircle2, Circle, Clock, Plus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { Task, TaskInput } from "../backend.d";
import { useActor } from "../hooks/useActor";

type Filter = "all" | "pending" | "completed" | "overdue";

export default function Tasks() {
  const { actor, isFetching } = useActor();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [showForm, setShowForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDue, setNewDue] = useState("");
  const nowMs = Date.now();
  const nowBig = BigInt(nowMs);

  const reload = useCallback(async () => {
    if (!actor) return;
    try {
      const data = await actor.listTasks();
      setTasks(data);
    } catch (e) {
      console.error("Failed to load tasks", e);
    } finally {
      setLoading(false);
    }
  }, [actor]);

  useEffect(() => {
    if (!isFetching && actor) reload();
  }, [actor, isFetching, reload]);

  async function toggle(task: Task) {
    if (!actor) return;
    try {
      const input: TaskInput = {
        title: task.title,
        description: task.description,
        contactId: task.contactId,
        contactName: task.contactName,
        dealId: task.dealId,
        dealName: task.dealName,
        dueDate: task.dueDate,
        completed: !task.completed,
      };
      await actor.updateTask(task.id, input);
      await reload();
    } catch (e) {
      console.error("Failed to toggle task", e);
    }
  }

  async function remove(id: string) {
    if (!actor) return;
    try {
      await actor.deleteTask(id);
      await reload();
    } catch (e) {
      console.error("Failed to delete task", e);
    }
  }

  async function addTask() {
    if (!newTitle.trim() || !actor) return;
    const input: TaskInput = {
      title: newTitle.trim(),
      description: "",
      contactId: "",
      contactName: "",
      dealId: "",
      dealName: "",
      dueDate: newDue ? BigInt(new Date(newDue).getTime()) : undefined,
      completed: false,
    };
    try {
      await actor.createTask(input);
      setNewTitle("");
      setNewDue("");
      setShowForm(false);
      await reload();
    } catch (e) {
      console.error("Failed to create task", e);
    }
  }

  const filtered = tasks.filter((t) => {
    if (filter === "completed") return t.completed;
    if (filter === "pending")
      return !t.completed && (!t.dueDate || t.dueDate >= nowBig);
    if (filter === "overdue")
      return !t.completed && t.dueDate !== undefined && t.dueDate < nowBig;
    return true;
  });

  function dueDateClass(t: Task) {
    if (t.completed) return "text-muted-foreground";
    if (!t.dueDate) return "text-muted-foreground";
    if (t.dueDate < nowBig) return "text-rose-500";
    if (t.dueDate < BigInt(nowMs + 86400000)) return "text-amber-500";
    return "text-muted-foreground";
  }

  function taskRowBg(t: Task) {
    if (t.completed) return "bg-emerald-50/40";
    return "";
  }

  const FILTERS: { key: Filter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "pending", label: "Pending" },
    { key: "completed", label: "Completed" },
    { key: "overdue", label: "Overdue" },
  ];

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-xl font-semibold text-foreground">
            Tasks
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {filtered.length} tasks
          </p>
        </div>
        <button
          type="button"
          data-ocid="tasks.primary_button"
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <Plus size={14} /> Add Task
        </button>
      </div>

      <div className="overflow-x-auto mb-5">
        <div className="flex gap-1 bg-card border border-border rounded-lg p-1 w-fit min-w-full sm:min-w-0">
          {FILTERS.map((f) => (
            <button
              type="button"
              key={f.key}
              data-ocid={`tasks.${f.key}.tab`}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                filter === f.key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {showForm && (
        <div className="bg-card rounded-xl border border-border shadow-xs p-4 mb-4">
          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex-1">
              <label
                htmlFor="task-title"
                className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5"
              >
                Title
              </label>
              <input
                id="task-title"
                data-ocid="tasks.input"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addTask()}
                placeholder="Task title..."
                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-card focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div className="w-full sm:w-auto">
              <label
                htmlFor="task-due"
                className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5"
              >
                Due Date
              </label>
              <input
                id="task-due"
                type="date"
                value={newDue}
                onChange={(e) => setNewDue(e.target.value)}
                className="w-full sm:w-auto px-3 py-2 text-sm border border-border rounded-lg bg-card focus:outline-none"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                data-ocid="tasks.submit_button"
                onClick={addTask}
                className="bg-primary text-primary-foreground text-sm font-medium px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
              >
                Add
              </button>
              <button
                type="button"
                data-ocid="tasks.cancel_button"
                onClick={() => setShowForm(false)}
                className="text-sm text-muted-foreground hover:text-foreground px-2 py-2"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div
          data-ocid="tasks.loading_state"
          className="py-10 text-center text-sm text-muted-foreground"
        >
          Loading...
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border shadow-xs overflow-hidden">
          {filtered.length === 0 ? (
            <div
              data-ocid="tasks.empty_state"
              className="text-center py-10 text-sm text-muted-foreground"
            >
              No tasks in this view
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map((t, i) => {
                const isOverdue =
                  !t.completed && !!t.dueDate && t.dueDate < nowBig;
                const isDueSoon =
                  !t.completed &&
                  !!t.dueDate &&
                  t.dueDate >= nowBig &&
                  t.dueDate < BigInt(nowMs + 86400000);
                return (
                  <div
                    key={t.id}
                    data-ocid={`tasks.item.${i + 1}`}
                    className={`flex items-center gap-3 md:gap-4 px-4 md:px-5 py-3.5 hover:bg-secondary/60 transition-colors duration-150 group ${taskRowBg(t)}`}
                  >
                    <button
                      type="button"
                      data-ocid={`tasks.checkbox.${i + 1}`}
                      onClick={() => toggle(t)}
                      className="flex-shrink-0 text-muted-foreground hover:text-primary transition-colors"
                    >
                      {t.completed ? (
                        <CheckCircle2 size={18} className="text-emerald-500" />
                      ) : (
                        <Circle size={18} />
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div
                        className={`text-sm font-medium ${t.completed ? "line-through text-muted-foreground" : "text-foreground"}`}
                      >
                        {t.title}
                      </div>
                      {(t.contactName || t.dealName) && (
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {[t.contactName, t.dealName]
                            .filter(Boolean)
                            .join(" · ")}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <div
                        className={`flex items-center gap-1 text-xs ${dueDateClass(t)}`}
                      >
                        {t.dueDate && !t.completed && t.dueDate < nowBig ? (
                          <AlertCircle size={12} />
                        ) : t.dueDate ? (
                          <Clock size={12} />
                        ) : null}
                        {t.dueDate
                          ? new Date(Number(t.dueDate)).toLocaleDateString()
                          : ""}
                      </div>
                      {isOverdue && (
                        <span className="inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded-full border border-rose-200 bg-rose-50 text-rose-600">
                          Overdue
                        </span>
                      )}
                      {isDueSoon && (
                        <span className="inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded-full border border-amber-200 bg-amber-50 text-amber-600">
                          Due soon
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      data-ocid={`tasks.delete_button.${i + 1}`}
                      onClick={() => remove(t.id)}
                      className="sm:opacity-0 sm:group-hover:opacity-100 text-muted-foreground hover:text-red-500 transition-all text-xs"
                    >
                      Remove
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
