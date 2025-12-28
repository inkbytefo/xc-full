type LiveTab = "browse" | "categories";

interface LiveTabsProps {
  activeTab: LiveTab;
  onChange: (tab: LiveTab) => void;
}

export function LiveTabs({ activeTab, onChange }: LiveTabsProps) {
  return (
    <div className="flex gap-4 mb-6 border-b border-white/10">
      <button
        type="button"
        onClick={() => onChange("browse")}
        className={`pb-3 px-1 font-medium transition-colors ${activeTab === "browse"
          ? "text-purple-400 border-b-2 border-purple-400"
          : "text-zinc-400 hover:text-zinc-200"
          }`}
      >
        Göz At
      </button>
      <button
        type="button"
        onClick={() => onChange("categories")}
        className={`pb-3 px-1 font-medium transition-colors ${activeTab === "categories"
          ? "text-purple-400 border-b-2 border-purple-400"
          : "text-zinc-400 hover:text-zinc-200"
          }`}
      >
        Kategoriler
      </button>
    </div>
  );
}

