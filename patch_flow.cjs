const fs = require('fs');

const path = '/root/N8N/flujo_whatsapp_n8n_v3.json';
let flow = JSON.parse(fs.readFileSync(path, 'utf8'));

// 1. Create a "Preparar Agent" Set node
const prepNode = {
  "parameters": {
    "assignments": {
      "assignments": [
        {
          "id": "e00b3d5b-1",
          "name": "text",
          "value": "={{ $('Webhook').first().json.body?.data?.message?.conversation || $('Webhook').first().json.body?.data?.message?.extendedTextMessage?.text || 'Archivo enviado o mensaje sin texto' }}",
          "type": "string"
        },
        {
          "id": "e00b3d5b-2",
          "name": "remoteJid",
          "value": "={{ $('Webhook').first().json.body?.data?.key?.remoteJid || 'session_default' }}",
          "type": "string"
        }
      ]
    },
    "options": {}
  },
  "type": "n8n-nodes-base.set",
  "typeVersion": 3.4,
  "position": [7696, 7450],
  "id": "e00b3d5b-9d4f-4d3f-b88a-d5f4a1c5d333",
  "name": "Extraer Datos Texto"
};

const prepAudioNode = {
  "parameters": {
    "assignments": {
      "assignments": [
        {
          "id": "e00b3d5b-3",
          "name": "remoteJid",
          "value": "={{ $('Webhook').first().json.body?.data?.key?.remoteJid || 'session_default' }}",
          "type": "string"
        }
      ]
    },
    "options": {}
  },
  "type": "n8n-nodes-base.set",
  "typeVersion": 3.4,
  "position": [8044, 7280],
  "id": "e00b3d5b-9d4f-4d3f-b88a-d5f4a1c5d444",
  "name": "Extraer Datos Audio"
};

// 2. Add nodes to flow array
flow.nodes.push(prepNode);
flow.nodes.push(prepAudioNode);

// 3. Re-route 'If Audio' false branch (index 1) to 'Extraer Datos Texto'
flow.connections['If Audio'].main[1] = [
  {
    "node": "Extraer Datos Texto",
    "type": "main",
    "index": 0
  }
];

// Re-route 'Transcribir Audio' main to 'Extraer Datos Audio'
flow.connections['Transcribir Audio'].main[0] = [
  {
    "node": "Extraer Datos Audio",
    "type": "main",
    "index": 0
  }
];

// 4. Connect 'Extraer Datos Texto' and 'Extraer Datos Audio' to 'AI Agent'
flow.connections['Extraer Datos Texto'] = {
  "main": [
    [
      {
        "node": "AI Agent",
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
        "node": "AI Agent",
        "type": "main",
        "index": 0
      }
    ]
  ]
};

// 5. Fix AI Agent to use safe $json variables
const aiAgent = flow.nodes.find(n => n.name === 'AI Agent');
if (aiAgent) {
  aiAgent.parameters.text = "={{ $json.text || 'Sin texto' }}";
}

// 6. Fix Memory Session Key
const memoryNode = flow.nodes.find(n => n.name === 'Memoria del Chat1');
if (memoryNode) {
  memoryNode.parameters.sessionKey = "={{ $json.remoteJid || 'session_default' }}";
}

// 7. Fix Mensaje Rechazo remoteJid (just to be safe, although not strictly needed)

// Write back
fs.writeFileSync(path, JSON.stringify(flow, null, 2));
console.log("N8N Flow Patcher: Success!");
