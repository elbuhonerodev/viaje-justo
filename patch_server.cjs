const fs = require('fs');
const path = './otp-package/server.js';
let content = fs.readFileSync(path, 'utf8');

const additionalCode = `
// AÑADIDO: Puente para DigitalOcean Agent
const agentMemory = new Map();
const DO_AGENT_URL = "https://k2toijdhaywnx3k3uzzvxchw.agents.do-ai.run/api/v1/chat/completions";
const DO_AGENT_KEY = "PGL8OHYfQie_cftLbbp5CfyIo5dhQYl4";

app.post('/bot/chat', async (req, res) => {
    try {
        const { phone, text, contextString } = req.body;
        if (!phone || !text) return res.status(400).json({ error: "Faltan datos" });

        // Recuperar memoria
        if (!agentMemory.has(phone)) {
            agentMemory.set(phone, []);
        }
        let history = agentMemory.get(phone);

        // Limpiar mensajes antiguos (mantener ultimos 10)
        if (history.length > 20) {
            history = history.slice(history.length - 20);
        }

        // Agregar mensaje actual con contexto
        const finalContent = contextString ? \`Contexto del Sistema:\\n\${contextString}\\n\\nMensaje del usuario: \${text}\` : text;
        history.push({ role: "user", content: finalContent });

        // Llamar a DO
        const response = await fetch(DO_AGENT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': \`Bearer \${DO_AGENT_KEY}\`
            },
            body: JSON.stringify({ messages: history })
        });

        if (!response.ok) throw new Error("Fallo DO Agent: " + await response.text());
        const data = await response.json();
        
        let reply = data.choices[0].message.content || "";
        // Limpiar el tag de pensamiento de DeepSeek R1
        reply = reply.replace(/<think>[\\s\\S]*?<\\/think>\\n?/g, '').trim();

        // Guardar la respuesta pura en el historial
        history.push({ role: "assistant", content: reply });
        agentMemory.set(phone, history);

        res.status(200).json({ output: reply });
    } catch (e) {
        console.error("Chat error", e);
        res.status(500).json({ output: "¡Ay! Tuve un problema de red consultando tu información. ¿Me lo repites en un ratito? 🙏" });
    }
});
`;

if (!content.includes('/bot/chat')) {
    content = content.replace('// Catch-all: enviar index.html', additionalCode + '\n// Catch-all: enviar index.html');
    fs.writeFileSync(path, content);
    console.log("Patched server.js with /bot/chat endpoint");
} else {
    console.log("Endpoint already exists");
}
