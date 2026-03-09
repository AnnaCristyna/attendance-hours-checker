"use strict";

/**
 * checkBusinessHours.js
 *
 * Core module. Exposes a single async function that determines whether
 * a given date/time falls within UniUn1ca's business hours.
 *
 * Import and use it anywhere:
 *   const { checkBusinessHours } = require("./checkBusinessHours");
 *   const result = await checkBusinessHours(new Date());
 */

const https = require("https");
const { TIMEZONE, BUSINESS_HOURS, HOLIDAYS_API_URL } = require("./config");

// ─── Timezone utilities ───────────────────────────────────────

function toLocaleDateString(date) {
  // ISO format gives yyyy-mm-dd; timezone offset doesn't matter for date portion
  return date.toLocaleString("sv", { timeZone: TIMEZONE }).slice(0, 10);
}

function getLocaleTime(date) {
  const parts = new Intl.DateTimeFormat("pt-BR", {
    timeZone: TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  return {
    hour:   parseInt(parts.find((p) => p.type === "hour").value,   10),
    minute: parseInt(parts.find((p) => p.type === "minute").value, 10),
  };
}

function getLocaleWeekday(date) {
  // converting via toLocaleString is the simplest reliable way to get the
  // weekday number adjusted for the target timezone.
  return new Date(
    date.toLocaleString("en-US", { timeZone: TIMEZONE })
  ).getDay();
}

function formatHour(hour) {
  return `${String(hour).padStart(2, "0")}:00`;
}

// ─── Holiday fetching ─────────────────────────────────────────

/**
 * Fetches Brazilian public holidays from BrasilAPI.
 * If the API is unreachable, returns an empty list and verified: false.
 * There is no hardcoded fallback — the caller decides how to handle it.
 *
 * @param {number} year
 * @returns {Promise<{ holidays: string[], verified: boolean }>}
 */
function fetchHolidays(year) {
  return new Promise((resolve) => {
    https
      .get(HOLIDAYS_API_URL(year), (res) => {
        let raw = "";
        res.on("data", (chunk) => (raw += chunk));
        res.on("end", () => {
          try {
            const holidays = JSON.parse(raw).map((h) => h.date);
            resolve({ holidays, verified: true });
          } catch {
            resolve({ holidays: [], verified: false });
          }
        });
      })
      .on("error", () => {
        resolve({ holidays: [], verified: false });
      });
  });
}

// ─── Pure decision functions ──────────────────────────────────

function isWeekend(weekday) {
  return weekday === 0 || weekday === 6;
}

function isHoliday(dateString, holidays) {
  return holidays.includes(dateString);
}

function isWithinBusinessHours(timeDecimal, schedule) {
  return timeDecimal >= schedule.opens && timeDecimal < schedule.closes;
}

// ─── Result builder ───────────────────────────────────────────

/**
 * @typedef {Object} BusinessHoursResult
 * @property {boolean} open
 * @property {"ABERTO"|"FECHADO"} status
 * @property {"within_hours"|"outside_hours"|"weekend"|"holiday"} reason
 * @property {string} message
 * @property {string|null} warning        — set when BrasilAPI was unreachable
 * @property {boolean} holidaysVerified   — false if API was unreachable
 * @property {string} checkedAt           — ISO 8601
 * @property {{ opens: string, closes: string }|null} businessHours
 */

function buildResult({ open, reason, message, warning = null, holidaysVerified, businessHours }) {
  return {
    open,
    status: open ? "ABERTO" : "FECHADO",
    reason,
    message,
    warning,
    holidaysVerified,
    checkedAt: new Date().toLocaleString("pt-BR", { timeZone: TIMEZONE }),
    businessHours,
  };
}

// ─── Main exported function ───────────────────────────────────

/**
 * Determines whether the given date/time is within business hours.
 *
 * Checks in order:
 *   1. Weekend
 *   2. Public holiday (via BrasilAPI — no hardcoded fallback)
 *   3. Daily schedule from config
 *
 * When BrasilAPI is unreachable the result includes:
 *   { holidaysVerified: false, warning: "Não foi possível verificar feriados..." }
 *
 * @param {Date} [date=new Date()]
 * @returns {Promise<BusinessHoursResult>}
 */
async function checkBusinessHours(date = new Date()) {
  const dateString  = toLocaleDateString(date);
  const year        = parseInt(dateString.slice(0, 4), 10);
  const weekday     = getLocaleWeekday(date);
  const time        = getLocaleTime(date);
  const timeDecimal = time.hour + time.minute / 60;

  // Step 1 — weekend
  if (isWeekend(weekday)) {
    return buildResult({
      open:             false,
      reason:           "weekend",
      message:          "Fechado. Atendimento apenas de Segunda a Sexta.",
      holidaysVerified: true,
      businessHours:    null,
    });
  }

  // Step 2 — public holiday
  // call via module.exports so tests (and other consumers) can stub/override
  const { holidays, verified } = await module.exports.fetchHolidays(year);

  const warning = verified
    ? null
    : "Não foi possível verificar feriados. BrasilAPI inacessível.";

  if (isHoliday(dateString, holidays)) {
    return buildResult({
      open:             false,
      reason:           "holiday",
      message:          `Fechado. ${dateString} é feriado nacional.`,
      holidaysVerified: verified,
      businessHours:    null,
    });
  }

  // Step 3 — daily schedule
  const schedule = BUSINESS_HOURS[weekday];

  if (schedule === null) {
    return buildResult({
      open: false,
      reason: "outside_hours",
      message: "Fechado. Sem expediente configurado para este dia.",
      warning,
      holidaysVerified: verified,
      businessHours: null,
    });
  }

  if (isWithinBusinessHours(timeDecimal, schedule)) {
    return buildResult({
      open:             true,
      reason:           "within_hours",
      message:          `Aberto. Atendimento das ${formatHour(schedule.opens)} às ${formatHour(schedule.closes)}.`,
      warning,
      holidaysVerified: verified,
      businessHours: {
        opens:  formatHour(schedule.opens),
        closes: formatHour(schedule.closes),
      },
    });
  }

  const outsideMessage = timeDecimal < schedule.opens
    ? `Fechado. Ainda não abrimos. Abrimos às ${formatHour(schedule.opens)}.`
    : `Fechado. Já encerramos. Fechamos às ${formatHour(schedule.closes)}.`;

  return buildResult({
    open:             false,
    reason:           "outside_hours",
    message:          outsideMessage,
    warning,
    holidaysVerified: verified,
    businessHours: {
      opens:  formatHour(schedule.opens),
      closes: formatHour(schedule.closes),
    },
  });
}

module.exports = {
  checkBusinessHours,
  fetchHolidays,
  toLocaleDateString,
  getLocaleTime,
  getLocaleWeekday,
  isWeekend,
  isHoliday,
  isWithinBusinessHours,
};