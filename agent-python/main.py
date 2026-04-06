import os
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pyzbar.pyzbar import decode
import cv2
import numpy as np

app = FastAPI(title="ViajeJusto AI Agent API", version="1.0.0")

# Permitir a la web hacer llamadas frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health_check():
    return {"status": "ok", "message": "ViajeJusto AI Agent is running on DO"}

@app.post("/vision/scan-qr")
async def scan_qr(file: UploadFile = File(...)):
    """ Endpoint para escanear QRs o Códigos de barras de imágenes enviadas por FormData """
    try:
        # Leer bits de la imagen recibida
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if img is None:
            raise HTTPException(status_code=400, detail="Invalid image file")

        # Decodificar códigos de barras o QRs
        decoded_objects = decode(img)
        
        results = []
        for obj in decoded_objects:
            results.append({
                "type": obj.type,
                "data": obj.data.decode("utf-8")
            })

        if not results:
            return {"status": "success", "results": [], "message": "No QR or barcode detected"}

        return {"status": "success", "results": results}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/audio/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    """ Placeholder para la integración Whisper """
    # FIXME: Implementar whisper load o faster-whisper aquí
    return {"status": "success", "text": "Este es un texto de prueba simulando la transcripción Whisper. Listo para implementarse."}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
