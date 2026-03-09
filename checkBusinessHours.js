"use strict";

/**
 * checkBusinessHours.js
 *
 * Import and use it anywhere:
 *   const { checkBusinessHours } = require("./checkBusinessHours");
 *   const result = await checkBusinessHours(new Date());
 */

const https = require("https");
const { TIMEZONE, BUSINESS_HOURS, HOLIDAYS_API_URL } = require("./config");

function toLocaleDateString(date) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(date)
    .split("/")
    .reverse()
    .join("-");
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
  return new Date(
    date.toLocaleString("en-US", { timeZone: TIMEZONE })
  ).getDay();
}

function formatHour(hour) {
  return `${String(hour).padStart(2, "0")}:00`;
}

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
    status:           open ? "ABERTO" : "FECHADO",
    reason,
    message,
    warning,
    holidaysVerified,
    checkedAt: new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }),
    businessHours,
  };
}

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

  if (isWeekend(weekday)) {
    return buildResult({
      open:             false,
      reason:           "weekend",
      message:          "Fechado. Atendimento apenas de Segunda a Sexta.",
      holidaysVerified: true,
      businessHours:    null,
    });
  }

  const { holidays, verified } = await fetchHolidays(year);

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

  const schedule = BUSINESS_HOURS[weekday];

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
  toLocaleDateString,
  getLocaleTime,
  getLocaleWeekday,
  isWeekend,
  isHoliday,
  isWithinBusinessHours,
};
