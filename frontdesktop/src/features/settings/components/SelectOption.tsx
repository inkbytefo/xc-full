// ============================================================================
// Select Option Component
// ============================================================================

interface SelectOptionProps {
    label: string;
    description?: string;
    value: string;
    options: { value: string; label: string; description?: string }[];
    onChange: (value: string) => void;
    disabled?: boolean;
}

export function SelectOption({
    label,
    description,
    value,
    options,
    onChange,
    disabled = false,
}: SelectOptionProps) {
    return (
        <div className="py-3 border-b border-white/5 last:border-0">
            <div className="flex items-center justify-between mb-2">
                <div>
                    <div className="font-medium text-white">{label}</div>
                    {description && (
                        <div className="text-sm text-zinc-500">{description}</div>
                    )}
                </div>
            </div>
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                disabled={disabled}
                className={`
                    w-full px-4 py-2.5 rounded-lg 
                    bg-white/5 border border-white/10 
                    text-white outline-none 
                    focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20
                    transition-all duration-200
                    appearance-none cursor-pointer
                    disabled:opacity-50 disabled:cursor-not-allowed
                `}
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2371717a'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 12px center',
                    backgroundSize: '20px',
                }}
            >
                {options.map((opt) => (
                    <option key={opt.value} value={opt.value} className="bg-[#1a1a20]">
                        {opt.label}
                    </option>
                ))}
            </select>
        </div>
    );
}
