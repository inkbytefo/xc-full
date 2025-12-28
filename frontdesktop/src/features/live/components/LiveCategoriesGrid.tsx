import type { Category } from "../../../api/types";

interface LiveCategoriesGridProps {
  categories: Category[];
  onSelectCategory: (categoryId: string) => void;
}

export function LiveCategoriesGrid({ categories, onSelectCategory }: LiveCategoriesGridProps) {
  if (categories.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
      {categories.map((category) => (
        <button
          key={category.id}
          type="button"
          onClick={() => onSelectCategory(category.id)}
          className="bg-white/5 backdrop-blur-sm rounded-lg overflow-hidden hover:bg-white/10 transition-colors text-left group border border-white/5"
        >
          <div className="aspect-[3/4] bg-gradient-to-br from-purple-600/30 to-pink-600/30 flex items-center justify-center">
            <span className="text-5xl">🎮</span>
          </div>
          <div className="p-3">
            <p className="font-medium text-white truncate group-hover:text-purple-300 transition-colors">
              {category.name}
            </p>
            <p className="text-sm text-zinc-500">
              {category.streamCount?.toLocaleString() ?? 0} canlı
            </p>
          </div>
        </button>
      ))}
    </div>
  );
}

