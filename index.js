"use strict";

/**
 * index.js
 *
 * Entry point. Checks whether the current date/time (or a provided one)
 * is within UniUn1ca's business hours.
 *
 * Usage:
 *   node index.js                              — checks current time
 *   node index.js "2025-12-25T10:00:00-03:00" — checks a specific date/time
 */

const { checkBusinessHours } = require("./checkBusinessHours");

async function run() {
  const customInput = process.argv[2];
  const date = customInput ? new Date(customInput) : new Date();

  if (customInput && isNaN(date)) {
    console.log("\n❌ Data inválida. Use o formato: YYYY-MM-DDTHH:MM:SS-03:00");
    console.log("   Exemplo: node index.js \"2025-12-30T10:15:00-03:00\"\n");
    return;
  }

  const result = await checkBusinessHours(date);

  console.log("\n" + "─".repeat(50));
  console.log(`  ${result.open ? "✅" : "❌"}  ${result.status}`);
  console.log(`  💬  ${result.message}`);
  if (result.warning) {
    console.log(`  ⚠️   ${result.warning}`);
  }
  console.log("\n  📦  Objeto completo:");
  console.log(JSON.stringify(result, null, 2).split("\n").map((l) => "  " + l).join("\n"));
  console.log("─".repeat(50) + "\n");
}

run();