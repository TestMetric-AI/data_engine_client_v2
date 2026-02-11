"use client";

import { useSessionMonitor } from "@/hooks/useSessionMonitor";
import { useEffect, useState } from "react";
import { X, Clock, RefreshCw } from "lucide-react";

export function SessionExpirationWarning() {
    const { showWarning, timeRemaining, extendSession } = useSessionMonitor();
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        setIsVisible(showWarning);
    }, [showWarning]);

    if (!isVisible) return null;

    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;

    const handleExtend = async () => {
        await extendSession();
        setIsVisible(false);
    };

    const handleDismiss = () => {
        setIsVisible(false);
    };

    return (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-5 duration-300">
            <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-400 rounded-lg shadow-2xl p-4 max-w-md">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <div className="bg-yellow-400 rounded-full p-2">
                            <Clock className="w-5 h-5 text-yellow-900" />
                        </div>
                        <h3 className="font-semibold text-yellow-900 text-lg">
                            Session Expiring Soon
                        </h3>
                    </div>
                    <button
                        onClick={handleDismiss}
                        className="text-yellow-700 hover:text-yellow-900 transition-colors"
                        aria-label="Dismiss"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="mb-4">
                    <p className="text-yellow-800 mb-2">
                        Your session will expire due to inactivity in:
                    </p>
                    <div className="bg-yellow-100 rounded-md p-3 text-center">
                        <span className="text-3xl font-bold text-yellow-900 tabular-nums">
                            {minutes}:{seconds.toString().padStart(2, "0")}
                        </span>
                        <p className="text-sm text-yellow-700 mt-1">minutes remaining</p>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                    <button
                        onClick={handleExtend}
                        className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white font-medium py-2 px-4 rounded-md transition-colors flex items-center justify-center gap-2"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Keep Session Active
                    </button>
                </div>

                {/* Info */}
                <p className="text-xs text-yellow-700 mt-3 text-center">
                    Any activity will automatically extend your session
                </p>
            </div>
        </div>
    );
}
