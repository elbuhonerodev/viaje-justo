-- 1. Agregar las nuevas columnas a la tabla profiles (si no existen)
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='nombre') THEN
    ALTER TABLE public.profiles ADD COLUMN nombre TEXT;
    ALTER TABLE public.profiles ADD COLUMN apellido TEXT;
    ALTER TABLE public.profiles ADD COLUMN identificacion TEXT;
    ALTER TABLE public.profiles ADD COLUMN telefono TEXT;
    ALTER TABLE public.profiles ADD COLUMN codigo_pais TEXT;
  END IF;
END $$;

-- 2. Recrear o actualizar la función del Trigger para que capture los metadatos desde el frontend
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, role, nombre, apellido, identificacion, codigo_pais, telefono)
  VALUES (
    new.id, 
    'usuario', 
    new.raw_user_meta_data->>'nombre',
    new.raw_user_meta_data->>'apellido',
    new.raw_user_meta_data->>'identificacion',
    new.raw_user_meta_data->>'codigo_pais',
    new.raw_user_meta_data->>'telefono'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Nota: El trigger original 'on_auth_user_created' sigue funcionando igual y llamará a esta versión actualizada de la función automáticamente.
