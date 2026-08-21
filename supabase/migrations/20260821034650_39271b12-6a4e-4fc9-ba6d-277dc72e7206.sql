CREATE TABLE public.sensor_readings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sensor_id TEXT NOT NULL DEFAULT 'SENSOR-001',
  temperatura DOUBLE PRECISION,
  umidade_ar DOUBLE PRECISION,
  umidade_solo DOUBLE PRECISION,
  inclinacao DOUBLE PRECISION,
  vibracao DOUBLE PRECISION,
  chuva DOUBLE PRECISION,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_sensor_readings_sensor_created ON public.sensor_readings (sensor_id, created_at DESC);

GRANT SELECT ON public.sensor_readings TO anon;
GRANT SELECT ON public.sensor_readings TO authenticated;
GRANT ALL ON public.sensor_readings TO service_role;

ALTER TABLE public.sensor_readings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leituras do sensor sao publicas para leitura"
  ON public.sensor_readings
  FOR SELECT
  TO anon, authenticated
  USING (true);