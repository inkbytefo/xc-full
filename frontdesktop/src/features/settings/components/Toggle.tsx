// ============================================================================
// Toggle Switch Component
// ============================================================================

interface ToggleProps {
    checked: boolean;
    onChange: (checked: boolean) => void;
    disabled?: boolean;
    size?: 'sm' | 'md';
}

export function Toggle({ checked, onChange, disabled = false, size = 'md' }: ToggleProps) {
    const sizeClasses = size === 'sm'
        ? 'w-9 h-5 after:h-4 after:w-4'
        : 'w-11 h-6 after:h-5 after:w-5';

    return (
        <label className={`relative inline-flex items-center cursor-pointer ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
            <input
                type="checkbox"
                checked={checked}
                onChange={(e) => !disabled && onChange(e.target.checked)}
                disabled={disabled}
                className="sr-only peer"
            />
            <div className={`
                ${sizeClasses}
                bg-zinc-700 
                peer-focus:outline-none 
                peer-focus:ring-2 
                peer-focus:ring-purple-500/50
                rounded-full 
                peer 
                peer-checked:after:translate-x-full 
                peer-checked:after:border-white 
                after:content-[''] 
                after:absolute 
                after:top-[2px] 
                after:left-[2px] 
                after:bg-white 
                after:rounded-full 
                after:transition-all 
                after:duration-200
                peer-checked:bg-purple-600
                transition-colors
                duration-200
            `} />
        </label>
    );
}
