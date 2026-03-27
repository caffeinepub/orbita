import { useNavigate, useParams } from "@tanstack/react-router";
import {
  ArrowLeft,
  FileText,
  Lock,
  Mail,
  Phone,
  Save,
  Trash2,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { Activity } from "../backend";
import type { ContactInput } from "../backend.d";
import { ActivityType } from "../backend.d";
import { useActor } from "../hooks/useActor";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  decryptNote,
  encryptNote,
  getOrDeriveAesKey,
  isEncrypted,
} from "../lib/vetkeys";

const emptyForm: ContactInput = {
  name: "",
  company: "",
  companyId: "",
  role: "",
  email: "",
  phone: "",
  linkedIn: "",
  notes: "",
  tags: [],
};

const formFields: {
  key: keyof ContactInput;
  label: string;
  id: string;
  type: string;
}[] = [
  { key: "name", label: "Name", id: "c-name", type: "text" },
  { key: "company", label: "Company", id: "c-company", type: "text" },
  { key: "role", label: "Role", id: "c-role", type: "text" },
  { key: "linkedIn", label: "LinkedIn URL", id: "c-linkedin", type: "url" },
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

export default function ContactDetail() {
  const { id } = useParams({ strict: false }) as { id: string };
  const navigate = useNavigate();
  const { actor } = useActor();
  const { identity } = useInternetIdentity();
  const isNew = id === "new";

  const [form, setForm] = useState<ContactInput>(emptyForm);
  const [tagsInput, setTagsInput] = useState("");
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [aesKey, setAesKey] = useState<CryptoKey | null>(null);

  // Derive AES key once per session when actor + identity are ready
  useEffect(() => {
    if (!actor || !identity) return;
    const principalBytes = identity.getPrincipal().toUint8Array();
    getOrDeriveAesKey(
      actor as unknown as Parameters<typeof getOrDeriveAesKey>[0],
      principalBytes,
    )
      .then((key) => setAesKey(key))
      .catch((e) => console.warn("vetkd key derivation failed", e));
  }, [actor, identity]);

  useEffect(() => {
    if (isNew || !actor) return;
    setLoading(true);
    Promise.all([actor.getContact(id), actor.listActivitiesByContact(id)])
      .then(async ([c, acts]) => {
        let resolvedEmail = c.email;
        let resolvedPhone = c.phone;
        if (aesKey) {
          if (isEncrypted(c.email)) {
            resolvedEmail = await decryptNote(aesKey, c.email).catch(
              () => "⚠️ Could not decrypt",
            );
          }
          if (isEncrypted(c.phone)) {
            resolvedPhone = await decryptNote(aesKey, c.phone).catch(
              () => "⚠️ Could not decrypt",
            );
          }
        }
        setForm({
          name: c.name,
          company: c.company,
          companyId: c.companyId,
          role: c.role,
          email: resolvedEmail,
          phone: resolvedPhone,
          linkedIn: c.linkedIn,
          notes: c.notes,
          tags: c.tags,
        });
        setTagsInput(c.tags.join(", "));
        setActivities(acts.sort((a, b) => Number(b.occurredAt - a.occurredAt)));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id, actor, isNew, aesKey]);

  async function handleSave() {
    if (!actor) return;
    setSaving(true);
    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    let emailValue = form.email;
    let phoneValue = form.phone;
    if (aesKey) {
      if (form.email.length > 0 && !form.email.startsWith("⚠️")) {
        emailValue = await encryptNote(aesKey, form.email).catch(
          () => form.email,
        );
      }
      if (form.phone.length > 0 && !form.phone.startsWith("⚠️")) {
        phoneValue = await encryptNote(aesKey, form.phone).catch(
          () => form.phone,
        );
      }
    }
    const input = { ...form, tags, email: emailValue, phone: phoneValue };
    try {
      if (isNew) {
        const newId = await actor.createContact(input);
        navigate({ to: "/contacts/$id", params: { id: newId } });
      } else {
        await actor.updateContact(id, input);
        navigate({ to: "/contacts" });
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!actor || !confirm("Delete this contact?")) return;
    await actor.deleteContact(id);
    navigate({ to: "/contacts" });
  }

  function set(key: keyof ContactInput, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  if (loading)
    return (
      <div className="p-4 md:p-8 text-sm text-muted-foreground">Loading...</div>
    );

  return (
    <div className="p-4 md:p-8 max-w-3xl">
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <button
          type="button"
          onClick={() => navigate({ to: "/contacts" })}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className="font-heading text-xl font-semibold text-foreground flex-1 min-w-0 truncate">
          {isNew ? "New Contact" : form.name || "Contact"}
        </h1>
        <div className="flex gap-2">
          {!isNew && (
            <button
              type="button"
              onClick={handleDelete}
              className="flex items-center gap-1.5 border border-red-200 hover:bg-red-50 text-red-600 text-sm font-medium px-3 py-2 rounded-lg transition-colors"
            >
              <Trash2 size={14} /> Delete
            </button>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-60"
          >
            <Save size={14} /> {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-xs p-4 md:p-6 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {formFields.map(({ key, label, id: fid, type }) => (
            <div key={key}>
              <label
                htmlFor={fid}
                className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5"
              >
                {label}
              </label>
              <input
                id={fid}
                type={type}
                value={form[key] as string}
                onChange={(e) => set(key, e.target.value)}
                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-card focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          ))}

          {/* Encrypted Email field */}
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Lock size={12} className="text-primary flex-shrink-0" />
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Email
              </span>
              {aesKey && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Encrypted
                </span>
              )}
            </div>
            <input
              id="c-email"
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-card focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* Encrypted Phone field */}
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Lock size={12} className="text-primary flex-shrink-0" />
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Phone
              </span>
              {aesKey && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Encrypted
                </span>
              )}
            </div>
            <input
              id="c-phone"
              type="tel"
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-card focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div className="col-span-1 sm:col-span-2">
            <label
              htmlFor="c-tags"
              className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5"
            >
              Tags (comma-separated)
            </label>
            <input
              id="c-tags"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="e.g. enterprise, warm, priority"
              className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-card focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div className="col-span-1 sm:col-span-2">
            <label
              htmlFor="c-notes"
              className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5"
            >
              Notes
            </label>
            <textarea
              id="c-notes"
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              rows={3}
              className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-card focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
          </div>
        </div>
      </div>

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
