"use strict";

/**
 * index.js
 *
 * Entry point. Runs all test scenarios and prints results to the console.
 * Execute with: node index.js
 */

const { checkBusinessHours } = require("./checkBusinessHours");

// ─── Scenarios ────────────────────────────────────────────────

const scenarios = [
  // Required scenarios from the brief
  {
    label:    "Cenário 1 — Terça-feira, 10:15",
    date:     new Date("2025-12-30T10:15:00-03:00"),
    expected: "ABERTO",
  },
  {
    label:    "Cenário 2 — Terça-feira, 19:10",
    date:     new Date("2025-12-30T19:10:00-03:00"),
    expected: "FECHADO",
  },
  {
    label:    "Cenário 3 — Domingo, 11:00",
    date:     new Date("2025-12-28T11:00:00-03:00"),
    expected: "FECHADO",
  },
  {
    label:    "Cenário 4 — Natal (quinta-feira), 10:00",
    date:     new Date("2025-12-25T10:00:00-03:00"),
    expected: "FECHADO",
  },
  // Extra scenarios
  {
    label:    "Cenário 5 — Sexta-feira, 14:00 (dentro do horário)",
    date:     new Date("2026-01-09T14:00:00-03:00"),
    expected: "ABERTO",
  },
  {
    label:    "Cenário 6 — Sexta-feira, 19:30 (após o horário)",
    date:     new Date("2026-01-09T19:30:00-03:00"),
    expected: "FECHADO",
  },
  {
    label:    "Cenário 7 — Agora (data/hora atual do sistema)",
    date:     new Date(),
    expected: null, // no expected value for real-time check
  },
];

// ─── Runner ───────────────────────────────────────────────────

function printHeader() {
  console.log("\n╔══════════════════════════════════════════════════════╗");
  console.log("║   Verificador de Horário de Atendimento              ║");
  console.log("║   UniUn1ca — Teste Prático: Automação                ║");
  console.log("╚══════════════════════════════════════════════════════╝");
}

function printScenarioResult(scenario, result) {
  const icon        = result.open ? "✅" : "❌";
  const passIcon    = scenario.expected === null ? "🕐" :
                      result.status === scenario.expected ? "✔" : "✘";
  const expectedTag = scenario.expected
    ? ` (esperado: ${scenario.expected})`
    : " (tempo real)";

  console.log(`\n🔍 ${scenario.label}${expectedTag}`);
  console.log("  " + "─".repeat(54));
  console.log(`  📅  Data/hora  : ${result.checkedAt}`);
  console.log(`  ${icon}  Status     : ${result.status}`);
  console.log(`  💬  Mensagem   : ${result.message}`);
  console.log(`  🔖  Motivo     : ${result.reason}`);
  console.log(`  ${passIcon}  Resultado  : ${
    scenario.expected === null
      ? "verificação em tempo real"
      : result.status === scenario.expected
        ? "correto"
        : `DIVERGÊNCIA — esperado ${scenario.expected}`
  }`);

  console.log("\n  📦  Objeto retornado:");
  console.log(
    JSON.stringify(result, null, 2)
      .split("\n")
      .map((line) => "      " + line)
      .join("\n")
  );
}

async function run() {
  printHeader();

  for (const scenario of scenarios) {
    const result = await checkBusinessHours(scenario.date);
    printScenarioResult(scenario, result);
  }

  console.log("\n" + "═".repeat(56));
  console.log("  Execução concluída.");
  console.log("═".repeat(56) + "\n");
}

run();
