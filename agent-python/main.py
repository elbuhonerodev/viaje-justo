import os
import tempfile
import base64
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pyzbar.pyzbar import decode
import cv2
import numpy as np

app = FastAPI(title="ViajeJusto AI Agent API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Carga diferida de Whisper (evita bloquear el arranque) ──────────────────
_whisper_model = None

def get_whisper_model():
    global _whisper_model
    if _whisper_model is None:
        from faster_whisper import WhisperModel
        # Modelo "base" (~145 MB), mucho mejor precisión en español y números
        _whisper_model = WhisperModel("base", device="cpu", compute_type="int8")
    return _whisper_model


# ── Health check ────────────────────────────────────────────────────────────
@app.get("/health")
def health_check():
    return {"status": "ok", "message": "ViajeJusto AI Agent v2 is running"}


# ── Escaneo de QR y Códigos de Barras (imagen file upload) ──────────────────
@app.post("/vision/scan-qr")
async def scan_qr(file: UploadFile = File(...)):
    """Escanea QR o código de barras desde una imagen subida como FormData."""
    try:
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if img is None:
            raise HTTPException(status_code=400, detail="Imagen inválida o formato no soportado.")

        decoded_objects = decode(img)
        results = [{"type": obj.type, "data": obj.data.decode("utf-8")} for obj in decoded_objects]

        if not results:
            return {"status": "success", "results": [], "message": "No se detectó ningún código."}

        return {"status": "success", "results": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class ScanBase64Request(BaseModel):
    base64: str

@app.post("/vision/scan-qr-base64")
async def scan_qr_base64(body: ScanBase64Request):
    """Escanea QR o código de barras desde una imagen en base64. Usado por WhatsApp N8N."""
    try:
        b64_data = body.base64
        if "," in b64_data:
            b64_data = b64_data.split(",", 1)[1]

        image_bytes = base64.b64decode(b64_data)
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if img is None:
            raise HTTPException(status_code=400, detail="Imagen inválida o formato no soportado.")

        decoded_objects = decode(img)
        results = [{"type": obj.type, "data": obj.data.decode("utf-8")} for obj in decoded_objects]

        if not results:
            return {"status": "success", "results": [], "message": "No se detectó ningún código."}

        return {"status": "success", "results": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Transcripción de Audio (archivo subido via FormData) ─────────────────────
@app.post("/audio/transcribe")
async def transcribe_audio_file(file: UploadFile = File(...)):
    """Transcribe una nota de voz (ogg/mp3/wav) subida directamente."""
    try:
        contents = await file.read()
        suffix = "." + (file.filename.split(".")[-1] if file.filename and "." in file.filename else "ogg")

        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(contents)
            tmp_path = tmp.name

        model = get_whisper_model()
        segments, info = model.transcribe(tmp_path, language=None, task="transcribe")
        text = " ".join(seg.text.strip() for seg in segments).strip()
        os.unlink(tmp_path)

        return {
            "status": "success",
            "text": text or "(sin contenido detectado)",
            "language": info.language
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Transcripción de Audio (desde base64 — usado por N8N) ───────────────────
class AudioBase64Request(BaseModel):
    base64: str
    mimetype: str = "audio/ogg"

@app.post("/audio/transcribe-base64")
async def transcribe_base64(body: AudioBase64Request):
    """Transcribe audio recibido como base64. Usado por el flujo N8N de WhatsApp."""
    try:
        # Limpiar el prefijo data URI si viene incluido
        b64_data = body.base64
        if "," in b64_data:
            b64_data = b64_data.split(",", 1)[1]

        audio_bytes = base64.b64decode(b64_data)
        ext = ".ogg" if "ogg" in body.mimetype else ".mp3"

        with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
            tmp.write(audio_bytes)
            tmp_path = tmp.name

        model = get_whisper_model()
        segments, info = model.transcribe(tmp_path, language=None, task="transcribe")
        text = " ".join(seg.text.strip() for seg in segments).strip()
        os.unlink(tmp_path)

        return {
            "status": "success",
            "text": text or "(audio sin contenido reconocible)",
            "language": info.language
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
