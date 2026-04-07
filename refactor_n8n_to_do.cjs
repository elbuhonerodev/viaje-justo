const fs = require('fs');

const path = 'public/viajejusto-n8n-flow.json';
let flow = JSON.parse(fs.readFileSync(path, 'utf8'));

// Delete the following nodes
const nodesToDelete = [
  "AI Agent",
  "Memoria del Chat1",
  "Groq Chat Model",
  "Consultar Divisas",
  "Actualizar Invitado",
  "Create viaje",
  "Agente Turístico (DO)",
  "Limpiar Output" 
];

flow.nodes = flow.nodes.filter(n => !nodesToDelete.includes(n.name));

// Create the new DO Agent Passthrough node
const doAgentNode = {
  "parameters": {
    "method": "POST",
    "url": "http://159.89.122.250:3002/bot/chat",
    "sendBody": true,
    "specifyBody": "json",
    "jsonBody": `={{ {
  "phone": $json.remoteJid,
  "text": $json.text,
  "contextString": "Nombre: " + $('If Registrado').first().json.nombre + "\\nRol: " + $('If Registrado').first().json.role + "\\nViaje ID: " + $('If Registrado').first().json.participante_id
} }}`,
    "options": {}
  },
  "type": "n8n-nodes-base.httpRequest",
  "typeVersion": 4.3,
  "position": [
    7504,
    7376
  ],
  "id": "abcde-12345-do-agent-passthrough",
  "name": "DO Agent Chat"
};

flow.nodes.push(doAgentNode);

// Clean up connections pointing to deleted nodes
for (const [nodeName, nodeConns] of Object.entries(flow.connections)) {
  if (nodesToDelete.includes(nodeName)) {
    delete flow.connections[nodeName];
    continue;
  }
  
  if (nodeConns.main) {
    nodeConns.main = nodeConns.main.map(branch => {
      return branch.filter(target => !nodesToDelete.includes(target.node));
    });
  }
}

// Connect 'Extraer Datos Texto' and 'Extraer Datos Audio' to 'DO Agent Chat'
flow.connections['Extraer Datos Texto'] = {
  "main": [
    [
      {
        "node": "DO Agent Chat",
        "type": "main",
        "index": 0
      }
    ]
  ]
};

flow.connections['Extraer Datos Audio'] = {
  "main": [
    [
      {
        "node": "DO Agent Chat",
        "type": "main",
        "index": 0
      }
    ]
  ]
};

// Connect 'DO Agent Chat' to 'HTTP Request Evolution API'
flow.connections['DO Agent Chat'] = {
  "main": [
    [
      {
        "node": "HTTP Request Evolution API",
        "type": "main",
        "index": 0
      }
    ]
  ]
};

// Modify HTTP Request Evolution API to use the output from DO Agent Chat
const evolutionNode = flow.nodes.find(n => n.name === 'HTTP Request Evolution API');
if (evolutionNode) {
  evolutionNode.parameters.jsonBody = `={{ {
  "number": $('Webhook').first().json.body?.data?.key?.remoteJid?.replace('@s.whatsapp.net', '') || '',
  "text": $json.output
} }}`;
}

// Save back
fs.writeFileSync(path, JSON.stringify(flow, null, 2));
fs.copyFileSync(path, 'flujo_whatsapp_n8n_v3.json');
console.log("N8N Flow rewritten to DO Agent Pass-Through");
