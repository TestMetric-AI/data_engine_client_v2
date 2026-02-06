"use client";

import { SessionProvider } from "next-auth/react";
import { SessionExpirationWarning } from "./SessionExpirationWarning";

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <SessionProvider>
            {children}
            <SessionExpirationWarning />
        </SessionProvider>
    );
}
