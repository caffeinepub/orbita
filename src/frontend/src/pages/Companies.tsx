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
  Building2,
  Download,
  Filter,
  Loader2,
  Plus,
  Search,
  Upload,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Company } from "../backend.d";
import { useActor } from "../hooks/useActor";
import { exportCSV } from "../lib/csv";

const COMPANY_FIELDS = [
  { key: "name", label: "Name (required)" },
  { key: "industry", label: "Industry" },
  { key: "website", label: "Website" },
  { key: "phone", label: "Phone" },
  { key: "address", label: "Address" },
  { key: "skip", label: "Skip" },
] as const;

type CompanyFieldKey = (typeof COMPANY_FIELDS)[number]["key"];

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

export default function Companies() {
  const navigate = useNavigate();
  const { actor, isFetching } = useActor();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [search, setSearch] = useState("");
  const [industryFilter, setIndustryFilter] = useState("");
  const [loading, setLoading] = useState(true);

  // CSV import state
  const [importOpen, setImportOpen] = useState(false);
  const [importStep, setImportStep] = useState<ImportStep>("upload");
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<number, CompanyFieldKey>>({});
  const [importProgress, setImportProgress] = useState(0);
  const [importTotal, setImportTotal] = useState(0);
  const [importDone, setImportDone] = useState({ imported: 0, skipped: 0 });
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    if (!actor) return;
    setLoading(true);
    try {
      const data = await actor.listCompanies();
      setCompanies(data);
    } catch (e) {
      console.error("Failed to load companies", e);
    } finally {
      setLoading(false);
    }
  }, [actor]);

  useEffect(() => {
    if (!isFetching && actor) load();
  }, [actor, isFetching, load]);

  const industries = useMemo(() => {
    const set = new Set(companies.map((c) => c.industry).filter(Boolean));
    return Array.from(set).sort();
  }, [companies]);

  const filtered = useMemo(() => {
    let result = companies;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.industry.toLowerCase().includes(q),
      );
    }
    if (industryFilter) {
      result = result.filter((c) => c.industry === industryFilter);
    }
    return result;
  }, [companies, search, industryFilter]);

  function handleExport() {
    exportCSV(
      "companies.csv",
      filtered.map((c) => ({
        Name: c.name,
        Industry: c.industry,
        Website: c.website,
        Phone: c.phone,
        Address: c.address,
        Notes: c.notes,
      })),
    );
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
      const auto: Record<number, CompanyFieldKey> = {};
      headers.forEach((h, i) => {
        const hl = h.toLowerCase();
        if (hl.includes("name")) auto[i] = "name";
        else if (hl.includes("industry")) auto[i] = "industry";
        else if (hl.includes("website") || hl.includes("url"))
          auto[i] = "website";
        else if (hl.includes("phone")) auto[i] = "phone";
        else if (hl.includes("address")) auto[i] = "address";
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

    const fieldMap: Record<number, CompanyFieldKey> = mapping;

    for (let i = 0; i < csvRows.length; i++) {
      const row = csvRows[i];
      const get = (field: CompanyFieldKey) => {
        const idx = Object.entries(fieldMap).find(([, f]) => f === field)?.[0];
        return idx !== undefined ? (row[Number(idx)] ?? "") : "";
      };
      const name = get("name").trim();
      if (!name) {
        skipped++;
      } else {
        try {
          await actor.createCompany({
            name,
            industry: get("industry"),
            website: get("website"),
            phone: get("phone"),
            address: get("address"),
            notes: "",
            tags: [],
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
            Companies
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {filtered.length} companies
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
            data-ocid="companies.upload_button"
            onClick={() => setImportOpen(true)}
            className="flex items-center gap-1.5 border border-border bg-card hover:bg-secondary text-sm text-foreground/80 font-medium px-3 py-2 rounded-lg transition-colors"
          >
            <Upload size={14} /> Import CSV
          </button>
          <button
            type="button"
            data-ocid="companies.primary_button"
            onClick={() =>
              navigate({ to: "/companies/$id", params: { id: "new" } })
            }
            className="flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <Plus size={14} /> Add Company
          </button>
        </div>
      </div>

      {/* Search + filter */}
      <div className="flex flex-wrap gap-2 mb-5">
        <div className="relative flex-1 min-w-[160px] max-w-sm">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            data-ocid="companies.search_input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search companies..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-lg bg-card focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        {industries.length > 0 && (
          <div className="relative">
            <Filter
              size={13}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <select
              data-ocid="companies.select"
              value={industryFilter}
              onChange={(e) => setIndustryFilter(e.target.value)}
              className="pl-8 pr-8 py-2 text-sm border border-border rounded-lg bg-card focus:outline-none appearance-none cursor-pointer"
            >
              <option value="">All Industries</option>
              {industries.map((ind) => (
                <option key={ind} value={ind}>
                  {ind}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {loading ? (
        <div
          data-ocid="companies.loading_state"
          className="py-10 text-center text-sm text-muted-foreground"
        >
          Loading...
        </div>
      ) : filtered.length === 0 ? (
        <div
          data-ocid="companies.empty_state"
          className="py-10 text-center text-sm text-muted-foreground"
        >
          No companies found.{" "}
          <button
            type="button"
            onClick={() =>
              navigate({ to: "/companies/$id", params: { id: "new" } })
            }
            className="text-primary hover:underline"
          >
            Add one?
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((c, i) => (
            <button
              key={c.id}
              type="button"
              data-ocid={`companies.item.${i + 1}`}
              onClick={() =>
                navigate({ to: "/companies/$id", params: { id: c.id } })
              }
              className="bg-card rounded-xl border border-border shadow-xs p-5 text-left hover:shadow-md hover:bg-secondary/30 transition-all duration-150"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Building2 size={20} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-foreground truncate">
                    {c.name}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {c.industry || "—"}
                  </div>
                </div>
              </div>
              {c.website && (
                <div className="text-xs text-primary truncate">{c.website}</div>
              )}
              {c.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
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
          ))}
        </div>
      )}

      {/* CSV Import Dialog */}
      <Dialog
        open={importOpen}
        onOpenChange={(o) => {
          if (!o) closeImport();
        }}
      >
        <DialogContent className="max-w-lg" data-ocid="companies.dialog">
          <DialogHeader>
            <DialogTitle>Import Companies from CSV</DialogTitle>
          </DialogHeader>

          {importStep === "upload" && (
            <div>
              <button
                type="button"
                data-ocid="companies.dropzone"
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
                Expected columns: name, industry, website, phone, address
              </p>
            </div>
          )}

          {importStep === "map" && (
            <div>
              <p className="text-sm text-muted-foreground mb-4">
                Map your CSV columns to company fields. {csvRows.length} rows
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
                          [colIdx]: e.target.value as CompanyFieldKey,
                        }))
                      }
                      className="flex-1 px-2 py-1.5 text-sm border border-border rounded-lg bg-card focus:outline-none appearance-none"
                    >
                      {COMPANY_FIELDS.map((f) => (
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
                  data-ocid="companies.cancel_button"
                  onClick={closeImport}
                >
                  Cancel
                </Button>
                <Button
                  data-ocid="companies.confirm_button"
                  onClick={runImport}
                >
                  Import {csvRows.length} companies
                </Button>
              </div>
            </div>
          )}

          {importStep === "import" && (
            <div
              className="py-6 text-center"
              data-ocid="companies.loading_state"
            >
              <Loader2
                size={24}
                className="animate-spin mx-auto mb-3 text-primary"
              />
              <p className="text-sm font-medium text-foreground mb-3">
                Importing companies...
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
              data-ocid="companies.success_state"
            >
              <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
                <span className="text-emerald-600 text-xl">✓</span>
              </div>
              <p className="text-sm font-semibold text-foreground mb-1">
                Import complete
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                {importDone.imported} companies imported, {importDone.skipped}{" "}
                skipped
              </p>
              <Button data-ocid="companies.close_button" onClick={closeImport}>
                Close
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
