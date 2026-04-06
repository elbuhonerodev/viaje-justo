import express from 'express';
import cors from 'cors';

const app = express();
app.use(express.json());
// Habilitar CORS para que la app Vue consuma la API directamente desde el navegador de los usuarios
app.use(cors());

// Almacén temporal de códigos OTP en memoria { "teléfono": "código" }
const otps = new Map();

// EVOLUTION API CONF
const EVOLUTION_URL = "https://ws-manager.viaje-justo.xyz/message/sendText/ViajeJusto";
const EVOLUTION_API_KEY = "429683C4C977415CAAFCCE10F7D57E11";

// RUTA PARA ESTABLECER UN CÓDIGO (Pedido desde Vue Signup)
app.post('/request-otp', async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: "No phone specified" });

    // Generar código aleatorio de 6 dígitos
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Guardarlo en memoria para este teléfono (Sobreescribe si ya había pedido)
    otps.set(phone, code);

    // Borrar de la memoria en 15 minutos (por seguridad)
    setTimeout(() => {
      if (otps.get(phone) === code) otps.delete(phone);
    }, 15 * 60 * 1000);

    // Enviarlo a Evolution API
    const response = await fetch(EVOLUTION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": EVOLUTION_API_KEY,
      },
      body: JSON.stringify({
        number: phone, 
        text: `✈️ *Viaje Justo*\n\nTu código de seguridad único es: *${code}*\nIngrésalo en la plataforma para continuar.`,
      })
    });

    if (response.ok) {
      console.log(`[WA GENERATDO NUEVO OTP] a ${phone}`);
      return res.status(200).json({ status: "success" });
    } else {
      console.error("Fallo API Whatsapp:", await response.text());
      return res.status(500).json({ error: "Fallo conexión WA" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// RUTA PARA VERIFICAR UN CÓDIGO (Pedido desde Vue Verificación)
app.post('/verify-otp', (req, res) => {
    const { phone, code } = req.body;
    if (!phone || !code) return res.status(400).json({ error: "Información incompleta" });

    const savedCode = otps.get(phone);

    if (savedCode && savedCode === code) {
        // Exito
        otps.delete(phone); // Burn it!
        console.log(`[OTP VERIFICADO] de ${phone}`);
        return res.status(200).json({ status: "success", verified: true });
    } else {
        // Fallo
        console.warn(`[OTP FALLIDO] de ${phone} esperabamos ${savedCode} pero dio ${code}`);
        return res.status(401).json({ error: "Código inválido o expirado" });
    }
});

app.listen(3001, () => {
  console.log("Servidor Independiente SMS WhatsApp corriendo (Puerto 3001)");
});
