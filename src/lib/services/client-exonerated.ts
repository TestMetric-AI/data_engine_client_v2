import { turso } from "@/lib/turso";
import type { InValue } from "@libsql/client";
import ExcelJS from "exceljs";

export const CLIENT_EXONERATED_TABLE = "client_exonerated";

export const CLIENT_EXONERATED_COLUMNS = [
    "TRANSACTION_REF",
    "NOMBRE_CLIENTE",
    "TYPE_PERSONAL_ID",
    "NUMBER_PERSONAL_ID",
    "DATE_INCLUSION",
] as const;

const EXPECTED_HEADERS = [
    "Transaction Ref",
    "Nombre de Cliente",
    "Type personal id",
    "Number personal id",
    "Date inclusion",
];

export type ClientExoneratedRow = Record<
    (typeof CLIENT_EXONERATED_COLUMNS)[number],
    string | null
>;

export type ClientExoneratedValidationError = {
    row: number;
    column: string;
    value: string;
    message: string;
};

export type ClientExoneratedParseResult = {
    rows: ClientExoneratedRow[];
    errors: ClientExoneratedValidationError[];
};

const normalizeCell = (value: ExcelJS.CellValue): string | null => {
    if (value === undefined || value === null) {
        return null;
    }
    if (value instanceof Date) {
        return value.toISOString().slice(0, 10);
    }
    if (typeof value === "object") {
        if ("text" in value && typeof value.text === "string") {
            const text = value.text.trim();
            return text.length > 0 ? text : null;
        }
        if ("richText" in value && Array.isArray(value.richText)) {
            const text = value.richText
                .map((part) => part.text ?? "")
                .join("")
                .trim();
            return text.length > 0 ? text : null;
        }
        if ("result" in value) {
            return normalizeCell(value.result as ExcelJS.CellValue);
        }
    }
    const text = String(value).trim();
    return text.length > 0 ? text : null;
};

const normalizeRow = (row: ClientExoneratedRow): ClientExoneratedRow => {
    const normalizeText = (value: string | null): string | null => {
        if (!value) {
            return null;
        }
        const cleaned = value.trim().replace(/\s+/g, " ");
        return cleaned.length > 0 ? cleaned : null;
    };

    const normalizeId = (value: string | null): string | null => {
        if (!value) {
            return null;
        }
        const cleaned = value.trim().replace(/\s+/g, "");
        return cleaned.length > 0 ? cleaned : null;
    };

    return {
        TRANSACTION_REF: normalizeId(row.TRANSACTION_REF),
        NOMBRE_CLIENTE: normalizeText(row.NOMBRE_CLIENTE)?.toUpperCase() ?? null,
        TYPE_PERSONAL_ID:
            normalizeText(row.TYPE_PERSONAL_ID)?.toUpperCase() ?? null,
        NUMBER_PERSONAL_ID: normalizeId(row.NUMBER_PERSONAL_ID),
        DATE_INCLUSION: normalizeText(row.DATE_INCLUSION),
    };
};

export async function parseClientExoneratedXlsx(
    buffer: Uint8Array
): Promise<ClientExoneratedParseResult> {
    const workbook = new ExcelJS.Workbook();
    const errors: ClientExoneratedValidationError[] = [];

    const arrayBuffer = Uint8Array.from(buffer).buffer;
    await workbook.xlsx.load(arrayBuffer);

    const sheet = workbook.worksheets[0];
    if (!sheet) {
        return {
            rows: [],
            errors: [
                {
                    row: 1,
                    column: "SHEET",
                    value: "",
                    message: "El archivo no contiene hojas.",
                },
            ],
        };
    }

    const headerRowNumber = 2;
    const headerRow = EXPECTED_HEADERS.map((_, index) => {
        const cell = sheet.getRow(headerRowNumber).getCell(index + 1);
        return normalizeCell(cell.value) ?? "";
    });
    const expected = EXPECTED_HEADERS.map((value) => value.trim());
    const headerMatches =
        headerRow.length === expected.length &&
        expected.every((value, index) => headerRow[index] === value);

    if (!headerMatches) {
        errors.push({
            row: 2,
            column: "HEADER",
            value: headerRow.join("|"),
            message:
                "El orden o los nombres de columnas no coinciden con clientes_exonerados.",
        });
        return { rows: [], errors };
    }

    const parsedRows: ClientExoneratedRow[] = [];
    for (let rowNumber = 3; rowNumber <= sheet.rowCount; rowNumber += 1) {
        const row = sheet.getRow(rowNumber);
        const values = CLIENT_EXONERATED_COLUMNS.map((_, index) =>
            normalizeCell(row.getCell(index + 1).value)
        );
        const hasData = values.some((value) => value !== null);
        if (!hasData) {
            continue;
        }
        const normalizedRow = normalizeRow({
            TRANSACTION_REF: values[0],
            NOMBRE_CLIENTE: values[1],
            TYPE_PERSONAL_ID: values[2],
            NUMBER_PERSONAL_ID: values[3],
            DATE_INCLUSION: values[4],
        });
        parsedRows.push(normalizedRow);
    }

    return { rows: parsedRows, errors };
}

export async function ensureClientExoneratedTable(): Promise<void> {
    const columnDefs = CLIENT_EXONERATED_COLUMNS.map(
        (column) => `"${column}" TEXT`
    ).join(", ");
    const createSql = `CREATE TABLE IF NOT EXISTS ${CLIENT_EXONERATED_TABLE} (${columnDefs});`;
    await turso.execute(createSql);
}

export async function insertClientExonerated(
    rows: ClientExoneratedRow[]
): Promise<number> {
    if (rows.length === 0) {
        return 0;
    }

    await ensureClientExoneratedTable();

    const columnsSql = CLIENT_EXONERATED_COLUMNS.map((col) => `"${col}"`).join(
        ", "
    );
    const placeholders = CLIENT_EXONERATED_COLUMNS.map(() => "?").join(", ");
    const insertSql = `INSERT INTO ${CLIENT_EXONERATED_TABLE} (${columnsSql}) VALUES (${placeholders});`;

    const transaction = await turso.transaction("write");
    try {
        for (const row of rows) {
            const values = CLIENT_EXONERATED_COLUMNS.map(
                (column) => row[column] ?? null
            );
            await transaction.execute({
                sql: insertSql,
                args: values as InValue[],
            });
        }
        await transaction.commit();
    } catch (error) {
        await transaction.close();
        throw error;
    }

    return rows.length;
}

export async function clearClientExonerated(): Promise<void> {
    await ensureClientExoneratedTable();
    await turso.execute(`DELETE FROM ${CLIENT_EXONERATED_TABLE};`);
}

export type ClientExoneratedPage = {
    rows: Record<string, unknown>[];
    total: number;
};

export async function listClientExonerated(
    limit: number,
    offset: number
): Promise<ClientExoneratedPage> {
    await ensureClientExoneratedTable();

    const countResult = await turso.execute(
        `SELECT COUNT(*) as total FROM ${CLIENT_EXONERATED_TABLE};`
    );
    const total = Number(countResult.rows[0][0] ?? 0);

    const dataResult = await turso.execute({
        sql: `SELECT * FROM ${CLIENT_EXONERATED_TABLE}
          ORDER BY DATE_INCLUSION DESC, NUMBER_PERSONAL_ID ASC
          LIMIT ? OFFSET ?;`,
        args: [limit, offset],
    });

    const rows = dataResult.rows.map((row) => {
        const record: Record<string, unknown> = {};
        dataResult.columns.forEach((col, idx) => {
            record[col] = row[idx];
        });
        return record;
    });

    return { rows, total };
}
