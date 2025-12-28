
import React from 'react';

export const PageLoader: React.FC = () => {
    return (
        <div className="h-full w-full flex items-center justify-center bg-transparent bg-canvas-visible">
            <div className="flex flex-col items-center gap-4">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-600 border-t-purple-500" />
            </div>
        </div>
    );
};
