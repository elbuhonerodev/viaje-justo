const fs = require('fs');
const path = 'public/viajejusto-n8n-flow.json';
let flow = JSON.parse(fs.readFileSync(path, 'utf8'));

// Delete the old toolHttpRequest Consultar Divisas
const oldToolIndex = flow.nodes.findIndex(n => n.name === 'Consultar Divisas');
if (oldToolIndex !== -1) {
  flow.nodes.splice(oldToolIndex, 1);
}

// Ensure connections are cleared for old tool
delete flow.connections['Consultar Divisas'];

// Add the new robust Code tool
const codeTool = {
  "parameters": {
    "name": "Consultar_Divisas",
    "description": "Úsala SIEMPRE que el usuario pregunte por tasas de cambio o valor de monedas (dólar, euro, peso, etc). Retorna las tasas globales en base USD en tiempo real.",
    "jsCode": "try {\n  const res = await fetch('https://open.er-api.com/v6/latest/USD');\n  const data = await res.json();\n  return JSON.stringify(data.rates);\n} catch (e) {\n  return JSON.stringify({ error: 'No se pudo obtener la tasa' });\n}"
  },
  "type": "@n8n/n8n-nodes-langchain.tool",
  "typeVersion": 1.1,
  "position": [7280, 7488],
  "id": "e4f5a6b7-c8d9-0123-ef01-234567890def",
  "name": "Consultar Divisas"
};

flow.nodes.push(codeTool);

// Reconnect to AI Agent ai_tool index 0
flow.connections['Consultar Divisas'] = {
  "ai_tool": [
    [
      {
        "node": "AI Agent",
        "type": "ai_tool",
        "index": 0
      }
    ]
  ]
};

// Update the AI Agent prompt just in case to be simpler
const aiAgent = flow.nodes.find(n => n.name === 'AI Agent');
if (aiAgent) {
  aiAgent.parameters.options.systemMessage = aiAgent.parameters.options.systemMessage.replace(
    /🔹 \*Consultar Divisas\*.*?\n/gs,
    "🔹 *Consultar_Divisas* → �� Úsala SIEMPRE para buscar la tasa de cambio entre monedas. IMPORTANTE: La herramienta no recibe parámetros y siempre devuelve todas las tasas globales contra el Dólar (USD). Tú mismo debes usar matemáticas básicas para convertir si preguntan por otras monedas (ej: divides la tasa).\n"
  );
}

fs.writeFileSync(path, JSON.stringify(flow, null, 2));
fs.copyFileSync(path, 'flujo_whatsapp_n8n_v3.json'); // Sync back

console.log("Bulletproof tool replaced");
