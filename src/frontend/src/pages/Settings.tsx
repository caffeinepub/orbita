import { useInternetIdentity } from "../hooks/useInternetIdentity";

export default function Settings() {
  const { identity, clear } = useInternetIdentity();
  const principal = identity?.getPrincipal().toString();

  return (
    <div className="p-4 md:p-8 max-w-2xl">
      <div className="mb-6">
        <h1 className="font-heading text-xl font-semibold text-foreground">
          Settings
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Account & preferences
        </p>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-xs p-5 md:p-6 mb-4">
        <h2 className="font-heading text-sm font-semibold text-foreground mb-4">
          Account
        </h2>
        <div className="space-y-3">
          <div>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
              Principal ID
            </div>
            <div className="text-sm text-foreground/80 font-mono break-all bg-secondary rounded-lg px-3 py-2">
              {principal || "Not logged in"}
            </div>
          </div>
        </div>
        {identity && (
          <button
            type="button"
            data-ocid="settings.delete_button"
            onClick={clear}
            className="mt-4 flex items-center gap-1.5 border border-red-200 hover:bg-red-50 text-red-600 text-sm font-medium px-3 py-2 rounded-lg transition-colors"
          >
            Log out
          </button>
        )}
      </div>
    </div>
  );
}
