import { SeatMapConfig, SeatMapRow, SeatMapSeat, SeatType, LayoutSummaryItem } from '../types';

/**
 * Generates a realistic cinema seat map configuration for a screen.
 * Follows the data model:
 * seatMap: {
 *   rows: [
 *     {
 *       row: "A",
 *       seats: [
 *         { col: 1, label: "A1", type: "standard", x: 0 },
 *         { col: 2, label: "A2", type: "standard", x: 1 },
 *         { col: 5, label: "A5", type: "premium",  x: 5 }
 *       ]
 *     }
 *   ],
 *   version: 1,
 *   updatedAt: <timestamp>
 * }
 */
export function createDefaultSeatMap(screenNumber: string): SeatMapConfig {
  const scr = String(screenNumber);

  if (scr === '1') {
    // Screen 1: Audi 1 (IMAX) - 10 rows (A to J), 20 seats per row with aisles after seat 6 and 14
    const rowLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
    const rows: SeatMapRow[] = rowLetters.map((r, rIdx) => {
      const seats: SeatMapSeat[] = [];
      let xPos = 0;

      // Seat type depending on row tier
      let defaultType: SeatType = 'standard';
      if (r === 'A' || r === 'B') defaultType = 'recliner';
      else if (r === 'C' || r === 'D' || r === 'E') defaultType = 'premium';

      for (let c = 1; c <= 20; c++) {
        // Skip seat 13 on superstitious cinema rows
        if (c === 13 && (r === 'A' || r === 'B')) continue;

        // Wheelchair spaces in Row D at aisle sides
        let seatType: SeatType = defaultType;
        if (r === 'D' && (c === 6 || c === 15)) {
          seatType = 'wheelchair';
        }
        // Couple seats in Row A middle
        if (r === 'A' && (c === 9 || c === 10 || c === 11 || c === 12)) {
          seatType = 'couple';
        }

        seats.push({
          col: c,
          label: `${r}${c}`,
          type: seatType,
          x: xPos,
        });

        xPos += 1;
        // Aisle gaps after seat 6 and 14
        if (c === 6 || c === 14) {
          xPos += 2; // Leave clear aisle space
        }
      }

      return {
        row: r,
        seats,
      };
    });

    return {
      rows,
      version: 1,
      updatedAt: Date.now(),
    };
  }

  if (scr === '2') {
    // Screen 2: Audi 2 (Dolby Atmos) - 15 rows (A to O)
    const rowLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O'];
    const rows: SeatMapRow[] = rowLetters.map((r, rIdx) => {
      const seats: SeatMapSeat[] = [];
      const totalSeatsInRow = r === 'O' ? 10 : 20;
      let xPos = r === 'O' ? 5 : 0; // Center row O

      let defaultType: SeatType = 'standard';
      if (r === 'A') defaultType = 'recliner';
      else if (['B', 'C', 'D'].includes(r)) defaultType = 'premium';

      for (let c = 1; c <= totalSeatsInRow; c++) {
        let seatType: SeatType = defaultType;
        if (r === 'E' && (c === 6 || c === 15)) {
          seatType = 'wheelchair';
        }

        seats.push({
          col: c,
          label: `${r}${c}`,
          type: seatType,
          x: xPos,
        });

        xPos += 1;
        if (r !== 'O' && (c === 6 || c === 14)) {
          xPos += 2;
        }
      }

      return {
        row: r,
        seats,
      };
    });

    return {
      rows,
      version: 1,
      updatedAt: Date.now(),
    };
  }

  // Screen 3: Audi 3 (Gold Class) - 13 rows (A to M) with luxury recliners & couple sofas
  const rowLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M'];
  const rows: SeatMapRow[] = rowLetters.map((r) => {
    const seats: SeatMapSeat[] = [];
    const totalSeatsInRow = r === 'M' ? 10 : 20;
    let xPos = r === 'M' ? 5 : 0;

    let defaultType: SeatType = ['A', 'B', 'C'].includes(r) ? 'recliner' : 'premium';
    if (['H', 'I', 'J', 'K', 'L'].includes(r)) defaultType = 'standard';

    for (let c = 1; c <= totalSeatsInRow; c++) {
      let seatType: SeatType = defaultType;
      if (r === 'B' && c >= 7 && c <= 14) {
        seatType = 'couple';
      }
      if (r === 'F' && (c === 6 || c === 15)) {
        seatType = 'wheelchair';
      }

      seats.push({
        col: c,
        label: `${r}${c}`,
        type: seatType,
        x: xPos,
      });

      xPos += 1;
      if (r !== 'M' && (c === 6 || c === 14)) {
        xPos += 2;
      }
    }

    return {
      row: r,
      seats,
    };
  });

  return {
    rows,
    version: 1,
    updatedAt: Date.now(),
  };
}

/**
 * Computes summary layout [{ row: string, seats: count }] for older compatibility
 */
export function createSummaryLayout(seatMap: SeatMapConfig): LayoutSummaryItem[] {
  if (!seatMap || !Array.isArray(seatMap.rows)) return [];
  return seatMap.rows.map((r) => ({
    row: r.row,
    seats: r.seats.length,
  }));
}

/**
 * Validates any seatMap JSON string with comprehensive schema error reporting
 */
export function validateSeatMapJson(jsonString: string): {
  valid: boolean;
  seatMap?: SeatMapConfig;
  error?: string;
  totalSeats?: number;
  duplicateLabels?: string[];
} {
  try {
    const parsed = JSON.parse(jsonString);

    if (!parsed || typeof parsed !== 'object') {
      return { valid: false, error: 'JSON root must be an object containing "rows"' };
    }

    if (!Array.isArray(parsed.rows)) {
      return { valid: false, error: 'Seat map must contain a "rows" array' };
    }

    const seenLabels = new Set<string>();
    const duplicateLabels: string[] = [];
    let totalSeats = 0;

    const validatedRows: SeatMapRow[] = [];

    for (let rIdx = 0; rIdx < parsed.rows.length; rIdx++) {
      const rowItem = parsed.rows[rIdx];
      if (!rowItem || typeof rowItem !== 'object') {
        return { valid: false, error: `Row at index ${rIdx} is not a valid object` };
      }
      const rowLetter = String(rowItem.row || '').trim().toUpperCase();
      if (!rowLetter) {
        return { valid: false, error: `Row at index ${rIdx} is missing a row letter` };
      }

      if (!Array.isArray(rowItem.seats)) {
        return { valid: false, error: `Row ${rowLetter} is missing a "seats" array` };
      }

      const validatedSeats: SeatMapSeat[] = [];

      for (let sIdx = 0; sIdx < rowItem.seats.length; sIdx++) {
        const s = rowItem.seats[sIdx];
        if (!s || typeof s !== 'object') {
          return { valid: false, error: `Seat at index ${sIdx} in Row ${rowLetter} is invalid` };
        }

        const col = Number(s.col);
        if (isNaN(col) || col < 0) {
          return { valid: false, error: `Seat in Row ${rowLetter} has an invalid "col" number` };
        }

        const label = String(s.label || `${rowLetter}${col}`).trim().toUpperCase();
        if (seenLabels.has(label)) {
          duplicateLabels.push(label);
        }
        seenLabels.add(label);

        const validTypes: SeatType[] = ['standard', 'premium', 'recliner', 'wheelchair', 'couple'];
        const type: SeatType = validTypes.includes(s.type) ? s.type : 'standard';

        const x = typeof s.x === 'number' && !isNaN(s.x) ? s.x : sIdx;

        validatedSeats.push({
          col,
          label,
          type,
          x,
        });
        totalSeats++;
      }

      validatedRows.push({
        row: rowLetter,
        seats: validatedSeats,
        offset: typeof rowItem.offset === 'number' ? rowItem.offset : undefined,
      });
    }

    const config: SeatMapConfig = {
      rows: validatedRows,
      version: Number(parsed.version) || 1,
      updatedAt: Number(parsed.updatedAt) || Date.now(),
    };

    return {
      valid: true,
      seatMap: config,
      totalSeats,
      duplicateLabels,
    };
  } catch (err: any) {
    return { valid: false, error: `Invalid JSON syntax: ${err.message}` };
  }
}
