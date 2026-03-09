# Business Hours Checker

Verifica se a data/hora atual está dentro do horário de atendimento da **UniUn1ca**, considerando finais de semana e feriados nacionais brasileiros.

Desenvolvido como entregável do **Teste Prático — Automação**.

---

## Horário de funcionamento

| Dia              | Horário             |
|------------------|---------------------|
| Segunda a Quinta | 08:00 às 20:00      |
| Sexta-feira      | 08:00 às 19:00      |
| Sábado e Domingo | Fechado             |
| Feriados nacionais | Fechado           |

> Todos os horários são no fuso **America/Sao_Paulo (Brasília)**.

---

## Requisitos

- [Node.js](https://nodejs.org) >= 18.0.0
- Sem dependências de produção — apenas `https` nativo do Node

---

## Instalação

```bash
git clone https://github.com/seu-usuario/business-hours-checker.git
cd business-hours-checker
npm install
```

---

## Como usar

### Rodar os cenários de teste

```bash
node index.js
```

Saída esperada:

```
🔍 Cenário 1 — Terça-feira, 10:15 (esperado: ABERTO)
  ──────────────────────────────────────────────────────
  ✅  Status     : ABERTO
  💬  Mensagem   : Aberto. Atendimento das 08:00 às 20:00.
  🔖  Motivo     : within_hours
  ✔  Resultado  : correto
```

### Rodar os testes automatizados

```bash
npm test
```

---

## Integração

Importe a função principal em qualquer outro módulo:

```js
const { checkBusinessHours } = require("./checkBusinessHours");

const result = await checkBusinessHours(new Date());

console.log(result.open);    // true ou false
console.log(result.message); // mensagem em português
```

### Objeto retornado

```json
{
  "open": true,
  "status": "ABERTO",
  "reason": "within_hours",
  "message": "Aberto. Atendimento das 08:00 às 20:00.",
  "checkedAt": "2025-12-30T13:15:00.000Z",
  "businessHours": {
    "opens": "08:00",
    "closes": "20:00"
  }
}
```

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `open` | `boolean` | `true` se estiver dentro do horário |
| `status` | `string` | `"ABERTO"` ou `"FECHADO"` |
| `reason` | `string` | `within_hours` / `outside_hours` / `weekend` / `holiday` |
| `message` | `string` | Mensagem legível em português |
| `checkedAt` | `string` | Timestamp ISO 8601 da verificação |
| `businessHours` | `object\|null` | Horário do dia verificado, ou `null` se fechado por feriado/fim de semana |

---

## Estrutura do projeto

```
business-hours-checker/
├── config.js                    # Horários, fuso e feriados fixos
├── checkBusinessHours.js        # Lógica principal (importável)
├── checkBusinessHours.test.js   # Testes automatizados (Jest)
├── index.js                     # Entry point — roda os cenários
└── package.json
```

---

## Feriados

Os feriados são buscados automaticamente via **[BrasilAPI](https://brasilapi.com.br/api/feriados/v1/2026)**.
