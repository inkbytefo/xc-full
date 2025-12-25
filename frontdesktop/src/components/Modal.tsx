import { useEffect } from "react";
import type { ReactNode } from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  size?: "sm" | "md" | "lg" | "xl";
  position?: "center" | "right" | "left";
  showCloseButton?: boolean;
}

const sizeClasses = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
};

const positionClasses = {
  center: "inset-0 flex items-center justify-center p-4",
  right: "right-4 top-4 bottom-4",
  left: "left-4 top-4 bottom-4",
};

export function Modal({
  isOpen,
  onClose,
  children,
  title,
  size = "md",
  position = "center",
  showCloseButton = true,
}: ModalProps) {
  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const isPositionedModal = position !== "center";

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Container */}
      <div className={`fixed z-50 ${positionClasses[position]}`}>
        <div
          className={`
            ${isPositionedModal ? "h-full w-[400px]" : `w-full ${sizeClasses[size]}`}
            bg-[#0f0f15]/95 backdrop-blur-xl
            rounded-2xl border border-white/10
            shadow-2xl shadow-black/50
            flex flex-col overflow-hidden
            animate-in fade-in zoom-in-95 duration-200
          `}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          {(title || showCloseButton) && (
            <div className="flex items-center justify-between p-4 border-b border-white/10 shrink-0">
              {title && <h2 className="text-lg font-bold text-white">{title}</h2>}
              {showCloseButton && (
                <button
                  onClick={onClose}
                  className="ml-auto w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
                  aria-label="Kapat"
                >
                  <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
                    <path
                      d="M18 6L6 18M6 6l12 12"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              )}
            </div>
          )}

          {/* Content */}
          <div className="flex-1 overflow-y-auto">{children}</div>
        </div>
      </div>
    </>
  );
}

// Re-export useful modal-related components
export function ModalHeader({ children }: { children: ReactNode }) {
  return <div className="p-4 border-b border-white/10">{children}</div>;
}

export function ModalBody({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`p-4 ${className}`}>{children}</div>;
}

export function ModalFooter({ children }: { children: ReactNode }) {
  return (
    <div className="p-4 border-t border-white/10 flex items-center justify-end gap-3">
      {children}
    </div>
  );
}
