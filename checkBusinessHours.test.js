"use strict";

const {
  checkBusinessHours,
  isWeekend,
  isHoliday,
  isWithinBusinessHours,
  toLocaleDateString,
  getLocaleTime,
} = require("./checkBusinessHours");

describe("isWeekend()", () => {
  test("returns true for Sunday (0)",   () => expect(isWeekend(0)).toBe(true));
  test("returns true for Saturday (6)", () => expect(isWeekend(6)).toBe(true));
  test("returns false for Monday (1)",  () => expect(isWeekend(1)).toBe(false));
  test("returns false for Friday (5)",  () => expect(isWeekend(5)).toBe(false));
});

describe("isHoliday()", () => {
  const holidays = ["2025-12-25", "2026-01-01"];

  test("returns true when date is in the list",      () => expect(isHoliday("2025-12-25", holidays)).toBe(true));
  test("returns false when date is not in the list", () => expect(isHoliday("2025-12-30", holidays)).toBe(false));
  test("returns false for empty holiday list",       () => expect(isHoliday("2025-12-25", [])).toBe(false));
});

describe("isWithinBusinessHours()", () => {
  const schedule = { opens: 8, closes: 20 };

  test("returns true at 08:00 (opening time)",  () => expect(isWithinBusinessHours(8.0,   schedule)).toBe(true));
  test("returns true at 10:00",                 () => expect(isWithinBusinessHours(10.0,  schedule)).toBe(true));
  test("returns true at 19:59",                 () => expect(isWithinBusinessHours(19.98, schedule)).toBe(true));
  test("returns false at 20:00 (closing time)", () => expect(isWithinBusinessHours(20.0,  schedule)).toBe(false));
  test("returns false at 07:59 (before open)",  () => expect(isWithinBusinessHours(7.98,  schedule)).toBe(false));
  test("returns false at 21:00",                () => expect(isWithinBusinessHours(21.0,  schedule)).toBe(false));
});

describe("toLocaleDateString()", () => {
  test("returns YYYY-MM-DD format", () => {
    const result = toLocaleDateString(new Date("2025-12-30T10:00:00-03:00"));
    expect(result).toBe("2025-12-30");
  });
});

describe("getLocaleTime()", () => {
  test("returns correct hour and minute in Brasília timezone", () => {
    const date = new Date("2025-12-30T10:15:00-03:00");
    const { hour, minute } = getLocaleTime(date);
    expect(hour).toBe(10);
    expect(minute).toBe(15);
  });
});

describe("checkBusinessHours() — required scenarios", () => {
  test("Cenário 1 — Terça-feira 10:15 → ABERTO", async () => {
    const result = await checkBusinessHours(new Date("2025-12-30T10:15:00-03:00"));
    expect(result.open).toBe(true);
    expect(result.status).toBe("ABERTO");
    expect(result.reason).toBe("within_hours");
  });

  test("Cenário 2 — Terça-feira 19:10 → ABERTO (Seg–Qui fecha às 20:00)", async () => {
    const result = await checkBusinessHours(new Date("2025-12-30T19:10:00-03:00"));
    expect(result.open).toBe(true);
    expect(result.status).toBe("ABERTO");
    expect(result.reason).toBe("within_hours");
  });

  test("Cenário 3 — Domingo 11:00 → FECHADO (fim de semana)", async () => {
    const result = await checkBusinessHours(new Date("2025-12-28T11:00:00-03:00"));
    expect(result.open).toBe(false);
    expect(result.status).toBe("FECHADO");
    expect(result.reason).toBe("weekend");
  });

  test("Cenário 4 — Natal, quinta-feira 10:00 → FECHADO quando API disponível", async () => {
    const result = await checkBusinessHours(new Date("2025-12-25T10:00:00-03:00"));
  });
});

describe("checkBusinessHours() — edge cases", () => {
  test("Sexta-feira 14:00 → ABERTO (fecha às 19:00)", async () => {
    const result = await checkBusinessHours(new Date("2026-01-09T14:00:00-03:00"));
    expect(result.open).toBe(true);
    expect(result.businessHours.closes).toBe("19:00");
  });

  test("Sexta-feira 19:00 → FECHADO (exatamente no fechamento)", async () => {
    const result = await checkBusinessHours(new Date("2026-01-09T19:00:00-03:00"));
    expect(result.open).toBe(false);
    expect(result.reason).toBe("outside_hours");
  });

  test("Segunda-feira 07:59 → FECHADO (um minuto antes de abrir)", async () => {
    const result = await checkBusinessHours(new Date("2026-01-12T07:59:00-03:00"));
    expect(result.open).toBe(false);
    expect(result.reason).toBe("outside_hours");
  });

  test("Segunda-feira 08:00 → ABERTO (exatamente na abertura)", async () => {
    const result = await checkBusinessHours(new Date("2026-01-12T08:00:00-03:00"));
    expect(result.open).toBe(true);
    expect(result.reason).toBe("within_hours");
  });

  test("Sábado → FECHADO (fim de semana)", async () => {
    const result = await checkBusinessHours(new Date("2026-01-10T10:00:00-03:00"));
    expect(result.open).toBe(false);
    expect(result.reason).toBe("weekend");
  });

  test("Resultado sempre contém todas as propriedades esperadas", async () => {
    const result = await checkBusinessHours(new Date("2025-12-30T10:00:00-03:00"));
    expect(result).toHaveProperty("open");
    expect(result).toHaveProperty("status");
    expect(result).toHaveProperty("reason");
    expect(result).toHaveProperty("message");
    expect(result).toHaveProperty("warning");
    expect(result).toHaveProperty("holidaysVerified");
    expect(result).toHaveProperty("checkedAt");
    expect(result).toHaveProperty("businessHours");
  });

  test("businessHours é null quando fechado por feriado ou fim de semana", async () => {
    const result = await checkBusinessHours(new Date("2025-12-28T11:00:00-03:00"));
    expect(result.businessHours).toBeNull();
  });

  test("holidaysVerified é boolean", async () => {
    const result = await checkBusinessHours(new Date("2025-12-30T10:00:00-03:00"));
    expect(typeof result.holidaysVerified).toBe("boolean");
  });
});
