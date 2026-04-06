-- ==============================================================================
-- SCHEMA MAESTRO — ViajeJusto
-- Versión: Producción Activa (Abril 2026)
-- Base de datos: Supabase PostgreSQL (supabase.viaje-justo.xyz)
--
-- INSTRUCCIONES DE USO:
--   Ejecutar este archivo completo al inicializar una nueva instancia de Supabase.
--   Es idempotente: incluye DROP IF EXISTS para poder re-ejecutarlo sin errores.
-- ==============================================================================


-- ==========================================
-- LIMPIEZA INICIAL (Seguro para re-ejecución)
-- ==========================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP TABLE IF EXISTS public.viajes;
DROP TABLE IF EXISTS public.profiles;


-- ==========================================
-- TABLA: profiles
-- Descripción: Datos extendidos de cada usuario sincronizados desde auth.users.
--   - id: mismo UUID que auth.users
--   - role: 'usuario' | 'conductor' | 'super_admin' (default 'usuario')
--   - El resto de columnas se llenan desde los metadatos del registro.
-- ==========================================
CREATE TABLE public.profiles (
  id             UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
  role           TEXT NOT NULL DEFAULT 'usuario',
  nombre         TEXT,
  apellido       TEXT,
  identificacion TEXT,
  telefono       TEXT,
  codigo_pais    TEXT,
  updated_at     TIMESTAMP WITH TIME ZONE,
  created_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Cualquiera puede ver los perfiles (necesario para que el store lea el rol)
CREATE POLICY "Public profiles viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

-- Solo el propio usuario puede actualizar su perfil
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);


-- ==========================================
-- FUNCIÓN + TRIGGER: auto-crea perfil al registrarse un usuario
-- Captura los metadatos enviados desde el frontend (nombre, apellido, etc.)
-- COALESCE asegura que si no se envía role, se asigna 'usuario' por defecto.
-- ==========================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, role, nombre, apellido, identificacion, codigo_pais, telefono)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'role', 'usuario'),
    new.raw_user_meta_data->>'nombre',
    new.raw_user_meta_data->>'apellido',
    new.raw_user_meta_data->>'identificacion',
    new.raw_user_meta_data->>'codigo_pais',
    new.raw_user_meta_data->>'telefono'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- ==========================================
-- TABLA: viajes
-- Descripción: Registros de viaje creados por cada usuario.
--   - moneda_codigo acepta: COP, USD, EUR
--   - RLS garantiza aislamiento total entre usuarios
-- ==========================================
CREATE TABLE public.viajes (
  id                UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id           UUID    REFERENCES auth.users NOT NULL,
  pais              TEXT    NOT NULL,
  ciudad            TEXT    ,
  fecha             DATE    NOT NULL,
  cantidad_personas INTEGER NOT NULL CHECK (cantidad_personas > 0),
  moneda_codigo     TEXT    NOT NULL CHECK (moneda_codigo IN ('COP', 'USD', 'EUR')),
  created_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.viajes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own trips"
  ON public.viajes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own trips"
  ON public.viajes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own trips"
  ON public.viajes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own trips"
  ON public.viajes FOR DELETE
  USING (auth.uid() = user_id);


-- ==============================================================================
-- FIN DEL SCHEMA
-- Para crear un super_admin manualmente, ejecuta en el SQL Editor de Supabase:
--   UPDATE public.profiles SET role = 'super_admin' WHERE id = '<uuid-del-usuario>';
-- ==============================================================================
