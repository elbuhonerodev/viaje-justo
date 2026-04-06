// Setup API type definitions
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

// Este webhook será llamado por Supabase Auth cada vez que alguien solicite un OTP SMS
// La payload entrante de supabase para custom SMS providers es:
// { "phone": "+5712345678", "code": "123456", "channel": "sms" }

Deno.serve(async (req) => {
  try {
    const body = await req.json()
    const { phone, code } = body

    if (!phone || !code) {
      return new Response("Missing phone or code", { status: 400 })
    }

    // --- CONFIGURACIÓN DE EVOLUTION API ---
    // Cambia "InstanciaViajeJusto" por el nombre de la instancia que crees en tu Evolution API.
    const EVOLUTION_URL = "https://web-viajejusto.sprint-vpn.shop/message/sendText/InstanciaViajeJusto"
    
    // Si tienes una contraseña protectora en Evolution API, colócala aquí, si no, déjala vacía.
    const EVOLUTION_API_KEY = "429683C4C977415CAAFCCE10F7D57E11" 

    const response = await fetch(EVOLUTION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": EVOLUTION_API_KEY,
      },
      body: JSON.stringify({
        number: phone,      // Número completo sin espacios ni + al inicio, Evolution API suele preferirlo así, o puedes dejarlo igual dependiendo de tu config.
        text: `✈️ *Viaje Justo*\n\nTu código de verificación seguro es: *${code}*\nTodo listo para tu viaje.`,
      })
    });

    if (response.ok) {
      return new Response(JSON.stringify({ status: "success", message: "WhatsApp enviado exitosamente." }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      })
    } else {
      const errorText = await response.text();
      console.error("Fallo enviando WA:", errorText);
      return new Response(JSON.stringify({ error: "Fallo envío de WhatsApp al proveedor externo." }), {
        status: 500,
      })
    }
  } catch (error) {
    console.error("Función Edge Error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
})
