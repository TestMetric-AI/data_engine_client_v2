"use client";

import { useSession, signOut } from "next-auth/react";
import { useEffect, useRef, useState, useCallback } from "react";

const IDLE_TIMEOUT = parseInt(process.env.NEXT_PUBLIC_IDLE_TIMEOUT || "1800"); // 30 minutes in seconds
const WARNING_THRESHOLD = parseInt(process.env.NEXT_PUBLIC_WARNING_THRESHOLD || "300"); // 5 minutes in seconds
const CHECK_INTERVAL = 30000; // Check every 30 seconds

interface SessionMonitorState {
    showWarning: boolean;
    timeRemaining: number;
    lastActivity: number;
}

export function useSessionMonitor() {
    const { data: session, status, update } = useSession();
    const [state, setState] = useState<SessionMonitorState>({
        showWarning: false,
        timeRemaining: 0,
        lastActivity: Date.now(),
    });

    // Update last activity timestamp
    const updateActivity = useCallback(() => {
        setState((prev) => ({
            ...prev,
            lastActivity: Date.now(),
            showWarning: false,
        }));
    }, []);

    // Extend session manually
    const extendSession = useCallback(async () => {
        try {
            // Trigger session update in NextAuth
            await update();
            updateActivity();
        } catch (error) {
            console.error("Failed to extend session:", error);
        }
    }, [update, updateActivity]);

    // Monitor session activity
    useEffect(() => {
        if (!session) return;

        // Activity event listeners
        const events = ["mousedown", "keydown", "scroll", "touchstart"];

        const handleActivity = () => {
            updateActivity();
        };

        events.forEach((event) => {
            window.addEventListener(event, handleActivity);
        });

        // Check session status periodically
        const interval = setInterval(() => {
            const now = Date.now();
            const inactiveTime = Math.floor((now - state.lastActivity) / 1000); // in seconds
            const timeUntilTimeout = IDLE_TIMEOUT - inactiveTime;

            // Show warning if within threshold
            if (timeUntilTimeout <= WARNING_THRESHOLD && timeUntilTimeout > 0) {
                setState((prev) => ({
                    ...prev,
                    showWarning: true,
                    timeRemaining: timeUntilTimeout,
                }));
            } else if (timeUntilTimeout <= 0) {
                // Session expired — force sign out and redirect to login
                signOut({ callbackUrl: "/login" });
                return;
            } else {
                setState((prev) => ({
                    ...prev,
                    showWarning: false,
                    timeRemaining: timeUntilTimeout,
                }));
            }
        }, CHECK_INTERVAL);

        return () => {
            events.forEach((event) => {
                window.removeEventListener(event, handleActivity);
            });
            clearInterval(interval);
        };
    }, [session, state.lastActivity, updateActivity]);

    // Track whether the user was previously authenticated
    const wasAuthenticated = useRef(false);
    useEffect(() => {
        if (status === "authenticated") {
            wasAuthenticated.current = true;
        }
    }, [status]);

    // Redirect only when an active session is lost (not on initial load)
    useEffect(() => {
        if (status === "unauthenticated" && wasAuthenticated.current) {
            signOut({ callbackUrl: "/login" });
        }
    }, [status]);

    return {
        showWarning: state.showWarning,
        timeRemaining: state.timeRemaining,
        extendSession,
    };
}
