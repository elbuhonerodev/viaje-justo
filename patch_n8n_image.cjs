const fs = require('fs');

const path = 'public/viajejusto-n8n-flow.json';
let flow = JSON.parse(fs.readFileSync(path, 'utf8'));

// Nodos a agregar
const ifImageNode = {
  "parameters": {
    "conditions": {
      "options": { "caseSensitive": true, "leftValue": "", "typeValidation": "loose", "version": 3 },
      "conditions": [
        {
          "id": "cond-image",
          "leftValue": "={{ !!$('Webhook').first().json.body?.data?.message?.imageMessage }}",
          "rightValue": true,
          "operator": { "type": "boolean", "operation": "true", "singleValue": true }
        }
      ],
      "combinator": "and"
    },
    "options": {}
  },
  "type": "n8n-nodes-base.if",
  "typeVersion": 2.3,
  "position": [7696, 7600], // just below Extraer Datos Texto
  "id": "image-if-branch-uuid",
  "name": "If Image"
};

const getImageBase64Node = {
  "parameters": {
    "method": "POST",
    "url": "https://ws-manager.viaje-justo.xyz/chat/getBase64FromMediaMessage/ViajeJusto",
    "sendHeaders": true,
    "headerParameters": { "parameters": [ { "name": "apikey", "value": "429683C4C977415CAAFCCE10F7D57E11" } ] },
    "sendBody": true,
    "specifyBody": "json",
    "jsonBody": "={{ { \"message\": { \"imageMessage\": $('Webhook').first().json.body?.data?.message?.imageMessage, \"key\": $('Webhook').first().json.body?.data?.key }, \"convertToMp4\": false } }}",
    "options": {}
  },
  "type": "n8n-nodes-base.httpRequest",
  "typeVersion": 4.3,
  "position": [7888, 7600],
  "id": "image-get-base64-uuid",
  "name": "Get Image Base64"
};

const postVisionNode = {
  "parameters": {
    "method": "POST",
    "url": "https://aud-qr.viaje-justo.xyz/vision/scan-qr-base64",
    "sendBody": true,
    "specifyBody": "json",
    "jsonBody": "={{ { \"base64\": $json.base64 } }}",
    "options": {}
  },
  "type": "n8n-nodes-base.httpRequest",
  "typeVersion": 4.3,
  "position": [8080, 7600],
  "id": "image-post-vision-uuid",
  "name": "Extraer Datos QR"
};

const formatImageTextNode = {
  "parameters": {
    "assignments": {
      "assignments": [
        {
          "id": "format-img-txt-1",
          "name": "text",
          "value": "={{ $('Webhook').first().json.body?.data?.message?.imageMessage?.caption || '' }} " + 
                   "\\n [RESULTADO ESCANEO BARRAS: " + 
                   "{{ $json.results && $json.results.length > 0 ? $json.results[0].data : 'Ningún código puro' }} " + 
                   "] \\n [TEXTO EN LA FOTO (OCR): {{ $json.ocrText || 'Sin texto' }} ]",
          "type": "string"
        },
        {
          "id": "format-img-txt-2",
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
  "position": [8272, 7600],
  "id": "image-format-txt-uuid",
  "name": "Formatear Texto Imagen"
};

// Agregar nodos
flow.nodes.push(ifImageNode, getImageBase64Node, postVisionNode, formatImageTextNode);

// Rekablear "If Audio" false branch -> "If Image"
// Previously, If Audio [1] (false branch) went to Extraer Datos Texto
flow.connections["If Audio"] = flow.connections["If Audio"] || {};
flow.connections["If Audio"]["main"] = flow.connections["If Audio"]["main"] || [[], []];

// Remove the connection to Extraer Datos Texto from If Audio False
flow.connections["If Audio"]["main"][1] = flow.connections["If Audio"]["main"][1].filter(c => c.node !== "Extraer Datos Texto");

// Add If Image to If Audio False
flow.connections["If Audio"]["main"][1].push({ "node": "If Image", "type": "main", "index": 0 });

// Configurar If Image connections
flow.connections["If Image"] = {
  "main": [
    [ { "node": "Get Image Base64", "type": "main", "index": 0 } ], // True: is image
    [ { "node": "Extraer Datos Texto", "type": "main", "index": 0 } ] // False: is text (original branch)
  ]
};

// Get Image Base64 -> Extraer Datos QR
flow.connections["Get Image Base64"] = { "main": [ [ { "node": "Extraer Datos QR", "type": "main", "index": 0 } ] ] };

// Extraer Datos QR -> Formatear Texto Imagen
flow.connections["Extraer Datos QR"] = { "main": [ [ { "node": "Formatear Texto Imagen", "type": "main", "index": 0 } ] ] };

// Formatear Texto Imagen -> DO Agent Chat
flow.connections["Formatear Texto Imagen"] = { "main": [ [ { "node": "DO Agent Chat", "type": "main", "index": 0 } ] ] };

// Guardar
fs.writeFileSync(path, JSON.stringify(flow, null, 2));
fs.copyFileSync(path, 'flujo_whatsapp_n8n_v3.json');
console.log("N8N Flow actualizado con soporte para Imágenes/QR");
