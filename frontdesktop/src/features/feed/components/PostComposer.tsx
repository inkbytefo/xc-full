import { useEffect, useMemo, useState } from "react";
import type { Server, Visibility } from "../../../api/types";
import { searchUsers, type SearchUser } from "../../../api/searchApi";
import { useAuthStore } from "../../../store/authStore";

function cn(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ");
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function PostComposer({
  servers,
  onSubmit,
  busy,
}: {
  servers: Server[];
  onSubmit: (payload: { text: string; visibility: string; serverId?: string }) => Promise<void>;
  busy: boolean;
}) {
  const user = useAuthStore((s) => s.user);
  const [text, setText] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("public");
  const [serverId, setServerId] = useState<string>("");

  // Mention state
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<SearchUser[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [mentionStart, setMentionStart] = useState(-1);

  // Fetch suggestions
  useEffect(() => {
    if (mentionQuery === null) {
      setSuggestions([]);
      return;
    }
    const timer = setTimeout(() => {
      searchUsers(mentionQuery).then((users) => {
        setSuggestions(users);
        setActiveIndex(0);
      });
    }, 200);
    return () => clearTimeout(timer);
  }, [mentionQuery]);

  const selectUser = (u: SearchUser) => {
    if (mentionStart === -1) return;
    const before = text.slice(0, mentionStart);
    // Find where the mention ends - usually current cursor or end of word
    // simplistic approach: replace from mentionStart to end of likely word:
    // But we know capture group matches @(\w*)
    const afterMatch = text.slice(mentionStart + 1 + (mentionQuery?.length || 0));

    const newText = `${before}@${u.handle} ${afterMatch}`;
    setText(newText);
    setMentionQuery(null);
    setSuggestions([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionQuery !== null && suggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => (i + 1) % suggestions.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => (i - 1 + suggestions.length) % suggestions.length);
      } else if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        selectUser(suggestions[activeIndex]);
      } else if (e.key === "Escape") {
        setMentionQuery(null);
        setSuggestions([]);
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.currentTarget.value;
    setText(val);

    const pos = e.currentTarget.selectionStart;
    const left = val.slice(0, pos);
    // Match @word at the end of the left string
    const match = left.match(/@(\w*)$/);
    if (match) {
      setMentionQuery(match[1]);
      setMentionStart(pos - match[0].length);
    } else {
      setMentionQuery(null);
    }
  };

  const maxChars = 2800;
  const remaining = maxChars - text.length;
  const remainingClamped = clamp(remaining, -9999, maxChars);
  const serverRequired = visibility === "server";
  const serverValid = !serverRequired || serverId !== "";
  const canPost = text.trim().length > 0 && remaining >= 0 && !busy && serverValid;

  const showServerSelect = visibility === "server";

  useEffect(() => {
    if (!showServerSelect) setServerId("");
  }, [showServerSelect]);

  const visibilityLabel = useMemo(() => {
    if (visibility === "friends") return "Arkadaşlar";
    if (visibility === "server") return "Sunucu";
    return "Herkes";
  }, [visibility]);

  async function handleSubmit(): Promise<void> {
    if (!canPost) return;
    await onSubmit({
      text,
      visibility,
      serverId: showServerSelect && serverId ? serverId : undefined,
    });
    setText("");
  }

  // User avatar gradient
  const avatarGradient = user?.avatarGradient || ["#8B5CF6", "#EC4899"];

  return (
    <section className="rounded-2xl border border-white/10 bg-black/30 p-4 backdrop-blur-sm">
      <div className="flex items-start gap-3">
        {/* User Avatar */}
        <div
          className="h-10 w-10 shrink-0 rounded-full ring-1 ring-white/20"
          style={{
            backgroundImage: `linear-gradient(135deg, ${avatarGradient[0]}, ${avatarGradient[1]})`,
          }}
        />

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-medium text-zinc-100">
              {user?.displayName || "Yeni post"}
            </div>
            <div className="flex items-center gap-2">
              <div className="rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-[11px] text-zinc-300">
                {visibilityLabel}
              </div>
              <select
                value={visibility}
                onChange={(e) => setVisibility(e.currentTarget.value as Visibility)}
                className="rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-[11px] text-zinc-200 outline-none focus:border-purple-500/50 transition-colors"
              >
                <option value="public">Herkes</option>
                <option value="friends">Arkadaşlar</option>
                <option value="server">Sunucu</option>
              </select>
            </div>
          </div>

          {showServerSelect && (
            <div className="mt-2 flex items-center justify-between gap-2">
              <div className="text-xs text-zinc-400">Sunucu</div>
              <select
                value={serverId}
                onChange={(e) => setServerId(e.currentTarget.value)}
                className={`min-w-0 flex-1 rounded-lg border px-2 py-1 text-xs outline-none focus:border-purple-500/50 transition-colors ${serverRequired && !serverId
                  ? "border-red-500/50 bg-red-500/10 text-red-300"
                  : "border-white/10 bg-black/40 text-zinc-200"
                  }`}
              >
                <option value="">Sunucu seçin</option>
                {servers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          {showServerSelect && !serverId && servers.length === 0 && (
            <div className="mt-1 text-xs text-amber-400">
              Henüz bir sunucuya üye değilsiniz.
            </div>
          )}

          <div className="relative">
            {suggestions.length > 0 && (
              <div className="absolute bottom-full left-0 mb-2 w-64 overflow-hidden rounded-xl border border-white/10 bg-black/90 shadow-xl backdrop-blur-md z-50">
                <div className="p-1">
                  {suggestions.map((u, i) => {
                    const grad = u.avatarGradient || ["#333", "#666"];
                    return (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => selectUser(u)}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                          i === activeIndex ? "bg-white/10 text-white" : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                        )}
                      >
                        <div
                          className="h-6 w-6 rounded-full"
                          style={{ backgroundImage: `linear-gradient(135deg, ${grad[0]}, ${grad[1]})` }}
                        />
                        <div className="flex flex-col">
                          <span className="font-medium text-zinc-100">{u.displayName}</span>
                          <span className="text-xs text-zinc-500">@{u.handle}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            <textarea
              value={text}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              placeholder="Ne oluyor? (@bahset)"
              rows={3}
              className="mt-3 w-full resize-none rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-purple-500/50 transition-colors"
            />
          </div>

          <div className="mt-3 flex items-center justify-between gap-3">
            <div
              className={cn(
                "text-xs tabular-nums",
                remainingClamped < 0
                  ? "text-rose-400"
                  : remainingClamped < 60
                    ? "text-amber-400"
                    : "text-zinc-500"
              )}
            >
              {remainingClamped}
            </div>

            <button
              type="button"
              disabled={!canPost}
              onClick={() => void handleSubmit()}
              className={cn(
                "rounded-xl px-4 py-2 text-sm font-medium transition-all",
                canPost
                  ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 hover:scale-[1.02]"
                  : "cursor-not-allowed bg-white/10 text-white/40"
              )}
            >
              {busy ? "Paylaşılıyor…" : "Paylaş"}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
