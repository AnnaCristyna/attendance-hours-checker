"use strict";

/**
 * config.js
 *
 * Central configuration for the business hours checker.
 * Edit this file to update schedules or timezone without touching business logic.
 */

const TIMEZONE = "America/Sao_Paulo";

/**
 * Business hours per weekday.
 * Key = Date.getDay() value (0 = Sunday, 1 = Monday … 6 = Saturday).
 * null = closed all day.
 */
const BUSINESS_HOURS = {
  0: null,                       // Sunday
  1: { opens: 8, closes: 20 },  // Monday
  2: { opens: 8, closes: 20 },  // Tuesday
  3: { opens: 8, closes: 20 },  // Wednesday
  4: { opens: 8, closes: 20 },  // Thursday
  5: { opens: 8, closes: 19 },  // Friday
  6: null,                       // Saturday
};

const WEEKDAY_NAMES_PT = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];

/** BrasilAPI endpoint for public holidays. */
const HOLIDAYS_API_URL = (year) =>
  `https://brasilapi.com.br/api/feriados/v1/${year}`;

module.exports = {
  TIMEZONE,
  BUSINESS_HOURS,
  WEEKDAY_NAMES_PT,
  HOLIDAYS_API_URL,
};
