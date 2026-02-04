import { parseDepositsCsv, DEPOSITS_DP10_COLUMNS } from '../deposits';

const VALID_HEADER = DEPOSITS_DP10_COLUMNS.join('|');

describe('parseDepositsCsv', () => {
    it('should parse valid CSV data correctly', () => {
        const rowData = DEPOSITS_DP10_COLUMNS.map((col, index) => {
            if (['FECHA_NEGOCIACION', 'FECHA_REG_APERTURA', 'FECHA_APROBO_APERTURA', 'FECHA_SOLICITUD_EXONERACION', 'FECHA_APROBO_EXONERACION', 'FECHA_REG_CANCELACION', 'FECHA_APR_CANCELACION'].includes(col)) {
                return '2301011200'; // Date10
            }
            if (col.startsWith('FECHA_')) {
                return '20230101'; // Date8
            }
            if (['MONTO_APERTURA', 'SALDO_CAPITAL_ACTUAL', 'MONTO_ORIG_FONDEO', 'MONTO_EFEC_FONDEO', 'MONTO_CHEQ_FONDEO', 'MONTO_DP_CANCELADO', 'INTERES_ACUMULADO', 'INTERES_DEVENGADO', 'SALDO_CIERRE', 'TOTAL_EMBARGO_PARCIAL', 'COMISION_MINIMA', 'COMISION_CALCULADA', 'COMISION_EXONERADA', 'COMISION_PAGAR', 'MONTO_RETEN_IMP_INT'].includes(col)) {
                return '1000.50';
            }
            if (['TASA_OPERACION', 'TASA_POOL'].includes(col)) {
                return '0.05';
            }
            if (col === 'TIENE_SOLICITUD_EXONERACION') return 'NO';

            return `value_${index}`;
        });

        const csvContent = `${VALID_HEADER}\n${rowData.join('|')}`;
        const buffer = Buffer.from(csvContent);

        const result = parseDepositsCsv(buffer);

        expect(result.errors).toHaveLength(0);
        expect(result.rows).toHaveLength(1);
        expect(result.rows[0].MONTO_APERTURA).toBe(1000.50);
    });

    it('should return error for invalid header', () => {
        const csvContent = `INVALID_HEADER|COL2\nval1|val2`;
        const buffer = Buffer.from(csvContent);

        const result = parseDepositsCsv(buffer);

        expect(result.errors).toHaveLength(1);
        expect(result.errors[0].column).toBe('HEADER');
        expect(result.rows).toHaveLength(0);
    });

    it('should validate decimal fields', () => {
        // Construct a row with invalid decimal
        const rawRow = DEPOSITS_DP10_COLUMNS.map((col) => {
            if (col === 'MONTO_APERTURA') return 'INVALID_NUMBER';
            if (col === 'FECHA_NEGOCIACION') return '2301011200'; // Valid Date10
            if (col === 'FECHA_EFECTIVA') return '20230101'; // Valid Date8
            return 'valid';
        });

        const csvContent = `${VALID_HEADER}\n${rawRow.join('|')}`;
        const buffer = Buffer.from(csvContent);

        const result = parseDepositsCsv(buffer);

        // Expect validation error for MONTO_APERTURA
        const error = result.errors.find(e => e.column === 'MONTO_APERTURA');
        expect(error).toBeDefined();
        // Depending on implementation, it might add error and NOT add row, or add valid fields.  
        // Source says: "errors.push(...rowErrors); if (rowErrors.length > 0) return;" 
        // So no row should be added.
        expect(result.rows).toHaveLength(0);
    });
});
