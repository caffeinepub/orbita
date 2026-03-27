import { Shield, Zap } from "lucide-react";
import { useInternetIdentity } from "../hooks/useInternetIdentity";

export default function Login() {
  const { login, isLoggingIn } = useInternetIdentity();
  return (
    <div className="min-h-screen flex items-center justify-center bg-sidebar">
      <div className="bg-card rounded-2xl shadow-2xl p-10 w-full max-w-sm text-center">
        <div className="flex justify-center mb-5">
          <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center">
            <Zap
              size={28}
              className="text-primary-foreground"
              fill="currentColor"
            />
          </div>
        </div>
        <h1 className="font-heading text-2xl font-bold text-foreground mb-1">
          Orbita
        </h1>
        <p className="text-muted-foreground text-sm mb-8">
          B2B CRM for modern teams
        </p>
        <button
          type="button"
          data-ocid="login.submit_button"
          onClick={login}
          disabled={isLoggingIn}
          className="w-full flex items-center justify-center gap-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-3 px-5 rounded-xl transition-colors disabled:opacity-60"
        >
          <Shield size={16} />
          {isLoggingIn ? "Connecting..." : "Sign in with Internet Identity"}
        </button>
        <p className="text-xs text-muted-foreground/70 mt-6">
          Secure, decentralized authentication on the Internet Computer
        </p>
      </div>
    </div>
  );
}
