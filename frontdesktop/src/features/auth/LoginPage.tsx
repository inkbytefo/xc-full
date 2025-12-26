import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { BackgroundLayer } from "../../components/BackgroundLayer";

export function LoginPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const { login, isLoading, error, clearError } = useAuthStore();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    // Get the intended destination from location state
    const from = (location.state as { from?: { pathname: string } })?.from?.pathname || "/feed";

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        clearError();

        const success = await login(email, password);
        if (success) {
            navigate(from, { replace: true });
        }
    };

    return (
        <div className="min-h-screen bg-transparent">
            <BackgroundLayer />
            <div className="fixed inset-0 bg-gradient-to-b from-black/70 via-black/45 to-black/75" />
            <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-10">
                <div className="w-full max-w-md">
                    <div className="mb-6 text-center">
                        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--bg-surface)] ring-1 ring-[var(--border-default)] shadow-[0_16px_60px_rgba(148,70,91,0.25)]">
                            <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-[var(--velvet-2)] to-[var(--velvet)]" />
                        </div>
                        <h1 className="text-3xl font-semibold tracking-tight text-white">Welcome back</h1>
                        <p className="mt-2 text-sm text-[var(--text-secondary)]">Sign in to continue.</p>
                    </div>

                    <div className="glass-card rounded-2xl border border-[var(--border-default)] p-6 shadow-[0_30px_90px_rgba(0,0,0,0.55)]">
                        <form onSubmit={handleSubmit} className="space-y-5">
                            {error && (
                                <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                                    {error}
                                </div>
                            )}

                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-white/85">Email</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    autoComplete="email"
                                    className="w-full rounded-xl border border-[var(--border-default)] bg-white/5 px-4 py-3 text-white placeholder:text-white/35 outline-none transition focus:border-[var(--velvet-2)]/60 focus:ring-2 focus:ring-[var(--velvet-2)]/25"
                                    placeholder="you@example.com"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-white/85">Password</label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    autoComplete="current-password"
                                    className="w-full rounded-xl border border-[var(--border-default)] bg-white/5 px-4 py-3 text-white placeholder:text-white/35 outline-none transition focus:border-[var(--velvet-2)]/60 focus:ring-2 focus:ring-[var(--velvet-2)]/25"
                                    placeholder="••••••••"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="group relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-[var(--velvet-2)] to-[var(--velvet)] px-4 py-3 font-semibold text-white shadow-[0_18px_50px_rgba(148,70,91,0.3)] ring-1 ring-white/10 transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-[var(--velvet-2)]/35 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                <span className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.25),transparent_55%)]" />
                                <span className="relative">
                                    {isLoading ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" aria-hidden="true">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                            </svg>
                                            Signing in...
                                        </span>
                                    ) : (
                                        "Sign in"
                                    )}
                                </span>
                            </button>
                        </form>

                        <div className="mt-6 flex items-center justify-center gap-2 text-sm text-[var(--text-secondary)]">
                            <span>New here?</span>
                            <button
                                type="button"
                                onClick={() => navigate("/register")}
                                className="font-medium text-[var(--velvet-2)] transition hover:text-[var(--velvet-2)]/90"
                            >
                                Create an account
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
