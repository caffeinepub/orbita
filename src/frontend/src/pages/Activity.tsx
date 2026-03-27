import { Plus } from "lucide-react";
import { FileText, Mail, Phone, Users } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { Activity } from "../backend";
import { ActivityType } from "../backend.d";
import { useActor } from "../hooks/useActor";

const typeColors: Record<ActivityType, string> = {
  [ActivityType.Call]: "bg-green-100 text-green-600",
  [ActivityType.Meeting]: "bg-blue-100 text-blue-600",
  [ActivityType.Note]: "bg-yellow-100 text-yellow-600",
  [ActivityType.Email]: "bg-purple-100 text-purple-600",
};

const typeIcons: Record<ActivityType, React.ReactNode> = {
  [ActivityType.Call]: <Phone size={12} />,
  [ActivityType.Meeting]: <Users size={12} />,
  [ActivityType.Note]: <FileText size={12} />,
  [ActivityType.Email]: <Mail size={12} />,
};

const TYPE_LABELS: Record<ActivityType, string> = {
  [ActivityType.Call]: "Call",
  [ActivityType.Meeting]: "Meeting",
  [ActivityType.Note]: "Note",
  [ActivityType.Email]: "Email",
};

export default function ActivityPage() {
  const { actor, isFetching } = useActor();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [activityType, setActivityType] = useState<ActivityType>(
    ActivityType.Call,
  );

  const reload = useCallback(async () => {
    if (!actor) return;
    try {
      const data = await actor.listActivities();
      setActivities(
        [...data].sort((a, b) => Number(b.occurredAt - a.occurredAt)),
      );
    } catch (e) {
      console.error("Failed to load activities", e);
    } finally {
      setLoading(false);
    }
  }, [actor]);

  useEffect(() => {
    if (!isFetching && actor) reload();
  }, [actor, isFetching, reload]);

  async function handleAdd() {
    if (!title.trim() || !actor) return;
    try {
      await actor.createActivity({
        title,
        description,
        activityType,
        contactId: "",
        contactName: "",
        dealId: "",
        dealName: "",
        occurredAt: BigInt(Date.now()),
      } as any);
      setTitle("");
      setDescription("");
      setActivityType(ActivityType.Call);
      setShowForm(false);
      await reload();
    } catch (e) {
      console.error("Failed to create activity", e);
    }
  }

  async function handleDelete(id: string) {
    if (!actor || !confirm("Delete this activity?")) return;
    try {
      await actor.deleteActivity(id);
      await reload();
    } catch (e) {
      console.error("Failed to delete activity", e);
    }
  }

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="font-heading text-xl font-semibold text-foreground">
            Activity
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {activities.length} activities
          </p>
        </div>
        <button
          type="button"
          data-ocid="activity.primary_button"
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <Plus size={14} /> Log Activity
        </button>
      </div>

      {showForm && (
        <div className="bg-card rounded-xl border border-border shadow-xs p-4 md:p-5 mb-6">
          <h2 className="font-heading text-sm font-semibold text-foreground mb-4">
            New Activity
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label
                htmlFor="act-title"
                className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5"
              >
                Title
              </label>
              <input
                id="act-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Activity title..."
                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-card focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label
                htmlFor="act-type"
                className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5"
              >
                Type
              </label>
              <select
                id="act-type"
                value={activityType as unknown as string}
                onChange={(e) =>
                  setActivityType(e.target.value as unknown as ActivityType)
                }
                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-card focus:outline-none"
              >
                {Object.entries(TYPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-span-1 sm:col-span-2">
              <label
                htmlFor="act-desc"
                className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5"
              >
                Description
              </label>
              <textarea
                id="act-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="Notes..."
                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-card focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              data-ocid="activity.submit_button"
              onClick={handleAdd}
              className="bg-primary text-primary-foreground text-sm font-medium px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
            >
              Save
            </button>
            <button
              type="button"
              data-ocid="activity.cancel_button"
              onClick={() => setShowForm(false)}
              className="text-sm text-muted-foreground hover:text-foreground px-2 py-2"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div
          data-ocid="activity.loading_state"
          className="py-10 text-center text-sm text-muted-foreground"
        >
          Loading...
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border shadow-xs overflow-hidden">
          {activities.length === 0 ? (
            <div
              data-ocid="activity.empty_state"
              className="py-10 text-center text-sm text-muted-foreground"
            >
              No activities logged yet
            </div>
          ) : (
            <div className="divide-y divide-border">
              {activities.map((a, i) => (
                <div
                  key={a.id}
                  data-ocid={`activity.item.${i + 1}`}
                  className="flex items-start gap-3 md:gap-4 px-4 md:px-6 py-4 hover:bg-secondary/60 transition-colors duration-150 group"
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${typeColors[a.activityType]}`}
                  >
                    {typeIcons[a.activityType]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-0.5">
                      <span className="text-sm font-medium text-foreground">
                        {a.title}
                      </span>
                      <span className="text-xs text-muted-foreground/70">
                        {TYPE_LABELS[a.activityType]}
                      </span>
                    </div>
                    {a.description && (
                      <div className="text-xs text-muted-foreground mb-1">
                        {a.description}
                      </div>
                    )}
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground/70">
                      {(a.contactName || a.dealName) && (
                        <span>
                          {[a.contactName, a.dealName]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      )}
                      <span>
                        {new Date(Number(a.occurredAt)).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    data-ocid={`activity.delete_button.${i + 1}`}
                    onClick={() => handleDelete(a.id)}
                    className="sm:opacity-0 sm:group-hover:opacity-100 text-xs text-muted-foreground hover:text-red-500 transition-all flex-shrink-0"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
