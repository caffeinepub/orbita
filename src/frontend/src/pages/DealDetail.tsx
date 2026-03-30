import { useNavigate, useParams } from "@tanstack/react-router";
import {
  ArrowLeft,
  Calendar,
  FileText,
  Lock,
  Mail,
  Phone,
  Plus,
  Save,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { Activity } from "../backend";
import { ActivityType, Stage } from "../backend.d";
import type { DealInput } from "../backend.d";
import { useActor } from "../hooks/useActor";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  decryptNote,
  encryptNote,
  getOrDeriveAesKey,
  isEncrypted,
} from "../lib/vetkeys";

const STAGE_OPTIONS: { value: Stage; label: string }[] = [
  { value: Stage.Lead, label: "Lead" },
  { value: Stage.Qualified, label: "Qualified" },
  { value: Stage.Proposal, label: "Proposal" },
  { value: Stage.Negotiation, label: "Negotiation" },
  { value: Stage.ClosedWon, label: "Closed Won" },
  { value: Stage.ClosedLost, label: "Closed Lost" },
];

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

const emptyForm: DealInput = {
  title: "",
  contactName: "",
  contactId: "",
  companyName: "",
  companyId: "",
  value: 0,
  stage: Stage.Lead,
  tags: [],
  notes: "",
  nextActivityDate: undefined,
  nextActivityNote: "",
  nextActivityType: undefined,
};

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

function bigintToDateInput(ts?: bigint): string {
  if (!ts) return "";
  const d = new Date(Number(ts));
  return d.toISOString().split("T")[0];
}

export default function DealDetail() {
  const { id } = useParams({ strict: false }) as { id: string };
  const navigate = useNavigate();
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();
  const isNew = id === "new";

  const [form, setForm] = useState<DealInput>(emptyForm);
  const [valueInput, setValueInput] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteDesc, setNoteDesc] = useState("");
  const [noteType, setNoteType] = useState<ActivityType>(ActivityType.Note);
  const [savingNote, setSavingNote] = useState(false);
  const [aesKey, setAesKey] = useState<CryptoKey | null>(null);
  const [wasEncrypted, setWasEncrypted] = useState(false);

  // Next Activity state
  const [nextDate, setNextDate] = useState("");
  const [nextType, setNextType] = useState<ActivityType>(ActivityType.Call);
  const [nextNote, setNextNote] = useState("");
  const [savingNextActivity, setSavingNextActivity] = useState(false);

  // Derive AES key once per session when actor + identity are ready
  useEffect(() => {
    if (!actor || !identity) return;
    const principalBytes = identity.getPrincipal().toUint8Array();
    getOrDeriveAesKey(
      actor as unknown as Parameters<typeof getOrDeriveAesKey>[0],
      principalBytes,
    )
      .then((key) => setAesKey(key))
      .catch((e) => {
        console.warn(
          "vetkd key derivation failed — notes will be plaintext",
          e,
        );
      });
  }, [actor, identity]);

  async function loadActivities() {
    if (!actor || isNew) return;
    try {
      const acts = await actor.listActivitiesByDeal(id);
      setActivities(acts.sort((a, b) => Number(b.occurredAt - a.occurredAt)));
    } catch (e) {
      console.error("Failed to load activities", e);
    }
  }

  useEffect(() => {
    if (isNew || !actor || isFetching) return;
    setLoading(true);
    Promise.all([actor.getDeal(id), actor.listActivitiesByDeal(id)])
      .then(async ([d, acts]) => {
        let resolvedNotes = d.notes;
        const encrypted = isEncrypted(d.notes);
        setWasEncrypted(encrypted);
        if (encrypted && aesKey) {
          try {
            resolvedNotes = await decryptNote(aesKey, d.notes);
          } catch {
            resolvedNotes = "⚠️ Could not decrypt notes";
          }
        }
        setForm({
          title: d.title,
          contactName: d.contactName,
          contactId: d.contactId,
          companyName: d.companyName,
          companyId: d.companyId,
          value: d.value,
          stage: d.stage,
          tags: d.tags,
          notes: resolvedNotes,
          nextActivityDate: d.nextActivityDate,
          nextActivityNote: d.nextActivityNote,
          nextActivityType: d.nextActivityType,
        });
        setValueInput(d.value > 0 ? String(d.value) : "");
        setTagsInput(d.tags.join(", "));
        setNextDate(bigintToDateInput(d.nextActivityDate));
        setNextType(d.nextActivityType ?? ActivityType.Call);
        setNextNote(d.nextActivityNote ?? "");
        setActivities(acts.sort((a, b) => Number(b.occurredAt - a.occurredAt)));
      })
      .catch((e) => console.error("Failed to load deal", e))
      .finally(() => setLoading(false));
  }, [id, isNew, actor, isFetching, aesKey]);

  async function handleSave() {
    if (!actor) return;
    setSaving(true);
    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    let notesValue = form.notes;
    if (aesKey && form.notes.length > 0 && !form.notes.startsWith("⚠️")) {
      try {
        notesValue = await encryptNote(aesKey, form.notes);
      } catch (e) {
        console.error("Encryption failed", e);
        toast.error("Encryption failed — notes saved as plaintext");
      }
    } else if (!aesKey && form.notes.length > 0) {
      toast.warning(
        "Encryption key not ready — notes saved without encryption",
      );
    }

    const data: DealInput = { ...form, tags, notes: notesValue };
    try {
      if (isNew) {
        const newId = await actor.createDeal(data);
        navigate({ to: "/deals/$id", params: { id: newId } });
      } else {
        await actor.updateDeal(id, data);
        navigate({ to: "/deals" });
      }
    } catch (e) {
      console.error("Failed to save deal", e);
      alert("Failed to save deal. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!actor || !confirm("Delete this deal?")) return;
    try {
      await actor.deleteDeal(id);
      navigate({ to: "/deals" });
    } catch (e) {
      console.error("Failed to delete deal", e);
      alert("Failed to delete deal.");
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
        dealId: id,
        dealName: form.title,
        companyId: "",
        companyName: "",
        occurredAt: BigInt(Date.now()),
      });
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

  async function handleScheduleNextActivity() {
    if (!actor) return;
    setSavingNextActivity(true);
    try {
      const dateMs = nextDate
        ? BigInt(new Date(nextDate).getTime())
        : undefined;
      await actor.setDealNextActivity(id, {
        date: dateMs,
        activityType: nextDate ? nextType : undefined,
        note: nextNote,
      });
      setForm((prev) => ({
        ...prev,
        nextActivityDate: dateMs,
        nextActivityType: nextDate ? nextType : undefined,
        nextActivityNote: nextNote,
      }));
    } catch (e) {
      console.error("Failed to schedule next activity", e);
    } finally {
      setSavingNextActivity(false);
    }
  }

  async function handleClearNextActivity() {
    if (!actor) return;
    setSavingNextActivity(true);
    try {
      await actor.setDealNextActivity(id, {
        date: undefined,
        activityType: undefined,
        note: "",
      });
      setNextDate("");
      setNextNote("");
      setNextType(ActivityType.Call);
      setForm((prev) => ({
        ...prev,
        nextActivityDate: undefined,
        nextActivityType: undefined,
        nextActivityNote: "",
      }));
    } catch (e) {
      console.error("Failed to clear next activity", e);
    } finally {
      setSavingNextActivity(false);
    }
  }

  function set<K extends keyof DealInput>(key: K, value: DealInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const stageBadge = STAGE_COLORS[form.stage];
  const hasScheduledActivity = !!form.nextActivityDate;

  const notesHaveContent = form.notes.length > 0 && !form.notes.startsWith("⚠️");
  const showEncryptedBadge =
    wasEncrypted || (aesKey !== null && notesHaveContent);
  const showUnencryptedBadge =
    !wasEncrypted && !isEncrypted(form.notes) && notesHaveContent && !aesKey;

  if (loading)
    return (
      <div className="p-4 md:p-8 text-sm text-muted-foreground">Loading...</div>
    );

  return (
    <div className="p-4 md:p-8 max-w-2xl">
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <button
          type="button"
          data-ocid="deal_detail.link"
          onClick={() => navigate({ to: "/deals" })}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className="font-heading text-xl font-semibold text-foreground flex-1 min-w-0 truncate">
          {isNew ? "New Deal" : form.title || "Deal"}
        </h1>
        <div className="flex gap-2">
          {!isNew && (
            <button
              type="button"
              data-ocid="deal_detail.open_modal_button"
              onClick={() => setShowNoteForm((v) => !v)}
              className="flex items-center gap-1.5 border border-border hover:bg-secondary text-foreground text-sm font-medium px-3 py-2 rounded-lg transition-colors"
            >
              <Plus size={14} /> Log Activity
            </button>
          )}
          {!isNew && (
            <button
              type="button"
              data-ocid="deal_detail.delete_button"
              onClick={handleDelete}
              className="flex items-center gap-1.5 border border-rose-200 text-rose-600 hover:bg-rose-50 text-sm font-medium px-3 py-2 rounded-lg transition-colors"
            >
              <Trash2 size={14} />
            </button>
          )}
          <button
            type="button"
            data-ocid="deal_detail.save_button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-60"
          >
            <Save size={14} />
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-xs p-4 md:p-6 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="col-span-1 sm:col-span-2">
            <label
              htmlFor="deal-title"
              className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5"
            >
              Title
            </label>
            <input
              id="deal-title"
              data-ocid="deal_detail.input"
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-card focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <label
              htmlFor="deal-company"
              className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5"
            >
              Company
            </label>
            <input
              id="deal-company"
              value={form.companyName}
              onChange={(e) => set("companyName", e.target.value)}
              className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-card focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <label
              htmlFor="deal-contact"
              className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5"
            >
              Contact
            </label>
            <input
              id="deal-contact"
              value={form.contactName}
              onChange={(e) => set("contactName", e.target.value)}
              className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-card focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            {/* Deal value with Sensitive badge */}
            <div className="flex items-center gap-2 mb-1.5">
              <Lock size={12} className="text-amber-500 flex-shrink-0" />
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Value ($)
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                Sensitive
              </span>
            </div>
            <input
              id="deal-value"
              type="text"
              inputMode="decimal"
              placeholder="0"
              value={valueInput}
              onChange={(e) => {
                const raw = e.target.value
                  .replace(/[^0-9.]/g, "")
                  .replace(/^0+(\d)/, "$1");
                setValueInput(raw);
                set("value", raw === "" ? 0 : Number(raw));
              }}
              onBlur={() => {
                const cleaned = valueInput.replace(/\.$/, "");
                setValueInput(cleaned);
                set("value", cleaned === "" ? 0 : Number(cleaned));
              }}
              className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-card focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <label
              htmlFor="deal-stage"
              className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5"
            >
              Stage
            </label>
            <div className="flex items-center gap-2">
              <select
                id="deal-stage"
                data-ocid="deal_detail.select"
                value={form.stage as unknown as string}
                onChange={(e) =>
                  set("stage", e.target.value as unknown as Stage)
                }
                className="flex-1 px-3 py-2 text-sm border border-border rounded-lg bg-card focus:outline-none"
              >
                {STAGE_OPTIONS.map((o) => (
                  <option key={o.label} value={o.value as unknown as string}>
                    {o.label}
                  </option>
                ))}
              </select>
              <span
                className={`inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full border ${stageBadge.border} ${stageBadge.bg} ${stageBadge.text} whitespace-nowrap flex-shrink-0`}
              >
                {STAGE_OPTIONS.find((o) => o.value === form.stage)?.label}
              </span>
            </div>
          </div>
          <div className="col-span-1 sm:col-span-2">
            <label
              htmlFor="deal-tags"
              className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5"
            >
              Tags (comma-separated)
            </label>
            <input
              id="deal-tags"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="e.g. enterprise, q4, strategic"
              className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-card focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div className="col-span-1 sm:col-span-2">
            {/* Notes label with encryption status */}
            <div className="flex items-center gap-2 mb-1.5">
              <Lock size={12} className="text-primary flex-shrink-0" />
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Notes
              </span>
              {showEncryptedBadge && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Encrypted
                </span>
              )}
              {showUnencryptedBadge && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                  Unencrypted
                </span>
              )}
            </div>
            <textarea
              id="deal-notes"
              data-ocid="deal_detail.textarea"
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              rows={4}
              className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-card focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
            <p className="mt-1 text-xs text-muted-foreground/70 flex items-center gap-1">
              <Lock size={10} />
              Notes are encrypted on-chain — only you can read them
            </p>
          </div>
        </div>
      </div>

      {/* Next Activity Section */}
      {!isNew && (
        <div className="bg-card rounded-xl border border-border shadow-xs p-4 md:p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
              <Calendar size={14} className="text-amber-600" />
            </div>
            <h2 className="font-heading text-sm font-semibold text-foreground">
              Next Activity
            </h2>
            {hasScheduledActivity && (
              <span className="ml-auto inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                Scheduled
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <div>
              <label
                htmlFor="next-date"
                className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5"
              >
                Date
              </label>
              <input
                id="next-date"
                data-ocid="deal_detail.next_activity_input"
                type="date"
                value={nextDate}
                onChange={(e) => setNextDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-card focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label
                htmlFor="next-type"
                className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5"
              >
                Type
              </label>
              <select
                id="next-type"
                data-ocid="deal_detail.next_activity_select"
                value={nextType as unknown as string}
                onChange={(e) =>
                  setNextType(e.target.value as unknown as ActivityType)
                }
                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-card focus:outline-none"
              >
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
            <div>
              <label
                htmlFor="next-note"
                className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5"
              >
                Purpose
              </label>
              <input
                id="next-note"
                data-ocid="deal_detail.next_activity_note_input"
                value={nextNote}
                onChange={(e) => setNextNote(e.target.value)}
                placeholder="e.g. Follow-up on proposal"
                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-card focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              data-ocid="deal_detail.schedule_button"
              onClick={handleScheduleNextActivity}
              disabled={savingNextActivity || !nextDate}
              className="flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-60"
            >
              <Calendar size={13} />
              {savingNextActivity ? "Saving..." : "Schedule"}
            </button>
            {hasScheduledActivity && (
              <button
                type="button"
                data-ocid="deal_detail.clear_schedule_button"
                onClick={handleClearNextActivity}
                disabled={savingNextActivity}
                className="flex items-center gap-1.5 border border-border text-muted-foreground hover:text-foreground hover:bg-secondary text-sm font-medium px-3 py-2 rounded-lg transition-colors disabled:opacity-60"
              >
                <X size={13} /> Clear
              </button>
            )}
          </div>
        </div>
      )}

      {!isNew && showNoteForm && (
        <div className="bg-card rounded-xl border border-border shadow-xs p-4 md:p-6 mb-6">
          <h2 className="font-heading text-sm font-semibold text-foreground mb-4">
            Log Activity
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label
                htmlFor="note-title"
                className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5"
              >
                Title
              </label>
              <input
                id="note-title"
                data-ocid="deal_detail.notes_input"
                value={noteTitle}
                onChange={(e) => setNoteTitle(e.target.value)}
                placeholder="Activity title..."
                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-card focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label
                htmlFor="note-type"
                className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5"
              >
                Type
              </label>
              <select
                id="note-type"
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
                htmlFor="note-desc"
                className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5"
              >
                Description
              </label>
              <textarea
                id="note-desc"
                data-ocid="deal_detail.notes_textarea"
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
              data-ocid="deal_detail.submit_button"
              onClick={handleSaveNote}
              disabled={savingNote}
              className="bg-primary text-primary-foreground text-sm font-medium px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-60"
            >
              {savingNote ? "Saving..." : "Save"}
            </button>
            <button
              type="button"
              data-ocid="deal_detail.cancel_button"
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
