const fs = require('fs');

const original = JSON.parse(fs.readFileSync('flujo_whatsapp_n8n_corregido.json'));

const newNodes = [
    {
      "parameters": {
        "method": "POST",
        "url": "http://localhost:3001/bot/checkUser",
        "sendBody": true,
        "specifyBody": "json",
        "jsonBody": "={{ {\n  \"phone\": $('Webhook').first().json.body.data.key.remoteJid.replace('@s.whatsapp.net', '')\n} }}"
      },
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.3,
      "position": [ 5900, 4500 ],
      "id": "node-check-user",
      "name": "Check DB Pistas"
    },
    {
      "parameters": {
        "conditions": {
          "options": {
            "caseSensitive": true,
            "leftValue": "",
            "typeValidation": "loose",
            "version": 3
          },
          "conditions": [
            {
              "id": "c-reg",
              "leftValue": "={{ $json.registered }}",
              "rightValue": "true",
              "operator": {
                "type": "boolean",
                "operation": "true",
                "singleValue": true
              }
            }
          ],
          "combinator": "and"
        }
      },
      "type": "n8n-nodes-base.if",
      "typeVersion": 2.3,
      "position": [ 6050, 4500 ],
      "id": "node-if-reg",
      "name": "If Registrado"
    },
    {
      "parameters": {
        "method": "POST",
        "url": "https://ws-manager.viaje-justo.xyz/message/sendText/ViajeJusto",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "apikey",
              "value": "429683C4C977415CAAFCCE10F7D57E11"
            }
          ]
        },
        "sendBody": true,
        "specifyBody": "json",
        "jsonBody": "={{ {\n  \"number\": $('Webhook').first().json.body.data.key.remoteJid.replace('@s.whatsapp.net', ''),\n  \"text\": \"ups!! aun no te unes a nosotros en este viaje, regístrate en el siguiente link https://viaje-justo.xyz y seré tu asiste personal individual o grupal\"\n} }}"
      },
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.3,
      "position": [ 6200, 4300 ],
      "id": "node-rej",
      "name": "Mensaje Rechazo"
    },
    {
      "parameters": {
        "descriptionType": "manual",
        "toolDescription": "Úsala cuando un INVITADO quiera editar su nombre/apodo o actualizar su propio presupuesto/aporte. Necesitas el ID: {{ $('If Registrado').first().json.participante_id }}",
        "operation": "update",
        "tableId": "participantes",
        "matchColumns": "id",
        "fieldsUi": {
          "fieldValues": [
            {
              "fieldId": "id",
              "fieldValue": "={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('match_id', $('If Registrado').first().json.participante_id, 'string') }}"
            },
            {
              "fieldId": "nombre",
              "fieldValue": "={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('fieldValues0_Field_Value', ``, 'string') }}"
            },
            {
              "fieldId": "aporte",
              "fieldValue": "={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('fieldValues1_Field_Value', ``, 'number') }}"
            }
          ]
        }
      },
      "type": "n8n-nodes-base.supabaseTool",
      "typeVersion": 1,
      "position": [ 6416, 5400 ],
      "id": "node-supa-update",
      "name": "Actualizar Invitado",
      "credentials": {
        "supabaseApi": {
          "id": "tiddKkayX8RCa9C6",
          "name": "Supabase account"
        }
      }
    }
];

const newSystemMessage = `Tu nombre es Travel-Just, tu asistente personal experto de ViajeJusto.

Contexto Actual del Usuario en Base de Datos:
- Nombre / Apodo: {{ $('If Registrado').first().json.nombre || 'Desconocido' }}
- ROL: {{ $('If Registrado').first().json.role || 'Desconocido' }}
- ID Viaje: {{ $('If Registrado').first().json.viaje_id }}

Reglas Críticas:
0. FALLBACK: Si envían algún tipo de mensaje que no tenga sentido, responderás literalmente: "no entiendo tu pregunte, dime en que te puedo ayudar".
1. Si el Rol es INVITADO y creaste vínculo de invitado, saluda identificándolo así. Permitirle actualizar su presupuesto o cambiar su apodo usando la herramienta "Actualizar Invitado". No le permitas borrar al jefe del viaje.
2. Si el Rol es ADMINISTRADOR, permítele alterar el viaje principal o dar órdenes mayores en Supabase.
3. Buscar Hoteles y Restaurantes: Usa obligatoriamente tu herramienta de Agente de DigitalOcean.
Tono dinámico, amigable y respetuoso.`;

// Replace AI Agent
const agentIndex = original.nodes.findIndex(n => n.name === 'AI Agent');
original.nodes[agentIndex].parameters.options.systemMessage = newSystemMessage;

original.nodes = original.nodes.concat(newNodes);

// Fix connections
original.connections["Evitar Autorespuesta"] = {
  "main": [
    [
      { "node": "Check DB Pistas", "type": "main", "index": 0 }
    ]
  ]
};

original.connections["Check DB Pistas"] = {
  "main": [
    [
      { "node": "If Registrado", "type": "main", "index": 0 }
    ]
  ]
};

original.connections["If Registrado"] = {
  "main": [
    [
      { "node": "AI Agent", "type": "main", "index": 0 }
    ],
    [
      { "node": "Mensaje Rechazo", "type": "main", "index": 0 }
    ]
  ]
};

original.connections["Actualizar Invitado"] = {
  "ai_tool": [
    [
      { "node": "AI Agent", "type": "ai_tool", "index": 0 }
    ]
  ]
};

fs.writeFileSync('flujo_whatsapp_n8n_v3.json', JSON.stringify(original, null, 2));
