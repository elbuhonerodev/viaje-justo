-- =============================================================================
-- TABLA: viajes
-- Descripción: Registros de viaje de cada usuario de ViajeJusto.
-- IMPORTANTE: Este archivo reemplaza a supabase_trips.sql que estaba incorrecto.
--             El frontend usa la tabla "viajes" con columnas en español.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.viajes (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          UUID REFERENCES auth.users NOT NULL,
  pais             TEXT NOT NULL,
  fecha            DATE NOT NULL,
  cantidad_personas INTEGER NOT NULL CHECK (cantidad_personas > 0),
  moneda_codigo    TEXT NOT NULL CHECK (moneda_codigo IN ('COP', 'USD', 'EUR')),
  created_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar Row Level Security
ALTER TABLE public.viajes ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────
-- Políticas RLS: cada usuario solo ve y modifica sus propios viajes
-- ─────────────────────────────────────────────

CREATE POLICY "Usuarios ven sus propios viajes"
  ON public.viajes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Usuarios insertan sus propios viajes"
  ON public.viajes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuarios actualizan sus propios viajes"
  ON public.viajes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Usuarios eliminan sus propios viajes"
  ON public.viajes FOR DELETE
  USING (auth.uid() = user_id);
