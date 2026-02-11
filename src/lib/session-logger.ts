type LogLevel = "info" | "warn" | "error";

type SessionEvent =
    | "login"
    | "logout"
    | "token_refresh"
    | "idle_timeout"
    | "refresh_token_expired"
    | "session_extended";

interface SessionLogEntry {
    timestamp: string;
    level: LogLevel;
    event: SessionEvent;
    userId?: string;
    email?: string;
    metadata?: Record<string, any>;
}

class SessionLogger {
    private isEnabled: boolean;

    constructor() {
        this.isEnabled = process.env.ENABLE_SESSION_LOGGING === "true";
    }

    private log(entry: SessionLogEntry): void {
        if (!this.isEnabled) return;

        const logMessage = {
            ...entry,
            timestamp: new Date().toISOString(),
        };

        // Log to console with appropriate level
        switch (entry.level) {
            case "info":
                console.info("[SESSION]", JSON.stringify(logMessage, null, 2));
                break;
            case "warn":
                console.warn("[SESSION]", JSON.stringify(logMessage, null, 2));
                break;
            case "error":
                console.error("[SESSION]", JSON.stringify(logMessage, null, 2));
                break;
        }

        // TODO: Optionally persist to database
        // await prisma.sessionLog.create({ data: logMessage });
    }

    logLogin(userId: string, email: string, metadata?: Record<string, any>): void {
        this.log({
            timestamp: new Date().toISOString(),
            level: "info",
            event: "login",
            userId,
            email,
            metadata,
        });
    }

    logLogout(userId: string, email: string): void {
        this.log({
            timestamp: new Date().toISOString(),
            level: "info",
            event: "logout",
            userId,
            email,
        });
    }

    logTokenRefresh(userId: string, email: string, newExpiration: number): void {
        this.log({
            timestamp: new Date().toISOString(),
            level: "info",
            event: "token_refresh",
            userId,
            email,
            metadata: {
                newExpiration: new Date(newExpiration * 1000).toISOString(),
            },
        });
    }

    logIdleTimeout(userId: string, email: string, inactiveMinutes: number): void {
        this.log({
            timestamp: new Date().toISOString(),
            level: "warn",
            event: "idle_timeout",
            userId,
            email,
            metadata: {
                inactiveMinutes,
            },
        });
    }

    logRefreshTokenExpired(userId: string, email: string, sessionDuration: string): void {
        this.log({
            timestamp: new Date().toISOString(),
            level: "warn",
            event: "refresh_token_expired",
            userId,
            email,
            metadata: {
                sessionDuration,
            },
        });
    }

    logSessionExtended(userId: string, email: string, triggeredBy: string): void {
        this.log({
            timestamp: new Date().toISOString(),
            level: "info",
            event: "session_extended",
            userId,
            email,
            metadata: {
                triggeredBy,
            },
        });
    }
}

// Export singleton instance
export const sessionLogger = new SessionLogger();
