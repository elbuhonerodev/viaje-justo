FROM node:20-alpine
WORKDIR /app/otp-package

# Instalar dependencias del servidor
COPY otp-package/package*.json ./
RUN npm install

# Copiar el código del servidor OTP
COPY otp-package/ ./

# Copiar el build de producción de Vue (dist/) al padre
COPY dist/ ../dist/

EXPOSE 3001
CMD ["npm", "start"]
