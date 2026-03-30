import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  Database,
  FileSpreadsheet,
  Fingerprint,
  Globe,
  Kanban,
  Lock,
  Menu,
  Shield,
  Star,
  Users,
  X,
  Zap,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { useInternetIdentity } from "../hooks/useInternetIdentity";

// ─── Animated counter ────────────────────────────────────────────────────────
function Counter({ to, suffix = "" }: { to: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        let start = 0;
        const step = Math.ceil(to / 60) || 1;
        const timer = setInterval(() => {
          start += step;
          if (start >= to) {
            setCount(to);
            clearInterval(timer);
          } else {
            setCount(start);
          }
        }, 16);
      },
      { threshold: 0.5 },
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [to]);
  return (
    <span ref={ref}>
      {count.toLocaleString()}
      {suffix}
    </span>
  );
}

// ─── Pipeline mock card ───────────────────────────────────────────────────────
interface DealCardProps {
  company: string;
  value: string;
  stage: string;
  color: string;
}
function DealCard({ company, value, stage, color }: DealCardProps) {
  return (
    <div
      className="rounded-lg p-3 mb-2 border text-xs"
      style={{
        background: "oklch(0.20 0.028 260 / 0.8)",
        borderColor: "oklch(0.30 0.025 260)",
      }}
    >
      <div className="flex items-center justify-between mb-1">
        <span
          className="font-semibold"
          style={{ color: "oklch(0.90 0.01 260)" }}
        >
          {company}
        </span>
        <span
          className="text-[10px] px-1.5 py-0.5 rounded font-bold"
          style={{ background: color, color: "white" }}
        >
          {stage}
        </span>
      </div>
      <div style={{ color: "oklch(0.50 0.015 260)" }}>{value}</div>
    </div>
  );
}

// ─── Nav link button with hover state ────────────────────────────────────────
function NavLink({
  label,
  onClick,
  ocid,
}: {
  label: string;
  onClick: () => void;
  ocid: string;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="text-sm font-medium transition-colors duration-200"
      style={{
        color: hovered ? "oklch(0.95 0.01 260)" : "oklch(0.75 0.015 260)",
      }}
      data-ocid={ocid}
    >
      {label}
    </button>
  );
}

// ─── Main Landing component ───────────────────────────────────────────────────
export default function Landing() {
  const { login, isLoggingIn } = useInternetIdentity();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setMobileMenuOpen(false);
  };

  const navLinks = [
    { label: "Features", id: "features" },
    { label: "Why On-Chain", id: "why-on-chain" },
    { label: "Pipeline", id: "pipeline" },
  ];

  const features = [
    {
      icon: <Kanban className="w-6 h-6" />,
      title: "Pipeline Management",
      desc: "Drag-and-drop Kanban across 6 stages. See deal value, totals, and movement at every step.",
      accent: "oklch(0.52 0.19 255)",
      accentMid: "oklch(0.52 0.19 255 / 0.12)",
      accentBorder: "oklch(0.52 0.19 255 / 0.5)",
    },
    {
      icon: <Lock className="w-6 h-6" />,
      title: "On-Chain Encryption",
      desc: "Deal notes, emails, and phone numbers encrypted with ICP\u2019s vetKD protocol. Only you can read them.",
      accent: "oklch(0.62 0.20 295)",
      accentMid: "oklch(0.62 0.20 295 / 0.12)",
      accentBorder: "oklch(0.62 0.20 295 / 0.5)",
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: "Contacts & Companies",
      desc: "Structured relationship data with activity timelines, follow-up scheduling, and bulk actions.",
      accent: "oklch(0.62 0.18 220)",
      accentMid: "oklch(0.62 0.18 220 / 0.12)",
      accentBorder: "oklch(0.62 0.18 220 / 0.5)",
    },
    {
      icon: <BarChart3 className="w-6 h-6" />,
      title: "Reports & Analytics",
      desc: "Win rate trends, pipeline value by stage, average deal size \u2014 all in one dedicated reports page.",
      accent: "oklch(0.65 0.20 145)",
      accentMid: "oklch(0.65 0.20 145 / 0.12)",
      accentBorder: "oklch(0.65 0.20 145 / 0.5)",
    },
    {
      icon: <FileSpreadsheet className="w-6 h-6" />,
      title: "CSV Import / Export",
      desc: "Bring your existing data in or take it out anytime. Column mapping and preview included.",
      accent: "oklch(0.68 0.20 60)",
      accentMid: "oklch(0.68 0.20 60 / 0.12)",
      accentBorder: "oklch(0.68 0.20 60 / 0.5)",
    },
    {
      icon: <Fingerprint className="w-6 h-6" />,
      title: "Internet Identity Auth",
      desc: "No passwords. No phishing risk. Log in with ICP\u2019s cryptographic identity \u2014 your keys, your access.",
      accent: "oklch(0.62 0.22 25)",
      accentMid: "oklch(0.62 0.22 25 / 0.12)",
      accentBorder: "oklch(0.62 0.22 25 / 0.5)",
    },
  ];

  const whyCards = [
    {
      icon: <Database className="w-8 h-8" />,
      title: "Your data, always yours",
      body: "Traditional CRMs hold your data hostage. On ICP, your data lives in a smart contract you control. No vendor can delete, sell, or lock you out. Ever.",
      tag: "Permanent Storage",
      tagColor: "oklch(0.52 0.19 255)",
    },
    {
      icon: <Shield className="w-8 h-8" />,
      title: "Encryption you can prove",
      body: "vetKD uses ICP\u2019s threshold key protocol. Your sensitive fields are mathematically encrypted \u2014 not just a checkbox in a privacy policy. The math is the guarantee.",
      tag: "vetKD Protocol",
      tagColor: "oklch(0.62 0.20 295)",
    },
    {
      icon: <Globe className="w-8 h-8" />,
      title: "Built to last",
      body: 'ICP canisters run indefinitely. No AWS outage, no startup shutdown, no "we\u2019re sunsetting this product" email. Your CRM runs as long as the Internet itself.',
      tag: "Decentralized",
      tagColor: "oklch(0.65 0.20 145)",
    },
  ];

  const pipelineStages = [
    {
      label: "Lead",
      color: "oklch(0.45 0.02 260)",
      deals: [
        {
          company: "Acme Corp",
          value: "$12,000",
          stage: "New",
          color: "oklch(0.45 0.02 260)",
        },
        {
          company: "Globex Inc",
          value: "$8,500",
          stage: "New",
          color: "oklch(0.45 0.02 260)",
        },
      ],
    },
    {
      label: "Qualified",
      color: "oklch(0.52 0.19 255)",
      deals: [
        {
          company: "Initech",
          value: "$34,000",
          stage: "Qual",
          color: "oklch(0.52 0.19 255)",
        },
        {
          company: "Umbrella Ltd",
          value: "$22,000",
          stage: "Qual",
          color: "oklch(0.52 0.19 255)",
        },
      ],
    },
    {
      label: "Proposal",
      color: "oklch(0.62 0.20 295)",
      deals: [
        {
          company: "Stark Industries",
          value: "$95,000",
          stage: "Prop",
          color: "oklch(0.62 0.20 295)",
        },
      ],
    },
    {
      label: "Negotiation",
      color: "oklch(0.68 0.20 60)",
      deals: [
        {
          company: "Wayne Enterprises",
          value: "$140,000",
          stage: "Neg",
          color: "oklch(0.68 0.20 60)",
        },
      ],
    },
    {
      label: "Closed Won",
      color: "oklch(0.65 0.20 145)",
      deals: [
        {
          company: "Oscorp",
          value: "$67,000",
          stage: "Won",
          color: "oklch(0.65 0.20 145)",
        },
        {
          company: "LexCorp",
          value: "$51,000",
          stage: "Won",
          color: "oklch(0.65 0.20 145)",
        },
      ],
    },
  ];

  // FIX 3: Each stat gets its own gradient accent color for visual identity
  const stats = [
    {
      num: 100,
      suffix: "%",
      label: "On-Chain Storage",
      sub: "Every byte lives on ICP",
      gradient:
        "linear-gradient(135deg, oklch(0.65 0.22 255), oklch(0.70 0.20 280))",
    },
    {
      num: 6,
      suffix: "",
      label: "Pipeline Stages",
      sub: "Lead \u2192 Closed Won",
      gradient:
        "linear-gradient(135deg, oklch(0.68 0.22 295), oklch(0.72 0.18 320))",
    },
    {
      num: 3,
      suffix: "",
      label: "Encrypted Field Types",
      sub: "vetKD end-to-end",
      gradient:
        "linear-gradient(135deg, oklch(0.68 0.22 145), oklch(0.72 0.18 185))",
    },
    {
      num: 0,
      suffix: "",
      label: "Passwords Required",
      sub: "Internet Identity auth",
      gradient:
        "linear-gradient(135deg, oklch(0.68 0.22 25), oklch(0.72 0.20 45))",
    },
  ];

  const year = new Date().getFullYear();
  const utmLink = `https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`;

  return (
    <div
      className="min-h-screen overflow-x-hidden"
      style={{ background: "oklch(0.10 0.022 260)" }}
    >
      {/* ── NAVBAR ── */}
      <header
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
        style={{
          background: scrolled ? "oklch(0.14 0.028 260 / 0.96)" : "transparent",
          backdropFilter: scrolled ? "blur(20px)" : "none",
          borderBottom: scrolled ? "1px solid oklch(0.26 0.025 260)" : "none",
        }}
      >
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.52 0.19 255), oklch(0.55 0.18 295))",
              }}
            >
              <Zap className="w-4 h-4 text-white fill-white" />
            </div>
            <span
              className="text-xl font-heading font-bold tracking-tight"
              style={{ color: "oklch(0.96 0.01 260)" }}
            >
              Orbita
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map(({ label, id }) => (
              <NavLink
                key={id}
                label={label}
                onClick={() => scrollTo(id)}
                ocid={`nav.${id}.link`}
              />
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <Button
              onClick={login}
              disabled={isLoggingIn}
              className="font-semibold px-5 text-sm rounded-lg"
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.52 0.19 255), oklch(0.55 0.18 295))",
                color: "white",
                boxShadow: "0 0 20px oklch(0.52 0.19 255 / 0.35)",
              }}
              data-ocid="nav.signin.button"
            >
              {isLoggingIn ? "Connecting\u2026" : "Sign In"}
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>

          <button
            type="button"
            className="md:hidden p-2 rounded-lg"
            style={{ color: "oklch(0.85 0.01 260)" }}
            onClick={() => setMobileMenuOpen((p) => !p)}
            data-ocid="nav.menu.toggle"
          >
            {mobileMenuOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
        </div>

        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-t"
              style={{
                background: "oklch(0.14 0.03 260)",
                borderColor: "oklch(0.26 0.025 260)",
              }}
            >
              <div className="px-6 py-4 flex flex-col gap-4">
                {navLinks.map(({ label, id }) => (
                  <button
                    type="button"
                    key={id}
                    onClick={() => scrollTo(id)}
                    className="text-left text-sm font-medium"
                    style={{ color: "oklch(0.80 0.015 260)" }}
                  >
                    {label}
                  </button>
                ))}
                <Button
                  onClick={login}
                  disabled={isLoggingIn}
                  className="w-full font-semibold"
                  style={{ background: "oklch(0.52 0.19 255)", color: "white" }}
                  data-ocid="nav.mobile.signin.button"
                >
                  {isLoggingIn ? "Connecting\u2026" : "Sign In"}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* ── HERO ── */}
      {/* FIX 1: Deeper blobs, giant ghosted watermark, headline pushed to 7.5rem ceiling */}
      <section
        className="relative min-h-screen flex flex-col items-center justify-center text-center overflow-hidden px-6"
        style={{ background: "oklch(0.10 0.022 260)" }}
      >
        {/* Background image */}
        <div
          className="absolute inset-0 z-0"
          style={{
            backgroundImage:
              "url('/assets/generated/orbita-hero-bg.dim_1600x900.jpg')",
            backgroundSize: "cover",
            backgroundPosition: "center",
            opacity: 0.45,
          }}
        />

        {/* FIX 1A: Giant ghosted typographic watermark — depth layer */}
        <div
          aria-hidden="true"
          className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none select-none overflow-hidden"
        >
          <span
            className="font-heading font-extrabold tracking-tighter leading-none"
            style={{
              fontSize: "clamp(12rem, 30vw, 28rem)",
              background:
                "linear-gradient(135deg, oklch(0.52 0.19 255 / 0.07) 0%, oklch(0.55 0.18 295 / 0.04) 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              userSelect: "none",
              transform: "translateY(5%)",
            }}
          >
            CRM
          </span>
        </div>

        {/* Decorative blobs — more vivid */}
        <div
          className="absolute top-1/4 -left-24 w-[500px] h-[500px] rounded-full pointer-events-none"
          style={{
            background: "oklch(0.52 0.22 255 / 0.20)",
            filter: "blur(90px)",
          }}
        />
        <div
          className="absolute -bottom-12 right-0 w-[450px] h-[450px] rounded-full pointer-events-none"
          style={{
            background: "oklch(0.58 0.22 295 / 0.18)",
            filter: "blur(90px)",
          }}
        />
        <div
          className="absolute top-[60%] left-[60%] w-64 h-64 rounded-full pointer-events-none"
          style={{
            background: "oklch(0.65 0.20 145 / 0.12)",
            filter: "blur(60px)",
          }}
        />

        {/* Grid overlay */}
        <div
          className="absolute inset-0 z-0 pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(oklch(0.50 0.10 255 / 0.06) 1px, transparent 1px), linear-gradient(90deg, oklch(0.50 0.10 255 / 0.06) 1px, transparent 1px)",
            backgroundSize: "72px 72px",
          }}
        />

        {/* Bottom fade into stats */}
        <div
          className="absolute bottom-0 left-0 right-0 h-40 pointer-events-none z-10"
          style={{
            background:
              "linear-gradient(to bottom, transparent, oklch(0.10 0.025 260))",
          }}
        />

        {/* Content */}
        <div className="relative z-10 max-w-5xl mx-auto">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 mb-10 px-4 py-2 rounded-full border text-sm font-medium"
            style={{
              background: "oklch(0.52 0.19 255 / 0.14)",
              borderColor: "oklch(0.52 0.19 255 / 0.40)",
              color: "oklch(0.78 0.16 255)",
            }}
          >
            <span
              className="w-2 h-2 rounded-full animate-pulse"
              style={{ background: "oklch(0.78 0.16 255)" }}
            />
            Built on the Internet Computer \u00b7 Powered by vetKD
          </motion.div>

          {/* FIX 1B: Headline pushed to 7.5rem ceiling, tighter leading */}
          <motion.h1
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="font-heading font-extrabold tracking-tighter mb-8"
            style={{
              fontSize: "clamp(3.2rem, 9vw, 7.5rem)",
              lineHeight: 0.9,
              color: "oklch(0.97 0.008 260)",
            }}
          >
            Your CRM.{" "}
            <span
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.72 0.24 255) 0%, oklch(0.72 0.24 295) 50%, oklch(0.80 0.20 320) 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Encrypted.
            </span>
            <br />
            Permanent.{" "}
            <span
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.70 0.24 145) 0%, oklch(0.76 0.20 185) 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Yours.
            </span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed"
            style={{ color: "oklch(0.65 0.018 260)" }}
          >
            Orbita is the only CRM where your data is stored on-chain, encrypted
            end-to-end with ICP&apos;s vetKD protocol, and lives{" "}
            <em style={{ color: "oklch(0.82 0.015 260)", fontStyle: "italic" }}>
              permanently
            </em>{" "}
            \u2014 with no vendor in the middle, no passwords to lose, and no
            surprise shutdowns.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.35 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <button
              type="button"
              onClick={login}
              disabled={isLoggingIn}
              className="group relative flex items-center gap-2 px-9 py-4 rounded-xl font-heading font-bold text-base transition-all duration-200 hover:scale-105"
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.52 0.22 255) 0%, oklch(0.56 0.20 295) 100%)",
                color: "white",
                boxShadow:
                  "0 0 48px oklch(0.52 0.22 255 / 0.5), 0 2px 12px oklch(0.10 0.02 260 / 0.5)",
              }}
              data-ocid="hero.primary.button"
            >
              {isLoggingIn ? "Connecting\u2026" : "Get Started Free"}
              <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </button>
            <button
              type="button"
              onClick={() => scrollTo("features")}
              className="flex items-center gap-2 px-9 py-4 rounded-xl font-heading font-semibold text-base border transition-all duration-200 hover:scale-105"
              style={{
                borderColor: "oklch(0.52 0.19 255 / 0.45)",
                color: "oklch(0.78 0.12 255)",
                background: "oklch(0.52 0.19 255 / 0.08)",
              }}
              data-ocid="hero.explore.button"
            >
              Explore Features
            </button>
          </motion.div>

          {/* Trust badges */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.55 }}
            className="mt-12 flex flex-wrap items-center justify-center gap-6 text-xs"
            style={{ color: "oklch(0.50 0.015 260)" }}
          >
            {[
              "No credit card",
              "No password required",
              "Data lives on ICP forever",
              "Open canister architecture",
            ].map((t) => (
              <span key={t} className="flex items-center gap-1.5">
                <CheckCircle2
                  className="w-3.5 h-3.5"
                  style={{ color: "oklch(0.65 0.20 145)" }}
                />
                {t}
              </span>
            ))}
          </motion.div>
        </div>

        {/* Scroll cue */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.4, duration: 0.6 }}
          className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-20"
          style={{ color: "oklch(0.40 0.015 260)" }}
        >
          <span className="text-[10px] tracking-[0.25em] uppercase">
            Scroll
          </span>
          <div
            className="w-px h-10 animate-pulse"
            style={{
              background:
                "linear-gradient(to bottom, oklch(0.40 0.015 260), transparent)",
            }}
          />
        </motion.div>
      </section>

      {/* ── STATS STRIP ── */}
      {/* FIX 3: Gradient-colored numbers, scale contrast, dividers */}
      <section
        style={{
          background: "oklch(0.10 0.025 260)",
          borderTop: "1px solid oklch(0.20 0.025 260)",
          borderBottom: "1px solid oklch(0.20 0.025 260)",
        }}
      >
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-0">
            {stats.map(({ num, suffix, label, sub, gradient }, idx) => (
              <div
                key={label}
                className="text-center px-6 py-2"
                style={{
                  borderRight:
                    idx < stats.length - 1
                      ? "1px solid oklch(0.20 0.025 260)"
                      : "none",
                }}
              >
                <div
                  className="font-heading font-extrabold mb-1 tabular-nums"
                  style={{
                    fontSize: "clamp(2.5rem, 5vw, 4rem)",
                    background: gradient,
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                    lineHeight: 1,
                  }}
                >
                  <Counter to={num} suffix={suffix} />
                </div>
                <div
                  className="font-heading font-bold text-xs uppercase tracking-[0.12em] mb-1 mt-2"
                  style={{ color: "oklch(0.62 0.015 260)" }}
                >
                  {label}
                </div>
                <div
                  className="text-xs"
                  style={{ color: "oklch(0.44 0.012 260)" }}
                >
                  {sub}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES GRID ── */}
      {/* FIX 2: Dark navy section, glass cards with vivid left accent borders */}
      <section
        id="features"
        className="relative py-32 px-6"
        style={{ background: "oklch(0.12 0.024 260)" }}
      >
        {/* Background ambient */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none overflow-hidden"
        >
          <div
            className="absolute top-0 right-0 w-[600px] h-[400px] rounded-full"
            style={{
              background: "oklch(0.52 0.19 255 / 0.05)",
              filter: "blur(120px)",
            }}
          />
          <div
            className="absolute bottom-0 left-0 w-[500px] h-[350px] rounded-full"
            style={{
              background: "oklch(0.62 0.20 295 / 0.05)",
              filter: "blur(100px)",
            }}
          />
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-20"
          >
            <div
              className="inline-flex items-center gap-2 mb-4 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest border"
              style={{
                background: "oklch(0.52 0.19 255 / 0.12)",
                borderColor: "oklch(0.52 0.19 255 / 0.30)",
                color: "oklch(0.70 0.16 255)",
              }}
            >
              <Star className="w-3 h-3" /> Features
            </div>
            <h2
              className="font-heading font-extrabold leading-tight"
              style={{
                fontSize: "clamp(2rem, 4vw, 3.5rem)",
                color: "oklch(0.95 0.01 260)",
              }}
            >
              Everything a modern{" "}
              <span
                style={{
                  background:
                    "linear-gradient(135deg, oklch(0.70 0.22 255), oklch(0.72 0.20 295))",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                sales team
              </span>{" "}
              needs.
            </h2>
            <p
              className="mt-4 text-lg max-w-xl mx-auto"
              style={{ color: "oklch(0.55 0.018 260)" }}
            >
              Built for the full sales cycle \u2014 from first contact to closed
              deal \u2014 with on-chain security baked in from day one.
            </p>
          </motion.div>

          {/* FIX 2: Glass-dark cards with colored left border + inner gradient */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map(
              ({ icon, title, desc, accent, accentMid, accentBorder }, i) => (
                <motion.div
                  key={title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.08 }}
                  whileHover={{ y: -5, scale: 1.015 }}
                  className="group relative rounded-2xl overflow-hidden cursor-default"
                  style={{
                    background: `linear-gradient(135deg, ${accentMid} 0%, oklch(0.17 0.022 260 / 0.9) 60%)`,
                    border: `1px solid ${accentBorder}`,
                    boxShadow: "0 4px 24px oklch(0.08 0.02 260 / 0.5)",
                  }}
                >
                  {/* Left accent stripe */}
                  <div
                    className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-2xl"
                    style={{ background: accent }}
                  />

                  {/* Hover glow overlay */}
                  <div
                    className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                    style={{
                      background: `radial-gradient(ellipse at 30% 50%, ${accentMid} 0%, transparent 70%)`,
                    }}
                  />

                  <div className="pl-8 pr-7 pt-7 pb-7">
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center mb-5"
                      style={{ background: `${accentMid}`, color: accent }}
                    >
                      {icon}
                    </div>

                    <h3
                      className="font-heading font-bold text-lg mb-2"
                      style={{ color: "oklch(0.94 0.01 260)" }}
                    >
                      {title}
                    </h3>
                    <p
                      className="text-sm leading-relaxed"
                      style={{ color: "oklch(0.58 0.016 260)" }}
                    >
                      {desc}
                    </p>
                  </div>
                </motion.div>
              ),
            )}
          </div>
        </div>
      </section>

      {/* ── WHY ON-CHAIN ── */}
      <section
        id="why-on-chain"
        className="relative py-32 px-6"
        style={{ background: "oklch(0.10 0.022 260)" }}
      >
        <div
          className="absolute inset-0 pointer-events-none overflow-hidden"
          aria-hidden="true"
        >
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[450px] rounded-full"
            style={{
              background: "oklch(0.52 0.19 255 / 0.07)",
              filter: "blur(120px)",
            }}
          />
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-20"
          >
            <div
              className="inline-flex items-center gap-2 mb-4 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest border"
              style={{
                background: "oklch(0.52 0.19 255 / 0.14)",
                borderColor: "oklch(0.52 0.19 255 / 0.32)",
                color: "oklch(0.72 0.16 255)",
              }}
            >
              <Shield className="w-3 h-3" /> Why On-Chain
            </div>
            <h2
              className="font-heading font-extrabold leading-tight"
              style={{
                fontSize: "clamp(2rem, 4vw, 3.5rem)",
                color: "oklch(0.95 0.01 260)",
              }}
            >
              Why on-chain{" "}
              <span
                style={{
                  background:
                    "linear-gradient(135deg, oklch(0.70 0.24 255), oklch(0.72 0.22 295))",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                changes everything.
              </span>
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {whyCards.map(({ icon, title, body, tag, tagColor }, i) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.15 }}
                className="relative rounded-2xl p-8 border overflow-hidden"
                style={{
                  background: "oklch(0.16 0.024 260)",
                  borderColor: "oklch(0.26 0.024 260)",
                }}
              >
                <div
                  className="absolute top-0 right-0 w-36 h-36 rounded-bl-[90px] rounded-tr-2xl opacity-15 pointer-events-none"
                  style={{ background: tagColor }}
                />
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6"
                  style={{
                    background: `${tagColor.replace(")", " / 0.14)")}`,
                    color: tagColor,
                  }}
                >
                  {icon}
                </div>
                <div
                  className="inline-block mb-4 px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-widest"
                  style={{
                    background: `${tagColor.replace(")", " / 0.16)")}`,
                    color: tagColor,
                  }}
                >
                  {tag}
                </div>
                <h3
                  className="font-heading font-bold text-xl mb-3"
                  style={{ color: "oklch(0.93 0.01 260)" }}
                >
                  {title}
                </h3>
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: "oklch(0.58 0.014 260)" }}
                >
                  {body}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PIPELINE SHOWCASE ── */}
      <section
        id="pipeline"
        className="relative py-32 px-6"
        style={{ background: "oklch(0.12 0.024 260)" }}
      >
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <div
              className="inline-flex items-center gap-2 mb-4 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest border"
              style={{
                background: "oklch(0.52 0.19 255 / 0.10)",
                borderColor: "oklch(0.52 0.19 255 / 0.28)",
                color: "oklch(0.70 0.16 255)",
              }}
            >
              <Kanban className="w-3 h-3" /> Pipeline
            </div>
            <h2
              className="font-heading font-extrabold leading-tight"
              style={{
                fontSize: "clamp(2rem, 4vw, 3.5rem)",
                color: "oklch(0.95 0.01 260)",
              }}
            >
              Pipeline built for how you{" "}
              <span
                style={{
                  background:
                    "linear-gradient(135deg, oklch(0.65 0.22 255), oklch(0.70 0.20 145))",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                actually sell.
              </span>
            </h2>
            <p
              className="mt-4 text-lg max-w-lg mx-auto"
              style={{ color: "oklch(0.55 0.018 260)" }}
            >
              Drag-and-drop Kanban with deal values, stage totals, and per-deal
              activity \u2014 all stored permanently on-chain.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="rounded-2xl border overflow-hidden"
            style={{
              background: "oklch(0.13 0.026 260)",
              borderColor: "oklch(0.26 0.024 260)",
              boxShadow:
                "0 0 0 1px oklch(0.52 0.19 255 / 0.08), 0 40px 100px oklch(0.08 0.02 260 / 0.6)",
            }}
          >
            <div
              className="flex items-center gap-3 px-5 py-3.5 border-b"
              style={{ borderColor: "oklch(0.22 0.024 260)" }}
            >
              <div className="flex gap-1.5">
                {[
                  "oklch(0.58 0.22 25)",
                  "oklch(0.68 0.20 60)",
                  "oklch(0.65 0.20 145)",
                ].map((c) => (
                  <div
                    key={c}
                    className="w-3 h-3 rounded-full"
                    style={{ background: c }}
                  />
                ))}
              </div>
              <div
                className="flex-1 text-center text-xs font-medium"
                style={{ color: "oklch(0.46 0.014 260)" }}
              >
                orbita \u2014 Pipeline Board
              </div>
            </div>

            <div className="flex gap-0 overflow-x-auto p-5 min-h-[340px]">
              {pipelineStages.map(({ label, color, deals }) => (
                <div key={label} className="flex-shrink-0 w-[205px] px-2.5">
                  <div className="flex items-center gap-2 mb-3">
                    <div
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ background: color }}
                    />
                    <span
                      className="text-[11px] font-bold uppercase tracking-widest truncate"
                      style={{ color: "oklch(0.65 0.014 260)" }}
                    >
                      {label}
                    </span>
                    <span
                      className="ml-auto text-xs px-1.5 py-0.5 rounded"
                      style={{
                        background: "oklch(0.20 0.024 260)",
                        color: "oklch(0.52 0.014 260)",
                      }}
                    >
                      {deals.length}
                    </span>
                  </div>
                  {deals.map((d) => (
                    <DealCard key={d.company} {...d} />
                  ))}
                  <div
                    className="rounded-lg border-2 border-dashed p-3 text-center text-xs"
                    style={{
                      borderColor: "oklch(0.24 0.024 260)",
                      color: "oklch(0.38 0.014 260)",
                    }}
                  >
                    + Add deal
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── CTA BANNER ── */}
      <section
        className="py-36 px-6 relative overflow-hidden"
        style={{ background: "oklch(0.10 0.022 260)" }}
      >
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] rounded-full pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse, oklch(0.52 0.22 255 / 0.30) 0%, oklch(0.55 0.20 295 / 0.12) 55%, transparent 100%)",
            filter: "blur(50px)",
          }}
        />
        {/* Grid in CTA */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(oklch(0.50 0.10 255 / 0.04) 1px, transparent 1px), linear-gradient(90deg, oklch(0.50 0.10 255 / 0.04) 1px, transparent 1px)",
            backgroundSize: "72px 72px",
          }}
        />

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <h2
              className="font-heading font-extrabold tracking-tight mb-6"
              style={{
                fontSize: "clamp(2.5rem, 5.5vw, 5rem)",
                lineHeight: 0.95,
                color: "oklch(0.96 0.008 260)",
              }}
            >
              Start managing your pipeline
              <br />
              <span
                style={{
                  background:
                    "linear-gradient(135deg, oklch(0.70 0.24 255), oklch(0.72 0.22 295))",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                forever.
              </span>
            </h2>
            <p
              className="text-lg mb-12"
              style={{ color: "oklch(0.56 0.014 260)" }}
            >
              No credit card. No password. Just your Internet Identity \u2014
              and a CRM that will never disappear.
            </p>

            <button
              type="button"
              onClick={login}
              disabled={isLoggingIn}
              className="group inline-flex items-center gap-3 px-12 py-5 rounded-2xl font-heading font-extrabold text-xl transition-all duration-200 hover:scale-105"
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.52 0.22 255) 0%, oklch(0.56 0.20 295) 100%)",
                color: "white",
                boxShadow:
                  "0 0 80px oklch(0.52 0.22 255 / 0.50), 0 4px 32px oklch(0.08 0.02 260 / 0.7)",
              }}
              data-ocid="cta.primary.button"
            >
              {isLoggingIn ? "Connecting\u2026" : "Launch Orbita Free"}
              <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
            </button>

            <div
              className="mt-10 flex flex-wrap items-center justify-center gap-6 text-xs"
              style={{ color: "oklch(0.42 0.013 260)" }}
            >
              {[
                "100% on-chain data",
                "vetKD encrypted",
                "No vendor lock-in",
                "Internet Identity login",
              ].map((t) => (
                <span key={t} className="flex items-center gap-1.5">
                  <CheckCircle2
                    className="w-3.5 h-3.5"
                    style={{ color: "oklch(0.65 0.20 145)" }}
                  />
                  {t}
                </span>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer
        className="border-t py-12 px-6"
        style={{
          background: "oklch(0.09 0.020 260)",
          borderColor: "oklch(0.18 0.022 260)",
        }}
      >
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{
                  background:
                    "linear-gradient(135deg, oklch(0.52 0.19 255), oklch(0.55 0.18 295))",
                }}
              >
                <Zap className="w-4 h-4 text-white fill-white" />
              </div>
              <div>
                <div
                  className="font-heading font-bold text-lg"
                  style={{ color: "oklch(0.88 0.01 260)" }}
                >
                  Orbita
                </div>
                <div
                  className="text-xs"
                  style={{ color: "oklch(0.42 0.013 260)" }}
                >
                  The on-chain CRM
                </div>
              </div>
            </div>

            <div
              className="flex items-center gap-2 px-4 py-2 rounded-full border text-xs font-semibold"
              style={{
                borderColor: "oklch(0.24 0.022 260)",
                background: "oklch(0.14 0.022 260)",
                color: "oklch(0.56 0.013 260)",
              }}
            >
              <Shield
                className="w-3.5 h-3.5"
                style={{ color: "oklch(0.62 0.20 295)" }}
              />
              Built on the Internet Computer
            </div>

            <div
              className="text-xs text-center"
              style={{ color: "oklch(0.38 0.012 260)" }}
            >
              \u00a9 {year}.{" "}
              <a
                href={utmLink}
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 hover:opacity-80 transition-opacity"
                style={{ color: "oklch(0.48 0.013 260)" }}
              >
                Built with \u2665 using caffeine.ai
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
