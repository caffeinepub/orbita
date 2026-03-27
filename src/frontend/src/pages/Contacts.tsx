import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { useNavigate } from "@tanstack/react-router";
import {
  Download,
  Loader2,
  Mail,
  Phone,
  Plus,
  Search,
  Tag,
  Upload,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Contact } from "../backend.d";
import { useActor } from "../hooks/useActor";
import { exportCSV } from "../lib/csv";

const CONTACT_FIELDS = [
  { key: "name", label: "Name (required)" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "company", label: "Company" },
  { key: "role", label: "Role" },
  { key: "skip", label: "Skip" },
] as const;

type ContactFieldKey = (typeof CONTACT_FIELDS)[number]["key"];

function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 1) return { headers: [], rows: [] };
  const parse = (line: string) =>
    line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
  const headers = parse(lines[0]);
  const rows = lines.slice(1).map(parse);
  return { headers, rows };
}

type ImportStep = "upload" | "map" | "import" | "done";

export default function Contacts() {
  const navigate = useNavigate();
  const { actor } = useActor();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [loading, setLoading] = useState(false);

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkWorking, setBulkWorking] = useState(false);

  // CSV import state
  const [importOpen, setImportOpen] = useState(false);
  const [importStep, setImportStep] = useState<ImportStep>("upload");
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<number, ContactFieldKey>>({});
  const [importProgress, setImportProgress] = useState(0);
  const [importTotal, setImportTotal] = useState(0);
  const [importDone, setImportDone] = useState({ imported: 0, skipped: 0 });
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    if (!actor) return;
    setLoading(true);
    try {
      const data = search
        ? await actor.searchContacts(search)
        : await actor.listContacts();
      setContacts(data);
    } finally {
      setLoading(false);
    }
  }, [actor, search]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = tagFilter
    ? contacts.filter((c) =>
        c.tags.some((t) => t.toLowerCase().includes(tagFilter.toLowerCase())),
      )
    : contacts;

  const allTags = Array.from(new Set(contacts.flatMap((c) => c.tags))).slice(
    0,
    20,
  );

  function handleExport() {
    exportCSV(
      "contacts.csv",
      filtered.map((c) => ({
        Name: c.name,
        Company: c.company,
        Role: c.role,
        Email: c.email,
        Phone: c.phone,
        LinkedIn: c.linkedIn,
        Tags: c.tags.join(";"),
        Notes: c.notes,
      })),
    );
  }

  const goToContact = (id: string) =>
    navigate({ to: "/contacts/$id", params: { id } });

  // Bulk selection helpers
  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((c) => c.id)));
    }
  }

  async function handleBulkDelete() {
    if (!actor || selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} selected contact(s)?`)) return;
    setBulkWorking(true);
    try {
      await Promise.all(
        Array.from(selectedIds).map((id) => actor.deleteContact(id)),
      );
      setSelectedIds(new Set());
      await load();
    } catch (e) {
      console.error("Bulk delete failed", e);
    } finally {
      setBulkWorking(false);
    }
  }

  // CSV import logic
  function handleFile(file: File) {
    if (!file.name.endsWith(".csv")) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const { headers, rows } = parseCSV(text);
      setCsvHeaders(headers);
      setCsvRows(rows);
      const auto: Record<number, ContactFieldKey> = {};
      headers.forEach((h, i) => {
        const hl = h.toLowerCase();
        if (hl.includes("name")) auto[i] = "name";
        else if (hl.includes("email")) auto[i] = "email";
        else if (hl.includes("phone")) auto[i] = "phone";
        else if (hl.includes("company")) auto[i] = "company";
        else if (
          hl.includes("role") ||
          hl.includes("title") ||
          hl.includes("position")
        )
          auto[i] = "role";
        else auto[i] = "skip";
      });
      setMapping(auto);
      setImportStep("map");
    };
    reader.readAsText(file);
  }

  function handleFileDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  async function runImport() {
    if (!actor) return;
    setImportStep("import");
    let imported = 0;
    let skipped = 0;
    const total = csvRows.length;
    setImportTotal(total);
    setImportProgress(0);

    const fieldMap: Record<number, ContactFieldKey> = mapping;

    for (let i = 0; i < csvRows.length; i++) {
      const row = csvRows[i];
      const get = (field: ContactFieldKey) => {
        const idx = Object.entries(fieldMap).find(([, f]) => f === field)?.[0];
        return idx !== undefined ? (row[Number(idx)] ?? "") : "";
      };
      const name = get("name").trim();
      if (!name) {
        skipped++;
      } else {
        try {
          await actor.createContact({
            name,
            email: get("email"),
            phone: get("phone"),
            company: get("company"),
            role: get("role"),
            linkedIn: "",
            tags: [],
            notes: "",
            companyId: "",
          });
          imported++;
        } catch {
          skipped++;
        }
      }
      setImportProgress(i + 1);
    }
    setImportDone({ imported, skipped });
    setImportStep("done");
  }

  function closeImport() {
    setImportOpen(false);
    setImportStep("upload");
    setCsvHeaders([]);
    setCsvRows([]);
    setMapping({});
    setImportProgress(0);
    if (importStep === "done") load();
  }

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="font-heading text-xl font-semibold text-foreground">
            Contacts
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {filtered.length} contacts
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExport}
            className="flex items-center gap-1.5 border border-border bg-card hover:bg-secondary text-sm text-foreground/80 font-medium px-3 py-2 rounded-lg transition-colors"
          >
            <Download size={14} /> Export CSV
          </button>
          <button
            type="button"
            data-ocid="contacts.upload_button"
            onClick={() => setImportOpen(true)}
            className="flex items-center gap-1.5 border border-border bg-card hover:bg-secondary text-sm text-foreground/80 font-medium px-3 py-2 rounded-lg transition-colors"
          >
            <Upload size={14} /> Import CSV
          </button>
          <button
            type="button"
            data-ocid="contacts.primary_button"
            onClick={() =>
              navigate({ to: "/contacts/$id", params: { id: "new" } })
            }
            className="flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <Plus size={14} /> Add Contact
          </button>
        </div>
      </div>

      <div className="flex gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            data-ocid="contacts.search_input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search contacts..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-lg bg-card focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        {allTags.length > 0 && (
          <div className="relative">
            <Tag
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <select
              value={tagFilter}
              onChange={(e) => setTagFilter(e.target.value)}
              className="pl-9 pr-8 py-2 text-sm border border-border rounded-lg bg-card focus:outline-none appearance-none cursor-pointer"
            >
              <option value="">All Tags</option>
              {allTags.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-card rounded-xl border border-border shadow-xs overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-secondary">
              <th className="px-4 py-3 w-10">
                <input
                  type="checkbox"
                  data-ocid="contacts.list.checkbox"
                  checked={
                    selectedIds.size > 0 && selectedIds.size === filtered.length
                  }
                  onChange={toggleSelectAll}
                  className="rounded border-border cursor-pointer"
                />
              </th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Name
              </th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Company
              </th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Role
              </th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Contact
              </th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Tags
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr>
                <td
                  colSpan={6}
                  className="text-center py-10 text-sm text-muted-foreground"
                >
                  Loading...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  data-ocid="contacts.empty_state"
                  className="text-center py-10 text-sm text-muted-foreground"
                >
                  No contacts found.{" "}
                  <button
                    type="button"
                    onClick={() =>
                      navigate({ to: "/contacts/$id", params: { id: "new" } })
                    }
                    className="text-primary hover:underline"
                  >
                    Add one?
                  </button>
                </td>
              </tr>
            ) : (
              filtered.map((c, i) => (
                <tr
                  key={c.id}
                  data-ocid={`contacts.item.${i + 1}`}
                  onClick={() => goToContact(c.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") goToContact(c.id);
                  }}
                  tabIndex={0}
                  className={`group hover:bg-secondary/60 transition-colors cursor-pointer outline-none focus:bg-secondary/60 ${
                    selectedIds.has(c.id) ? "bg-primary/5" : ""
                  }`}
                >
                  <td
                    className="px-4 py-3 w-10"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.has(c.id)}
                      onChange={() => toggleSelect(c.id)}
                      className="rounded border-border cursor-pointer"
                    />
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold flex-shrink-0">
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm font-medium text-foreground">
                        {c.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-foreground/80">
                    {c.company || "—"}
                  </td>
                  <td className="px-5 py-3.5 text-sm text-foreground/80">
                    {c.role || "—"}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      {c.email && (
                        <span className="flex items-center gap-1">
                          <Mail size={11} />
                          {c.email}
                        </span>
                      )}
                      {c.phone && (
                        <span className="flex items-center gap-1">
                          <Phone size={11} />
                          {c.phone}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex flex-wrap gap-1">
                      {c.tags.slice(0, 3).map((t) => (
                        <span
                          key={t}
                          className="px-2 py-0.5 bg-secondary text-secondary-foreground text-xs rounded-full"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile card list */}
      <div className="md:hidden space-y-2">
        {loading ? (
          <div className="text-center py-10 text-sm text-muted-foreground">
            Loading...
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-10 text-sm text-muted-foreground">
            No contacts found.{" "}
            <button
              type="button"
              onClick={() =>
                navigate({ to: "/contacts/$id", params: { id: "new" } })
              }
              className="text-primary hover:underline"
            >
              Add one?
            </button>
          </div>
        ) : (
          filtered.map((c, i) => (
            <div
              key={c.id}
              data-ocid={`contacts.mobile.item.${i + 1}`}
              className={`relative bg-card rounded-xl border border-border shadow-xs p-4 transition-colors ${
                selectedIds.has(c.id) ? "bg-primary/5 border-primary/30" : ""
              }`}
            >
              <div className="absolute top-3 right-3">
                <input
                  type="checkbox"
                  checked={selectedIds.has(c.id)}
                  onChange={() => toggleSelect(c.id)}
                  className="rounded border-border cursor-pointer"
                />
              </div>
              <button
                type="button"
                onClick={() => goToContact(c.id)}
                className="w-full text-left"
              >
                <div className="flex items-center gap-3 mb-2 pr-8">
                  <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold flex-shrink-0">
                    {c.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-foreground truncate">
                      {c.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {c.role || c.company || "—"}
                    </div>
                  </div>
                </div>
                {(c.email || c.phone) && (
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
                    {c.email && (
                      <span className="flex items-center gap-1 truncate">
                        <Mail size={11} />
                        <span className="truncate">{c.email}</span>
                      </span>
                    )}
                    {c.phone && (
                      <span className="flex items-center gap-1">
                        <Phone size={11} />
                        {c.phone}
                      </span>
                    )}
                  </div>
                )}
                {c.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {c.tags.slice(0, 3).map((t) => (
                      <span
                        key={t}
                        className="px-2 py-0.5 bg-secondary text-secondary-foreground text-xs rounded-full"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </button>
            </div>
          ))
        )}
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div
          data-ocid="contacts.bulk_action.panel"
          className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-foreground text-background rounded-xl shadow-lg px-4 py-3 flex items-center gap-3 z-50"
        >
          <span className="text-sm font-medium whitespace-nowrap">
            {selectedIds.size} selected
          </span>
          <button
            type="button"
            data-ocid="contacts.bulk_action.delete_button"
            disabled={bulkWorking}
            onClick={handleBulkDelete}
            className="px-3 py-1.5 bg-rose-500 text-white text-sm font-medium rounded-lg hover:bg-rose-600 transition-colors disabled:opacity-60"
          >
            Delete
          </button>
          <button
            type="button"
            data-ocid="contacts.bulk_action.cancel_button"
            onClick={() => setSelectedIds(new Set())}
            className="px-3 py-1.5 text-sm text-background/70 hover:text-background transition-colors"
          >
            Clear
          </button>
        </div>
      )}

      {/* CSV Import Dialog */}
      <Dialog
        open={importOpen}
        onOpenChange={(o) => {
          if (!o) closeImport();
        }}
      >
        <DialogContent className="max-w-lg" data-ocid="contacts.dialog">
          <DialogHeader>
            <DialogTitle>Import Contacts from CSV</DialogTitle>
          </DialogHeader>

          {importStep === "upload" && (
            <div>
              <button
                type="button"
                data-ocid="contacts.dropzone"
                className={`w-full border-2 border-dashed rounded-xl p-10 text-center transition-colors cursor-pointer ${
                  dragOver
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleFileDrop}
                onClick={() => fileInputRef.current?.click()}
                aria-label="Upload CSV file"
              >
                <Upload
                  size={24}
                  className="mx-auto mb-3 text-muted-foreground"
                />
                <p className="text-sm font-medium text-foreground mb-1">
                  Drop a CSV file here
                </p>
                <p className="text-xs text-muted-foreground">
                  or click to browse
                </p>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileInput}
              />
              <p className="text-xs text-muted-foreground mt-3">
                Expected columns: name, email, phone, company, role
              </p>
            </div>
          )}

          {importStep === "map" && (
            <div>
              <p className="text-sm text-muted-foreground mb-4">
                Map your CSV columns to contact fields. {csvRows.length} rows
                detected.
              </p>
              <div className="space-y-2 mb-4 max-h-56 overflow-y-auto">
                {csvHeaders.map((h, colIdx) => (
                  <div key={h} className="flex items-center gap-3">
                    <span className="text-sm font-medium text-foreground w-28 truncate flex-shrink-0">
                      {h}
                    </span>
                    <select
                      value={mapping[colIdx] ?? "skip"}
                      onChange={(e) =>
                        setMapping((prev) => ({
                          ...prev,
                          [colIdx]: e.target.value as ContactFieldKey,
                        }))
                      }
                      className="flex-1 px-2 py-1.5 text-sm border border-border rounded-lg bg-card focus:outline-none appearance-none"
                    >
                      {CONTACT_FIELDS.map((f) => (
                        <option key={f.key} value={f.key}>
                          {f.label}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              {/* Preview */}
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Preview (first 5 rows)
              </p>
              <div className="overflow-x-auto border border-border rounded-lg">
                <table className="w-full text-xs">
                  <thead className="bg-secondary">
                    <tr>
                      {csvHeaders.map((h) => (
                        <th
                          key={h}
                          className="px-3 py-2 text-left text-muted-foreground font-medium"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {csvRows.slice(0, 5).map((row) => (
                      <tr key={row.slice(0, 3).join("|")}>
                        {row.map((cell, ci) => (
                          <td
                            key={String(ci) + cell}
                            className="px-3 py-2 text-foreground/80 truncate max-w-[120px]"
                          >
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex gap-2 mt-4 justify-end">
                <Button
                  variant="outline"
                  data-ocid="contacts.cancel_button"
                  onClick={closeImport}
                >
                  Cancel
                </Button>
                <Button data-ocid="contacts.confirm_button" onClick={runImport}>
                  Import {csvRows.length} contacts
                </Button>
              </div>
            </div>
          )}

          {importStep === "import" && (
            <div
              className="py-6 text-center"
              data-ocid="contacts.loading_state"
            >
              <Loader2
                size={24}
                className="animate-spin mx-auto mb-3 text-primary"
              />
              <p className="text-sm font-medium text-foreground mb-3">
                Importing contacts...
              </p>
              <Progress
                value={(importProgress / importTotal) * 100}
                className="mb-2"
              />
              <p className="text-xs text-muted-foreground">
                {importProgress} / {importTotal}
              </p>
            </div>
          )}

          {importStep === "done" && (
            <div
              className="py-6 text-center"
              data-ocid="contacts.success_state"
            >
              <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
                <span className="text-emerald-600 text-xl">✓</span>
              </div>
              <p className="text-sm font-semibold text-foreground mb-1">
                Import complete
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                {importDone.imported} contacts imported, {importDone.skipped}{" "}
                skipped
              </p>
              <Button data-ocid="contacts.close_button" onClick={closeImport}>
                Close
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
