# 🌎 ViajeJusto — Plataforma de Gestión de Viajes con IA

<p align="center">
  <strong>Organiza viajes individuales y grupales con un asistente IA por WhatsApp</strong>
</p>

---

## 📋 Tabla de Contenidos

- [Descripción General](#descripción-general)
- [Arquitectura del Sistema](#arquitectura-del-sistema)
- [Stack Tecnológico](#stack-tecnológico)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [Configuración e Instalación](#configuración-e-instalación)
- [Variables de Entorno](#variables-de-entorno)
- [Base de Datos (Supabase)](#base-de-datos-supabase)
- [Servidor OTP](#servidor-otp)
- [Bot IA WhatsApp (n8n)](#bot-ia-whatsapp-n8n)
- [Evolution API (WhatsApp)](#evolution-api-whatsapp)
- [Cloudflare](#cloudflare)
- [Despliegue (Easypanel + Docker)](#despliegue-easypanel--docker)
- [Nginx](#nginx)
- [Flujo de Autenticación](#flujo-de-autenticación)
- [Panel de Administración](#panel-de-administración)
- [Endpoints del API](#endpoints-del-api)
- [Troubleshooting](#troubleshooting)

---

## Descripción General

**ViajeJusto** es una plataforma web + móvil para organizar y gestionar viajes individuales y grupales. Incluye:

- 🔐 **Registro con doble verificación** (WhatsApp OTP + Email)
- 🤖 **Asistente IA por WhatsApp** (Travel-Just) que crea viajes, busca hoteles y gestiona presupuestos
- 👥 **Gestión de viajes grupales** con invitaciones por link, control de presupuesto y gastos compartidos
- 🛡️ **Panel de administración** con estadísticas en tiempo real, gestión de usuarios y monitoreo del sistema
- 💬 **Integración con WhatsApp** vía Evolution API para envío de OTPs y comunicación del bot

---

## Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────────────┐
│                         INTERNET                                 │
│                                                                   │
│  Usuario ──► viaje-justo.xyz ──► Cloudflare ──► Traefik (443)   │
│                                                                   │
├─────────────────────────────────────────────────────────────────┤
│                        VPS (DigitalOcean)                        │
│                                                                   │
│  ┌─ Docker ──────────────────────────────────────────────────┐  │
│  │                                                            │  │
│  │  ┌─ Traefik ─────┐    ┌─ otp-server:3001 ──────────────┐│  │
│  │  │  SSL (Let's   │───►│  Express.js                     ││  │
│  │  │  Encrypt)     │    │  - Sirve frontend (dist/)       ││  │
│  │  │  Routing      │    │  - Endpoints OTP                ││  │
│  │  └───────────────┘    │  - Admin API                    ││  │
│  │                       └─────────────────────────────────┘│  │
│  │  ┌─ Evolution API ──┐  ┌─ Easypanel ─────────────────┐ │  │
│  │  │  WhatsApp Bridge  │  │  Panel de gestión Docker    │ │  │
│  │  │  Puerto 8080      │  │  Puerto 3000                │ │  │
│  │  └───────────────────┘  └─────────────────────────────┘ │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌─ PM2 (fuera de Docker) ───────────────────────────────────┐  │
│  │  viajejusto-web  → Vite dev server  (puerto 5173)         │  │
│  │  otp-backend     → server.js clone  (puerto 3002)         │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌─ n8n ─────────────────────────────────────────────────────┐  │
│  │  Webhook ← Evolution API                                  │  │
│  │  AI Agent (Groq/Llama 3.3) + Tools (Supabase, DO Agent)  │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                   │
├─────────────────────────────────────────────────────────────────┤
│                     SERVICIOS EXTERNOS                           │
│                                                                   │
│  Supabase (supabase.viaje-justo.xyz)  → PostgreSQL + Auth + RLS │
│  Groq API                             → LLM (Llama 3.3 70B)    │
│  Resend API                           → Envío de correos       │
│  DigitalOcean AI Agent                → Recomendaciones turismo │
│  Cloudflare                           → DNS + CDN + Protección │
└─────────────────────────────────────────────────────────────────┘
```

---

## Stack Tecnológico

| Componente | Tecnología | Versión |
|---|---|---|
| Frontend | Vue 3 + TypeScript + Vite | 3.5+ |
| Backend / API | Node.js + Express | 20+ |
| Base de Datos | Supabase (PostgreSQL) | Self-hosted |
| Auth | Supabase Auth + OTP personalizado | — |
| WhatsApp | Evolution API | v2.3.7 |
| IA / LLM | Groq (Llama 3.3 70B Versatile) | — |
| Orquestación IA | n8n (LangChain Agent) | — |
| Correo | Resend API | — |
| Proxy reverso | Traefik + Nginx | 3.6.7 |
| Contenedores | Docker + Easypanel | — |
| DNS/CDN | Cloudflare | — |
| Process Manager | PM2 | — |

---

## Estructura del Proyecto

```
N8N/
├── src/                          # Frontend Vue.js
│   ├── views/
│   │   ├── Login.vue             # Pantalla de login (email/teléfono + OTP)
│   │   ├── Signup.vue            # Registro con verificación WhatsApp + Email
│   │   ├── DashboardUser.vue     # Panel del usuario (mis viajes, crear viaje)
│   │   ├── DashboardAdmin.vue    # Panel admin (stats, usuarios, viajes, sistema)
│   │   ├── TripDetail.vue        # Detalle de viaje (participantes, gastos, tablero)
│   │   └── JoinTrip.vue          # Unirse a viaje grupal por link
│   ├── stores/
│   │   └── auth.ts               # Store Pinia para sesión y rol
│   ├── router/
│   │   └── index.ts              # Rutas con guards de autenticación
│   ├── supabase.ts               # Configuración del cliente Supabase
│   ├── App.vue                   # Componente raíz
│   ├── main.ts                   # Entry point
│   └── style.css                 # Estilos globales Material Design 3
│
├── otp-package/                  # Servidor OTP (Express)
│   ├── server.js                 # Lógica de OTP, admin API, bot endpoints
│   ├── Dockerfile                # Docker image del OTP server
│   ├── docker-compose.yml        # Orquestación local del OTP server
│   └── package.json              # Dependencias del servidor
│
├── public/                       # Archivos estáticos
│   ├── favicon.svg
│   └── icons.svg
│
├── supabase_schema.sql           # Schema SQL maestro (fuente de verdad)
├── flujo_whatsapp_n8n_v3.json    # Flujo n8n del bot IA (importar en n8n)
├── nginx.conf                    # Configuración Nginx para proxy reverso
├── docker-compose.yml            # Docker Compose global (Evolution API)
│
├── .env                          # Variables de entorno (NO subir a git)
├── .env.example                  # Template de variables de entorno
├── .gitignore                    # Archivos excluidos de git
├── package.json                  # Dependencias del frontend
├── vite.config.ts                # Configuración de Vite
├── tsconfig.json                 # Configuración TypeScript
└── README.md                     # Esta documentación
```

---

## Configuración e Instalación

### Requisitos Previos

- Node.js 20+
- Docker y Docker Compose
- Cuenta de Supabase (self-hosted o cloud)
- Cuenta de Cloudflare
- Instancia de Evolution API
- Instancia de n8n
- Cuenta de Groq (API key)
- Cuenta de Resend (API key)

### 1. Clonar el repositorio

```bash
git clone https://github.com/TU_USUARIO/viaje-justo.git
cd viaje-justo
```

### 2. Instalar dependencias

```bash
# Frontend
npm install

# Backend OTP
cd otp-package && npm install && cd ..
```

### 3. Configurar variables de entorno

```bash
cp .env.example .env
# Editar .env con tus valores reales
```

### 4. Configurar la base de datos

Ejecuta `supabase_schema.sql` en tu instancia de Supabase a través del SQL Editor.

### 5. Iniciar en desarrollo

```bash
# Frontend (Vite dev server)
npm run dev -- --host 0.0.0.0 --port 5173

# Backend OTP (en otra terminal)
cd otp-package && node server.js
```

### 6. Build para producción

```bash
npm run build
# Los archivos se generan en dist/
```

---

## Variables de Entorno

### Frontend (`.env`)

| Variable | Descripción | Ejemplo |
|---|---|---|
| `VITE_SUPABASE_URL` | URL de tu instancia Supabase | `https://supabase.viaje-justo.xyz` |
| `VITE_SUPABASE_ANON_KEY` | Clave anónima de Supabase | `eyJhbG...` |
| `VITE_OTP_SERVER_URL` | URL del servidor OTP | `https://otp-ws.viaje-justo.xyz` |

### Backend (`otp-package/server.js`)

> ⚠️ Actualmente hardcoded en el código. En producción, migrar a `process.env`.

| Variable | Descripción |
|---|---|
| `EVOLUTION_API_KEY` | API key de Evolution API |
| `EVOLUTION_URL` | URL del endpoint de envío de texto |
| `RESEND_API_KEY` | API key de Resend para correos |
| `SUPABASE_URL` | URL de Supabase |
| `SERVICE_KEY` | Clave `service_role` de Supabase |

---

## Base de Datos (Supabase)

### Arquitectura

Supabase se usa como:
- **PostgreSQL** — Base de datos relacional
- **Auth** — Autenticación de usuarios (signup/login via API admin)
- **RLS** — Políticas de seguridad a nivel de fila
- **Storage** — Almacenamiento de recibos/gastos (bucket `recibos`)

### Tablas Principales

#### `profiles`
Se crea automáticamente al registrar un usuario via trigger.

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | uuid (PK, FK → auth.users) | ID del usuario |
| `nombre` | text | Nombre del usuario |
| `apellido` | text | Apellido |
| `identificacion` | text | Documento de identidad |
| `telefono` | text | Número de teléfono |
| `codigo_pais` | text | Código de país (+57, +1, etc.) |
| `role` | text | Rol: `usuario`, `Individual`, `Grupal`, `conductor`, `super_admin` |

#### `viajes`
Tabla principal de viajes.

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | uuid (PK) | ID del viaje |
| `user_id` | uuid (FK → auth.users) | Creador del viaje |
| `pais` | text | País destino |
| `fecha` | date | Fecha del viaje |
| `cantidad_personas` | integer | Máximo de personas |
| `moneda_codigo` | text | Moneda (COP, USD, etc.) |
| `presupuesto` | numeric | Presupuesto total |
| `motivo_viaje` | text | Motivo (vacaciones, trabajo, etc.) |
| `alojamiento` | text | Tipo de alojamiento |
| `modo_viaje` | text | Modo (avión, carro, etc.) |

#### `participantes`
Miembros de viajes grupales.

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | uuid (PK) | ID del participante |
| `viaje_id` | uuid (FK → viajes) | Viaje al que pertenece |
| `user_id` | uuid (FK → auth.users) | Usuario |
| `nombre` | text | Nombre/apodo en el viaje |
| `aporte` | numeric | Presupuesto individual |

#### `gastos`
Registro de gastos por viaje.

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | uuid (PK) | ID del gasto |
| `viaje_id` | uuid (FK → viajes) | Viaje asociado |
| `descripcion` | text | Descripción del gasto |
| `monto` | numeric | Monto |
| `responsable` | text | Quién pagó |
| `evidencia_url` | text | URL del recibo (Supabase Storage) |

### RLS (Row Level Security)

- Los usuarios solo ven sus propios viajes y perfiles
- Los participantes ven los viajes a los que pertenecen
- `super_admin` accede a todo via endpoints del OTP server (usando `service_role` key)

### Schema SQL

El archivo `supabase_schema.sql` es la **fuente de verdad** para la base de datos. Ejecútalo en una nueva instancia para configurar:
- Tablas con sus relaciones
- Triggers para crear perfiles automáticamente
- Políticas RLS
- Permisos de Storage

---

## Servidor OTP

El archivo `otp-package/server.js` es un servidor Express que maneja:

### Autenticación
- Generación y verificación de OTP vía WhatsApp (Evolution API)
- Generación y verificación de OTP vía Email (Resend)
- Creación de cuentas en Supabase Auth (api admin)
- **Mensaje de bienvenida** automático por WhatsApp al completar registro

### Bot de WhatsApp
- Endpoint `/bot/checkUser` que identifica usuarios por su número de teléfono
- Devuelve: rol (ADMINISTRADOR/INVITADO), datos del viaje, ID de participante

### Panel de Administración
Endpoints protegidos con verificación JWT + rol `super_admin`:

| Endpoint | Método | Descripción |
|---|---|---|
| `/admin/stats` | GET | Estadísticas globales |
| `/admin/users` | GET | Lista de usuarios (auth + profiles) |
| `/admin/update-role` | POST | Cambiar rol de usuario |
| `/admin/trips` | GET | Lista de viajes enriquecida |
| `/admin/system-health` | GET | Estado de servicios |

### Puertos

| Contexto | Puerto | Uso |
|---|---|---|
| Docker (Traefik) | 3001 | Sirve frontend + API para web |
| PM2 (local) | 3002 | API para n8n bot (`/bot/checkUser`) |

---

## Bot IA WhatsApp (n8n)

### Flujo

El archivo `flujo_whatsapp_n8n_v3.json` contiene el flujo n8n completo. Importar en n8n vía:
`Settings → Import from File → flujo_whatsapp_n8n_v3.json`

📥 **[Descargar Archivo JSON del Flujo Directamente](https://viaje-justo.xyz/viajejusto-n8n-flow.json)**  
*(Instrucción: Haz click para descargar el archivo JSON, luego desde n8n ve a "Workflows" → "Import from File" y selecciona este archivo para configurar la IA al instante).*

### Nodos del Flujo

```
Webhook (Evolution) → Evitar Autorespuesta → Check DB Pistas → If Registrado
                                                                     │
                                            ┌────────────────────────┤
                                            ▼                        ▼
                                     AI Agent             Mensaje de Rechazo
                                   (Travel-Just)        ("Regístrate en...")
                                        │
                    ┌───────────────────┼───────────────────┐
                    ▼                   ▼                   ▼
            Create viaje       Actualizar Invitado   Agente Turístico
           (Supabase)          (Supabase)            (DigitalOcean)
                    │                   │                   │
                    └───────────────────┼───────────────────┘
                                        ▼
                              HTTP Request Evolution API
                              (Envía respuesta por WhatsApp)
```

### Modelo de IA

- **Proveedor**: Groq
- **Modelo**: Llama 3.3 70B Versatile
- **Memoria**: Buffer de ventana (últimos 10 mensajes por sesión)
- **Herramientas**:
  - Crear viaje en Supabase
  - Actualizar datos de invitado
  - Consultar agente turístico de DigitalOcean

### Personalidad del Bot (Travel-Just)

- Tono cálido, conversacional y natural
- Interpreta lenguaje informal, jerga y errores ortográficos
- Guía paso a paso para crear viajes
- Deduce datos faltantes y los solicita naturalmente
- Manejo de multimedia (responde si envían fotos/audios)

---

## Evolution API (WhatsApp)

### Configuración

Evolution API es el puente entre WhatsApp y el sistema. Se despliega como contenedor Docker.

| Campo | Valor |
|---|---|
| Nombre de instancia | `ViajeJusto` |
| URL base | `https://ws-manager.viaje-justo.xyz` |
| Puerto interno | 8080 |
| Base de datos | PostgreSQL (contenedor separado) |
| Cache | Redis (contenedor separado) |

### Webhook

El webhook de Evolution API debe apuntar al endpoint del flujo n8n:

```
URL: https://TU_N8N_URL/webhook/evolution-chat/messages-upsert
Eventos: messages.upsert
```

### Docker Compose

```yaml
# Ver docker-compose.yml en la raíz del proyecto
# Incluye: evolution-api, postgres, redis
```

---

## Cloudflare

### DNS Records

Configurar los siguientes registros DNS en Cloudflare apuntando a la IP del VPS:

| Tipo | Nombre | Contenido | Proxy |
|---|---|---|---|
| A | `viaje-justo.xyz` | `IP_DEL_VPS` | ☁️ DNS only* |
| A | `www` | `IP_DEL_VPS` | ☁️ DNS only* |
| A | `supabase` | `IP_DEL_VPS` | ☁️ DNS only |
| A | `ws-manager` | `IP_DEL_VPS` | ☁️ DNS only |
| A | `otp-ws` | `IP_DEL_VPS` | ☁️ DNS only |

> ⚠️ **Importante**: Los subdominios deben estar en modo **DNS only** (nube gris) para que Traefik pueda emitir certificados SSL con Let's Encrypt. Si se activa el proxy de Cloudflare (nube naranja), los certificados fallarán.

### SSL/TLS

- Modo: **Full (strict)** si usas Let's Encrypt en Traefik
- Modo: **Full** como mínimo
- Siempre usar HTTPS → Activar "Always Use HTTPS"

---

## Despliegue (Easypanel + Docker)

### Easypanel

Easypanel gestiona los contenedores Docker via Traefik. URL: `https://IP_VPS:3000`

### Servicios en Docker

| Servicio | Imagen | Puerto | Dominio |
|---|---|---|---|
| `otp-server` | `otp-server:latest` | 3001 | `viaje-justo.xyz` |
| `evolution-api` | `evoapicloud/evolution-api:v2.3.7` | 8080 | `ws-manager.viaje-justo.xyz` |
| `evolution-api-db` | `postgres:17` | 5432 | Interno |
| `evolution-api-redis` | `redis:7` | 6379 | Interno |
| `traefik` | `traefik:3.6.7` | 80, 443 | — |
| `easypanel` | `easypanel/easypanel` | 3000 | — |

### Reconstruir OTP Server

```bash
cd /root/N8N
npm run build                         # Build del frontend Vue
docker build -t otp-server ./otp-package  # Rebuild imagen Docker
docker restart otp-server             # Reiniciar contenedor
```

### PM2 (Procesos locales)

```bash
pm2 list                              # Ver procesos
pm2 restart viajejusto-web           # Reiniciar Vite dev server
pm2 restart otp-backend              # Reiniciar OTP API (puerto 3002)
pm2 logs otp-backend --lines 20      # Ver logs del OTP
```

---

## Nginx

El archivo `nginx.conf` configura el proxy reverso:

- `/` → Vite dev server (localhost:5173)
- `/request-otp`, `/verify-otp`, etc. → OTP server (localhost:3001)
- Incluye headers CORS necesarios

> Nota: En producción con Traefik, Nginx puede no ser necesario ya que Traefik maneja el routing via labels de Docker.

---

## Flujo de Autenticación

```
┌─────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  Ingresa     │    │ Envía OTP    │    │ Verifica     │    │ Envía OTP    │
│  datos +     │───►│ por WhatsApp │───►│ código       │───►│ por email    │
│  teléfono    │    │ (Evolution)  │    │ WhatsApp     │    │ (Resend)     │
└─────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
                                                                    │
┌─────────────┐    ┌──────────────┐    ┌──────────────┐             │
│  Dashboard   │◄──│ Login auto   │◄──│ Cuenta creada │◄────────────┘
│  del usuario │    │ con sesión   │    │ en Supabase  │  + Mensaje de
└─────────────┘    └──────────────┘    └──────────────┘  bienvenida WhatsApp
```

---

## Panel de Administración

Accesible en `/dashboard-admin` para usuarios con `role = 'super_admin'`.

### Pestañas

| Pestaña | Funcionalidad |
|---|---|
| 📊 **Resumen** | Tarjetas de estadísticas + últimos usuarios y viajes |
| 👥 **Usuarios** | Tabla completa, búsqueda, cambio de rol |
| ✈️ **Viajes** | Todos los viajes con creador, gastos y participantes |
| ⚙️ **Sistema** | Estado de Supabase, Evolution API, OTP Server |

### Crear un Super Admin

```sql
UPDATE public.profiles
SET role = 'super_admin'
WHERE id = 'UUID_DEL_USUARIO';
```

---

## Endpoints del API

### OTP / Autenticación

| Endpoint | Método | Descripción |
|---|---|---|
| `/request-otp` | POST | Envía OTP por WhatsApp |
| `/verify-otp` | POST | Verifica OTP de WhatsApp |
| `/request-email-otp` | POST | Envía OTP por email (Resend) |
| `/verify-email-otp` | POST | Verifica OTP email + crea cuenta |
| `/bot/checkUser` | POST | Identifica usuario para el bot n8n |
| `/admin-login-alert` | POST | Notifica login de admin |

### Admin (requiere JWT de super_admin)

| Endpoint | Método | Descripción |
|---|---|---|
| `/admin/stats` | GET | Estadísticas globales |
| `/admin/users` | GET | Lista de usuarios |
| `/admin/update-role` | POST | Cambiar rol de usuario |
| `/admin/trips` | GET | Lista de viajes enriquecida |
| `/admin/system-health` | GET | Estado de servicios |

---

## Troubleshooting

### El bot no responde en WhatsApp
1. Verificar que PM2 `otp-backend` esté corriendo en puerto **3002**: `pm2 list`
2. Probar endpoint: `curl -X POST http://localhost:3002/bot/checkUser -H "Content-Type: application/json" -d '{"phone":"NUMERO"}'`
3. Verificar que n8n tenga el flujo activo
4. Verificar webhook de Evolution API

### El sitio muestra error 502
1. Verificar que el contenedor Docker `otp-server` esté corriendo: `docker ps`
2. Verificar que escuche en puerto **3001**: `docker logs otp-server --tail 5`
3. Reiniciar: `docker restart otp-server`

### Los cambios en el frontend no se ven
1. Reconstruir: `npm run build`
2. Copiar al contenedor: `docker cp /root/N8N/dist/. otp-server:/app/dist/`
3. Reiniciar contenedor: `docker restart otp-server`

### Error de SSL / certificados
1. Asegurar que los subdominios en Cloudflare estén en modo **DNS only** (nube gris)
2. Verificar que Traefik pueda emitir certificados: `docker logs traefik.1.xxx --tail 20`

---

## Licencia

Proyecto privado — © ViajeJusto 2026 — Todos los derechos reservados.
