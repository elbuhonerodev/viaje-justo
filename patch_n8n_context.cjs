const fs = require('fs');
const path = '/root/N8N/public/viajejusto-n8n-flow.json';
let flow = JSON.parse(fs.readFileSync(path, 'utf8'));

let modified = false;
for (let n of flow.nodes) {
  if (n.name === 'DO Agent Chat') {
    n.parameters.jsonBody = "={{ {\n  \"phone\": $json.remoteJid,\n  \"text\": $json.text,\n  \"contextString\": \"Tipo de Registro: \" + ($('If Registrado').first().json.role === 'INVITADO' ? 'Se unió por link de grupo' : 'Creó el viaje directamente') + \"\\n\" + ($('If Registrado').first().json.role === 'INVITADO' ? 'Apodo: ' : 'Nombre registrado: ') + $('If Registrado').first().json.nombre + \"\\nRol: \" + $('If Registrado').first().json.role + \"\\nViaje ID: \" + ($('If Registrado').first().json.viaje_id || $('If Registrado').first().json.participante_id || '')\n} }}";
    modified = true;
  }
}

if (modified) {
  fs.writeFileSync(path, JSON.stringify(flow, null, 2));
  console.log("Patched DO Agent Chat in public JSON");
} else {
  console.log("DO Agent Chat node not found");
}
