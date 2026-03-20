const TEAMS_WEBHOOK_URL = process.env.TEAMS_WEBHOOK;
const JUAN_CASTRO_ID = process.env.JUAN_CASTRO_ID;
const APP_BASE_URL = process.env.NEXTAUTH_URL;

export type TeamsTaskNotificationPayload = {
    taskTitle: string;
    /** Name of the assigned resource (will be @mentioned) */
    assigneeName: string;
    /** Email of the assigned resource (used for the Teams mention id) */
    assigneeEmail: string;
    /** Name of the person who created the task */
    createdByName: string;
};

function buildNewTaskCard(payload: TeamsTaskNotificationPayload) {
    const { taskTitle, assigneeName, assigneeEmail, createdByName } = payload;
    const mentionText = `<at>${assigneeName}</at>`;
    const safeTaskTitle = taskTitle?.trim();
    const safeCreatedBy = createdByName?.trim();
    const baseUrl = APP_BASE_URL?.replace(/\/+$/, "");
    const taskModuleUrl = baseUrl
        ? `${baseUrl}/management/tasks`
        : "/management/tasks";

    const taskSuffix = safeTaskTitle ? `: ${safeTaskTitle}` : "";
    const creatorSuffix = safeCreatedBy ? ` (creada por ${safeCreatedBy})` : "";

    return {
        type: "message",
        attachments: [
            {
                contentType: "application/vnd.microsoft.card.adaptive",
                content: {
                    $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
                    type: "AdaptiveCard",
                    version: "1.4",
                    body: [
                        {
                            type: "TextBlock",
                            text: `Hola <at>Juan Castro</at>, se ha creado una nueva tarea.`,
                            wrap: true,
                        },
                        {
                            type: "TextBlock",
                            text: `Titulo de la tarea: ${taskSuffix}`,
                            wrap: true,
                        },
                        {
                            type: "TextBlock",
                            text: `Creada por: ${creatorSuffix}`,
                            wrap: true,
                        },
                        {
                            type: "TextBlock",
                            text: `Modulo de tareas: [management/tasks](${taskModuleUrl})`,
                            wrap: true,
                        },
                    ],
                    msteams: {
                        entities: [
                            {
                                type: "mention",
                                text: "<at>Juan Castro</at>",
                                mentioned: {
                                    id: JUAN_CASTRO_ID,
                                    name: "Juan Castro",
                                },
                            },
                        ],
                    },
                },
            },
        ],
    };
}

export async function notifyNewTaskCreated(
    payload: TeamsTaskNotificationPayload,
): Promise<void> {
    if (!TEAMS_WEBHOOK_URL) {
        console.warn(
            "[teams-webhook] TEAMS_WEBHOOK env var is not set - skipping notification.",
        );
        return;
    }

    const body = buildNewTaskCard(payload);

    try {
        const res = await fetch(TEAMS_WEBHOOK_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });

        if (!res.ok) {
            console.error(
                `[teams-webhook] Failed to send notification (${res.status}): ${await res.text()}`,
            );
        }
    } catch (error) {
        console.error("[teams-webhook] Error sending notification:", error);
    }
}
