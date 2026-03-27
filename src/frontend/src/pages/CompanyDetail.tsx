import { useNavigate, useParams } from "@tanstack/react-router";
import {
  ArrowLeft,
  FileText,
  Mail,
  Phone,
  Plus,
  Save,
  Trash2,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { Activity } from "../backend";
import { ActivityType } from "../backend.d";
import type { CompanyInput } from "../backend.d";
import { useActor } from "../hooks/useActor";

type CompanyForm = CompanyInput;
const empty: CompanyForm = {
  name: "",
  industry: "",
  website: "",
  phone: "",
  address: "",
  notes: "",
  tags: [],
};

const fields: {
  key: keyof Omit<CompanyForm, "tags" | "notes">;
  label: string;
  id: string;
  span?: boolean;
}[] = [
  { key: "name", label: "Company Name", id: "co-name" },
  { key: "industry", label: "Industry", id: "co-industry" },
  { key: "website", label: "Website", id: "co-website" },
  { key: "phone", label: "Phone", id: "co-phone" },
  { key: "address", label: "Address", id: "co-address", span: true },
];

function activityIconClasses(type: ActivityType): {
  wrapper: string;
  icon: string;
} {
  switch (type) {
    case ActivityType.Call:
      return { wrapper: "bg-emerald-100", icon: "text-emerald-600" };
    case ActivityType.Email:
      return { wrapper: "bg-violet-100", icon: "text-violet-600" };
    case ActivityType.Meeting:
      return { wrapper: "bg-indigo-100", icon: "text-indigo-600" };
    default:
      return { wrapper: "bg-indigo-100", icon: "text-indigo-600" };
  }
}

export default function CompanyDetail() {
  const { id } = useParams({ strict: false }) as { id: string };
  const navigate = useNavigate();
  const { actor, isFetching } = useActor();
  const isNew = id === "new";
  const [form, setForm] = useState<CompanyForm>(empty);
  const [tagsInput, setTagsInput] = useState("");
  const [loading, setLoading] = useState(!isNew);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteDesc, setNoteDesc] = useState("");
  const [noteType, setNoteType] = useState<ActivityType>(ActivityType.Note);
  const [savingNote, setSavingNote] = useState(false);

  async function loadActivities() {
    if (!actor || isNew) return;
    try {
      const acts = (await (actor as any).listActivitiesByCompany(
        id,
      )) as Activity[];
      setActivities(acts.sort((a, b) => Number(b.occurredAt - a.occurredAt)));
    } catch (e) {
      console.error("Failed to load activities", e);
    }
  }

  useEffect(() => {
    if (isNew || !actor || isFetching) return;
    Promise.all([
      actor.getCompany(id),
      (actor as any).listActivitiesByCompany(id) as Promise<Activity[]>,
    ])
      .then(([c, acts]) => {
        setForm({
          name: c.name,
          industry: c.industry,
          website: c.website,
          phone: c.phone,
          address: c.address,
          notes: c.notes,
          tags: c.tags,
        });
        setTagsInput(c.tags.join(", "));
        setActivities(
          (acts as Activity[]).sort((a, b) =>
            Number(b.occurredAt - a.occurredAt),
          ),
        );
      })
      .catch((e) => console.error("Failed to load company", e))
      .finally(() => setLoading(false));
  }, [id, isNew, actor, isFetching]);

  async function handleSave() {
    if (!actor) return;
    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    const data: CompanyInput = { ...form, tags };
    try {
      if (isNew) {
        const newId = await actor.createCompany(data);
        navigate({ to: "/companies/$id", params: { id: newId } });
      } else {
        await actor.updateCompany(id, data);
        navigate({ to: "/companies" });
      }
    } catch (e) {
      console.error("Failed to save company", e);
      alert("Failed to save company. Please try again.");
    }
  }

  async function handleDelete() {
    if (!actor || !confirm("Delete this company?")) return;
    try {
      await actor.deleteCompany(id);
      navigate({ to: "/companies" });
    } catch (e) {
      console.error("Failed to delete company", e);
      alert("Failed to delete company.");
    }
  }

  async function handleSaveNote() {
    if (!actor || !noteTitle.trim()) return;
    setSavingNote(true);
    try {
      await actor.createActivity({
        title: noteTitle,
        description: noteDesc,
        activityType: noteType,
        contactId: "",
        contactName: "",
        dealId: "",
        dealName: "",
        occurredAt: BigInt(Date.now()),
      } as any);
      setNoteTitle("");
      setNoteDesc("");
      setNoteType(ActivityType.Note);
      setShowNoteForm(false);
      await loadActivities();
    } catch (e) {
      console.error("Failed to log activity", e);
    } finally {
      setSavingNote(false);
    }
  }

  function set(key: keyof CompanyForm, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  if (loading) {
    return (
      <div
        data-ocid="company_detail.loading_state"
        className="p-4 md:p-8 text-sm text-muted-foreground"
      >
        Loading...
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-2xl">
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <button
          type="button"
          data-ocid="company_detail.link"
          onClick={() => navigate({ to: "/companies" })}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className="font-heading text-xl font-semibold text-foreground flex-1 min-w-0 truncate">
          {isNew ? "New Company" : form.name || "Company"}
        </h1>
        <div className="flex gap-2">
          {!isNew && (
            <button
              type="button"
              data-ocid="company_detail.open_modal_button"
              onClick={() => setShowNoteForm((v) => !v)}
              className="flex items-center gap-1.5 border border-border hover:bg-secondary text-foreground text-sm font-medium px-3 py-2 rounded-lg transition-colors"
            >
              <Plus size={14} /> Log Activity
            </button>
          )}
          {!isNew && (
            <button
              type="button"
              data-ocid="company_detail.delete_button"
              onClick={handleDelete}
              className="flex items-center gap-1.5 border border-red-200 hover:bg-red-50 text-red-600 text-sm font-medium px-3 py-2 rounded-lg transition-colors"
            >
              <Trash2 size={14} /> Delete
            </button>
          )}
          <button
            type="button"
            data-ocid="company_detail.save_button"
            onClick={handleSave}
            className="flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <Save size={14} /> Save
          </button>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-xs p-4 md:p-6 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {fields.map(({ key, label, id: fid, span }) => (
            <div key={key} className={span ? "col-span-1 sm:col-span-2" : ""}>
              <label
                htmlFor={fid}
                className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5"
              >
                {label}
              </label>
              <input
                id={fid}
                data-ocid={`company_detail.${key}_input`}
                value={form[key] as string}
                onChange={(e) => set(key, e.target.value)}
                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-card focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          ))}
          <div className="col-span-1 sm:col-span-2">
            <label
              htmlFor="co-tags"
              className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5"
            >
              Tags (comma-separated)
            </label>
            <input
              id="co-tags"
              data-ocid="company_detail.tags_input"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-card focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div className="col-span-1 sm:col-span-2">
            <label
              htmlFor="co-notes"
              className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5"
            >
              Notes
            </label>
            <textarea
              id="co-notes"
              data-ocid="company_detail.notes_textarea"
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              rows={3}
              className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-card focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
          </div>
        </div>
      </div>

      {!isNew && showNoteForm && (
        <div className="bg-card rounded-xl border border-border shadow-xs p-4 md:p-6 mb-6">
          <h2 className="font-heading text-sm font-semibold text-foreground mb-4">
            Log Activity
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label
                htmlFor="co-note-title"
                className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5"
              >
                Title
              </label>
              <input
                id="co-note-title"
                data-ocid="company_detail.notes_input"
                value={noteTitle}
                onChange={(e) => setNoteTitle(e.target.value)}
                placeholder="Activity title..."
                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-card focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label
                htmlFor="co-note-type"
                className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5"
              >
                Type
              </label>
              <select
                id="co-note-type"
                value={noteType as unknown as string}
                onChange={(e) =>
                  setNoteType(e.target.value as unknown as ActivityType)
                }
                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-card focus:outline-none"
              >
                <option value={ActivityType.Note as unknown as string}>
                  Note
                </option>
                <option value={ActivityType.Call as unknown as string}>
                  Call
                </option>
                <option value={ActivityType.Email as unknown as string}>
                  Email
                </option>
                <option value={ActivityType.Meeting as unknown as string}>
                  Meeting
                </option>
              </select>
            </div>
            <div className="col-span-1 sm:col-span-2">
              <label
                htmlFor="co-note-desc"
                className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5"
              >
                Description
              </label>
              <textarea
                id="co-note-desc"
                value={noteDesc}
                onChange={(e) => setNoteDesc(e.target.value)}
                rows={3}
                placeholder="Notes..."
                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-card focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              data-ocid="company_detail.submit_button"
              onClick={handleSaveNote}
              disabled={savingNote}
              className="bg-primary text-primary-foreground text-sm font-medium px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-60"
            >
              {savingNote ? "Saving..." : "Save"}
            </button>
            <button
              type="button"
              data-ocid="company_detail.cancel_button"
              onClick={() => setShowNoteForm(false)}
              className="text-sm text-muted-foreground hover:text-foreground px-2 py-2"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {!isNew && (
        <div className="bg-card rounded-xl border border-border shadow-xs">
          <div className="px-4 md:px-5 py-3.5 border-b border-border">
            <h2 className="font-heading text-sm font-semibold text-foreground">
              Activity History
            </h2>
          </div>
          <div className="divide-y divide-border">
            {activities.length === 0 ? (
              <div className="px-5 py-6 text-sm text-muted-foreground text-center">
                No activities logged yet
              </div>
            ) : (
              activities.map((a) => {
                const ic = activityIconClasses(a.activityType);
                return (
                  <div
                    key={a.id}
                    className="px-4 md:px-5 py-3 flex items-start gap-3"
                  >
                    <div
                      className={`w-6 h-6 rounded-full ${ic.wrapper} flex items-center justify-center flex-shrink-0 mt-0.5`}
                    >
                      {a.activityType === ActivityType.Call ? (
                        <Phone size={11} className={ic.icon} />
                      ) : a.activityType === ActivityType.Email ? (
                        <Mail size={11} className={ic.icon} />
                      ) : a.activityType === ActivityType.Meeting ? (
                        <Users size={11} className={ic.icon} />
                      ) : (
                        <FileText size={11} className={ic.icon} />
                      )}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-foreground">
                        {a.title}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {a.description}
                      </div>
                      <div className="text-xs text-muted-foreground/70 mt-0.5">
                        {new Date(Number(a.occurredAt)).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
