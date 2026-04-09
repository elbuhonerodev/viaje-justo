FROM python:3.10-slim

# Evitar prompts interactivos durante apt-get
ENV DEBIAN_FRONTEND=noninteractive

# Instalar dependencias del sistema operativo
RUN apt-get update && apt-get install -y \
    libzbar0 \
    ffmpeg \
    tesseract-ocr \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Establecer directorio de trabajo
WORKDIR /app

# Instalar paquetes Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# local whisper downloading sequence removed (migrated to Groq)

# Copiar código fuente
COPY . .

# Exponer el puerto de Uvicorn
EXPOSE 8000

# Iniciar servidor
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
