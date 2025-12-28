interface LiveEmptyStateProps {
  icon: string;
  title: string;
  subtitle?: string;
}

export function LiveEmptyState({ icon, title, subtitle }: LiveEmptyStateProps) {
  return (
    <div className="text-center py-16">
      <div className="text-6xl mb-4">{icon}</div>
      <p className="text-zinc-400 text-lg">{title}</p>
      {subtitle ? <p className="text-zinc-500 text-sm mt-1">{subtitle}</p> : null}
    </div>
  );
}

