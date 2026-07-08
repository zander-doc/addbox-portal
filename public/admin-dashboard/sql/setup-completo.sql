-- ============================================================
-- ADDBOX LLC — SETUP COMPLETO DE BASE DE DATOS
-- Ejecutar en Supabase SQL Editor (una sola vez)
-- Fecha: 20 de mayo de 2026
-- NOTA: Usa DROP + CREATE para evitar conflictos con tablas existentes
-- ============================================================

-- ============================================================
-- 0. LIMPIAR TABLAS EXISTENTES (orden inverso por FK)
-- ============================================================
DROP TABLE IF EXISTS movimientos CASCADE;
DROP TABLE IF EXISTS auditoria CASCADE;
DROP TABLE IF EXISTS notificaciones CASCADE;
DROP TABLE IF EXISTS partidas CASCADE;
DROP TABLE IF EXISTS presupuestos CASCADE;
DROP TABLE IF EXISTS productos CASCADE;
DROP TABLE IF EXISTS obras CASCADE;
DROP TABLE IF EXISTS usuarios CASCADE;
DROP TABLE IF EXISTS instalacion CASCADE;

-- ============================================================
-- 1. TABLA: instalacion
-- ============================================================
CREATE TABLE instalacion (
  id INTEGER PRIMARY KEY DEFAULT 1,
  first_run BOOLEAN DEFAULT true,
  master_key_hash TEXT,
  updated_at TIMESTAMP DEFAULT now()
);

INSERT INTO instalacion (id, first_run, master_key_hash)
VALUES (1, true, null);

-- ============================================================
-- 2. TABLA: usuarios
-- ============================================================
CREATE TABLE usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  rol TEXT DEFAULT 'usuario',
  estado TEXT DEFAULT 'activo',
  creado_en TIMESTAMP DEFAULT now(),
  ultimo_login TIMESTAMP,
  ip_registro TEXT,
  ip_ultimo_login TEXT
);

-- ============================================================
-- 3. TABLA: productos
-- ============================================================
CREATE TABLE productos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo TEXT,
  nombre TEXT,
  descripcion TEXT,
  costo_prom NUMERIC(10,2),
  stock INTEGER DEFAULT 0,
  estado TEXT DEFAULT 'activo',
  unidad TEXT,
  existencia NUMERIC(10,2),
  ubicacion TEXT,
  categoria TEXT,
  creado_en TIMESTAMP DEFAULT now()
);

-- ============================================================
-- 4. TABLA: obras
-- ============================================================
CREATE TABLE obras (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  estado TEXT DEFAULT 'activo',
  creado_en TIMESTAMP DEFAULT now()
);

-- ============================================================
-- 5. TABLA: movimientos
-- ============================================================
CREATE TABLE movimientos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  producto_id UUID REFERENCES productos(id) ON DELETE SET NULL,
  cantidad INTEGER NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('entrada', 'salida')),
  sitio TEXT,
  creado_en TIMESTAMP DEFAULT now()
);

-- ============================================================
-- 6. TABLA: partidas
-- ============================================================
CREATE TABLE partidas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  monto NUMERIC(12,2),
  estado TEXT DEFAULT 'pendiente',
  creado_en TIMESTAMP DEFAULT now()
);

-- ============================================================
-- 7. TABLA: presupuestos
-- ============================================================
CREATE TABLE presupuestos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  cliente TEXT,
  monto NUMERIC(12,2),
  estado TEXT DEFAULT 'pendiente',
  creado_en TIMESTAMP DEFAULT now()
);

-- ============================================================
-- 8. TABLA: auditoria
-- ============================================================
CREATE TABLE auditoria (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  accion TEXT NOT NULL,
  modulo TEXT,
  descripcion TEXT,
  ip TEXT,
  fecha TIMESTAMP DEFAULT now()
);

-- ============================================================
-- 9. TABLA: notificaciones
-- ============================================================
CREATE TABLE notificaciones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo TEXT NOT NULL,
  mensaje TEXT,
  tipo TEXT DEFAULT 'info',
  leida BOOLEAN DEFAULT false,
  creado_en TIMESTAMP DEFAULT now()
);

-- ============================================================
-- 10. RLS POLICIES
-- ============================================================
ALTER TABLE instalacion ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE obras ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimientos ENABLE ROW LEVEL SECURITY;
ALTER TABLE partidas ENABLE ROW LEVEL SECURITY;
ALTER TABLE presupuestos ENABLE ROW LEVEL SECURITY;
ALTER TABLE auditoria ENABLE ROW LEVEL SECURITY;
ALTER TABLE notificaciones ENABLE ROW LEVEL SECURITY;

-- Anon (setup inicial)
CREATE POLICY "anon_read_instalacion" ON instalacion FOR SELECT TO anon USING (true);
CREATE POLICY "anon_update_instalacion" ON instalacion FOR UPDATE TO anon USING (true);
CREATE POLICY "anon_insert_usuarios" ON usuarios FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_read_usuarios" ON usuarios FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_auditoria" ON auditoria FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_read_productos" ON productos FOR SELECT TO anon USING (true);

-- Authenticated (usuarios logueados)
CREATE POLICY "auth_all_instalacion" ON instalacion FOR ALL TO authenticated USING (true);
CREATE POLICY "auth_all_usuarios" ON usuarios FOR ALL TO authenticated USING (true);
CREATE POLICY "auth_all_productos" ON productos FOR ALL TO authenticated USING (true);
CREATE POLICY "auth_all_obras" ON obras FOR ALL TO authenticated USING (true);
CREATE POLICY "auth_all_movimientos" ON movimientos FOR ALL TO authenticated USING (true);
CREATE POLICY "auth_all_partidas" ON partidas FOR ALL TO authenticated USING (true);
CREATE POLICY "auth_all_presupuestos" ON presupuestos FOR ALL TO authenticated USING (true);
CREATE POLICY "auth_all_auditoria" ON auditoria FOR ALL TO authenticated USING (true);
CREATE POLICY "auth_all_notificaciones" ON notificaciones FOR ALL TO authenticated USING (true);

-- ============================================================
-- 11. DATOS: Obras
-- ============================================================
INSERT INTO obras (nombre, descripcion) VALUES
('Obra Centro Comercial Norte', 'Construccion de local comercial'),
('Remodelacion Oficina Principal', 'Remodelacion completa piso 3'),
('Instalacion Electrica Bodega', 'Cableado industrial bodega sur');

-- ============================================================
-- 12. DATOS: Notificaciones
-- ============================================================
INSERT INTO notificaciones (titulo, mensaje, tipo) VALUES
('Sistema actualizado', 'ADDBOX PRO ha sido actualizado a la version 2.0', 'info'),
('Stock bajo', 'El producto FUSIBLE 5A tiene stock bajo (5 unidades)', 'warning'),
('Nuevo usuario', 'Se ha registrado un nuevo usuario en el sistema', 'info');

-- ============================================================
-- 13. DATOS: Productos reales (150+)
-- ============================================================
INSERT INTO productos (codigo, descripcion, costo_prom, estado) VALUES
('26.8.0', 'SILENTBLOCK 20MM', 3.50, 'activo'),
('26.9.0', 'KIT DE CORREAS', 25.00, 'activo'),
('27.0.0', 'SENSOR DE HUMEDAD', 28.00, 'activo'),
('27.1.0', 'SENSOR DE MOVIMIENTO PIR', 18.00, 'activo'),
('27.2.0', 'RELE 12V', 4.50, 'activo'),
('27.3.0', 'RELE 24V', 5.50, 'activo'),
('27.4.0', 'PLACA RELAY 4 CANALES', 12.00, 'activo'),
('27.5.0', 'MODULO WIFI ESP8266', 6.00, 'activo'),
('27.6.0', 'MODULO BLUETOOTH HC-05', 5.00, 'activo'),
('27.7.0', 'DISPLAY LCD 16X2', 7.50, 'activo'),
('27.8.0', 'DISPLAY OLED 0.96', 9.00, 'activo'),
('27.9.0', 'ARDUINO UNO', 18.00, 'activo'),
('28.0.0', 'RASPERRY PI 4 4GB', 75.00, 'activo'),
('28.1.0', 'CABLE HDMI 1.5M', 4.00, 'activo'),
('28.2.0', 'CARGADOR USB 5V 2A', 6.00, 'activo'),
('28.3.0', 'BATERIA LIPO 3.7V 2200MAH', 12.00, 'activo'),
('28.4.0', 'SOPORTE IMPRESORA 3D', 25.00, 'activo'),
('28.5.0', 'FILAMENTO PLA 1KG', 18.00, 'activo'),
('28.6.0', 'BOQUILLA 0.4MM', 3.00, 'activo'),
('28.7.0', 'CINTA KAPTON 20MM', 2.50, 'activo'),
('28.8.0', 'TERMISTOR 100K', 1.20, 'activo'),
('28.9.0', 'VENTILADOR 40X40', 2.50, 'activo'),
('29.0.0', 'SOPORTE PARED TV 32-55', 20.00, 'activo'),
('29.1.0', 'SOPORTE PARED TV 55-75', 35.00, 'activo'),
('29.2.0', 'CABLE COAXIAL 10M', 6.00, 'activo'),
('29.3.0', 'ANTENA TV EXTERIOR', 25.00, 'activo'),
('29.4.0', 'AMPLIFICADOR DE SENAL TV', 45.00, 'activo'),
('29.5.0', 'REGLETA PROTECCION 6 TOMAS', 9.00, 'activo'),
('29.6.0', 'SUPRESOR PICOS 3 TOMAS', 12.00, 'activo'),
('29.7.0', 'CARGADOR PORTATIL 10000MAH', 18.00, 'activo'),
('29.8.0', 'POWER BANK 20000MAH', 28.00, 'activo'),
('29.9.0', 'ADAPTADOR USB-C A HDMI', 9.00, 'activo'),
('30.0.0', 'CABLE ETHERNET CAT6 1M', 1.20, 'activo'),
('30.1.0', 'CABLE ETHERNET CAT6 5M', 3.50, 'activo'),
('30.2.0', 'SWITCH 8 PUERTOS', 25.00, 'activo'),
('30.3.0', 'ROUTER WIFI DUAL BAND', 45.00, 'activo'),
('30.4.0', 'ANTENA WIFI 5DBI', 6.00, 'activo'),
('30.5.0', 'DISCO DURO EXTERNO 1TB', 55.00, 'activo'),
('30.6.0', 'DISCO SSD 500GB', 65.00, 'activo'),
('30.7.0', 'MEMORIA RAM 8GB DDR4', 35.00, 'activo'),
('30.8.0', 'FUENTE PC 500W', 40.00, 'activo'),
('30.9.0', 'TECLADO MECANICO', 30.00, 'activo'),
('31.0.0', 'MOUSE INALAMBRICO', 12.00, 'activo'),
('31.1.0', 'MONITOR 24 LED', 120.00, 'activo'),
('31.2.0', 'MONITOR 27 LED', 180.00, 'activo'),
('31.3.0', 'SILLA ERGONOMICA', 150.00, 'activo'),
('31.4.0', 'MESA DE TRABAJO 120X60', 85.00, 'activo'),
('31.5.0', 'LAMPARA DE ESCRITORIO LED', 18.00, 'activo'),
('31.6.0', 'EXTENSION MULTIPLE 10M', 8.00, 'activo'),
('31.7.0', 'CABLE HDMI 3M', 6.50, 'activo'),
('31.8.0', 'ADAPTADOR VGA A HDMI', 9.50, 'activo');

INSERT INTO productos (codigo, descripcion, costo_prom, estado) VALUES
('31.9.0', 'BASE REFRIGERANTE PORTATIL', 22.00, 'activo'),
('32.0.0', 'IMPRESORA INKJET', 85.00, 'activo'),
('32.1.0', 'IMPRESORA LASER', 220.00, 'activo'),
('32.2.0', 'TONER GENERICO HP', 35.00, 'activo'),
('32.3.0', 'CARTUCHO INK BLACK', 12.00, 'activo'),
('32.4.0', 'CARTUCHO INK COLOR', 15.00, 'activo'),
('32.5.0', 'PAPEL A4 500 HOJAS', 6.50, 'activo'),
('32.6.0', 'SOBRE MANILA 100UND', 4.00, 'activo'),
('32.7.0', 'ETIQUETAS ADHESIVAS 100UND', 3.50, 'activo'),
('32.8.0', 'ROTULADOR PERMANENTE', 1.20, 'activo'),
('32.9.0', 'MARCADOR PIZARRA', 1.00, 'activo'),
('33.0.0', 'CINTA ADHESIVA TRANSPARENTE 48MM', 0.90, 'activo'),
('33.1.0', 'CINTA MASKING 24MM', 0.80, 'activo'),
('33.2.0', 'SILICONA CALIENTE 11MM', 2.50, 'activo'),
('33.3.0', 'PISTOLA SILICONA', 6.00, 'activo'),
('33.4.0', 'BROCHA 2 PARA PINTURA', 1.50, 'activo'),
('33.5.0', 'BROCHA 3 PARA PINTURA', 2.00, 'activo'),
('33.6.0', 'RODILLO 9', 3.00, 'activo'),
('33.7.0', 'BANDEJA RODILLO 9', 2.50, 'activo'),
('33.8.0', 'ESPATULA 6', 1.80, 'activo'),
('33.9.0', 'LANA DE ACERO', 0.90, 'activo'),
('34.0.0', 'ACEITE LUBRICANTE 1L', 8.00, 'activo'),
('34.1.0', 'ACEITE LUBRICANTE 5L', 35.00, 'activo'),
('34.2.0', 'GRASA SILICONA 100G', 4.50, 'activo'),
('34.3.0', 'LIMPIADOR MULTIUSO 1L', 5.00, 'activo'),
('34.4.0', 'DESENGRASANTE INDUSTRIAL 5L', 28.00, 'activo'),
('34.5.0', 'PANO MICROFIBRA', 1.20, 'activo'),
('34.6.0', 'CEPILLO LIMPIEZA', 2.50, 'activo'),
('34.7.0', 'KIT LIMPIEZA ELECTRONICA', 12.00, 'activo'),
('34.8.0', 'ALICATE PUNTA', 6.00, 'activo'),
('34.9.0', 'ALICATE CORTE', 6.50, 'activo'),
('35.0.0', 'LLAVE AJUSTABLE 10', 12.00, 'activo'),
('35.1.0', 'LLAVE FIJA 14MM', 3.50, 'activo'),
('35.2.0', 'JUEGO LLAVES ALLEN', 8.00, 'activo'),
('35.3.0', 'SOPORTE MOTOR', 45.00, 'activo'),
('35.4.0', 'CORREA V 13MM', 4.50, 'activo'),
('35.5.0', 'CORREA V 20MM', 6.00, 'activo'),
('35.6.0', 'POLEA METALICA 30MM', 9.00, 'activo'),
('35.7.0', 'ENGRANAJE 20 DIENTES', 7.50, 'activo'),
('35.8.0', 'SENSOR ULTRASONICO HC-SR04', 2.50, 'activo'),
('35.9.0', 'MODULO GSM SIM800L', 18.00, 'activo'),
('36.0.0', 'ANTENA GSM 2DBI', 3.00, 'activo'),
('36.1.0', 'CABLE COAXIAL RG6 20M', 18.00, 'activo'),
('36.2.0', 'CONECTOR F RG6', 0.50, 'activo'),
('36.3.0', 'CONECTOR BNC', 0.60, 'activo'),
('36.4.0', 'CAMARA IP 2MP', 45.00, 'activo'),
('36.5.0', 'NVR 4 CANALES', 120.00, 'activo'),
('36.6.0', 'DISCO DVR 1TB', 55.00, 'activo'),
('36.7.0', 'SOPORTE CAMARA DOMO', 8.00, 'activo'),
('36.8.0', 'CABLE UTP 305M', 85.00, 'activo'),
('36.9.0', 'PATCH PANEL 24 PUERTOS', 35.00, 'activo'),
('37.0.0', 'FUSIBLE 5A', 0.30, 'activo'),
('37.1.0', 'FUSIBLE 10A', 0.35, 'activo'),
('37.2.0', 'PORTAFUSIBLE', 1.20, 'activo'),
('37.3.0', 'TERMINAL DE BATERIA', 0.80, 'activo'),
('37.4.0', 'CABLE BATERIA 25MM 1M', 6.00, 'activo'),
('37.5.0', 'CABLE BATERIA 35MM 1M', 9.00, 'activo'),
('37.6.0', 'PINZA AMPERIMETRO', 45.00, 'activo'),
('37.7.0', 'MULTIMETRO DIGITAL', 18.00, 'activo'),
('37.8.0', 'SOLDADOR 60W', 22.00, 'activo'),
('37.9.0', 'ESTACION SOLDADURA', 85.00, 'activo'),
('38.0.0', 'ALAMBRE ESTANADO 0.8MM', 3.50, 'activo'),
('38.1.0', 'FLUX SOLDADURA 50ML', 2.50, 'activo'),
('38.2.0', 'PAPEL ALUMINIO 30CMX10M', 1.80, 'activo'),
('38.3.0', 'CINTA TERMICA 10MM', 1.20, 'activo'),
('38.4.0', 'TERMOCONTRAIBLE 1M', 0.90, 'activo'),
('38.5.0', 'CONECTOR RAPIDO 2 PIN', 0.40, 'activo'),
('38.6.0', 'CONECTOR RAPIDO 3 PIN', 0.60, 'activo'),
('38.7.0', 'BORNE DE CONEXION 2P', 0.50, 'activo'),
('38.8.0', 'BORNE DE CONEXION 3P', 0.80, 'activo'),
('38.9.0', 'PLACA PROTOTIPO 400 PUNTOS', 3.00, 'activo'),
('39.0.0', 'CABLE SILICONA 1.5MM 1M', 1.20, 'activo'),
('39.1.0', 'CABLE SILICONA 2.5MM 1M', 1.80, 'activo'),
('39.2.0', 'CABLE SILICONA 4MM 1M', 2.50, 'activo'),
('39.3.0', 'CONDUCTOR FLEXIBLE 10MM 1M', 4.00, 'activo'),
('39.4.0', 'CONDUCTOR FLEXIBLE 16MM 1M', 6.50, 'activo'),
('39.5.0', 'TERMINAL OJO 10MM', 0.05, 'activo'),
('39.6.0', 'TERMINAL OJO 8MM', 0.04, 'activo'),
('39.7.0', 'TERMINAL OJO 6MM', 0.03, 'activo'),
('39.8.0', 'CINTA AISLANTE 20M', 1.50, 'activo'),
('39.9.0', 'CABLE NYA 2.5MM 100M', 45.00, 'activo'),
('40.0.0', 'CABLE NYA 4MM 100M', 70.00, 'activo'),
('40.1.0', 'CABLE NYA 6MM 100M', 120.00, 'activo'),
('40.2.0', 'CABLE NYA 10MM 100M', 180.00, 'activo'),
('40.3.0', 'TUBERIA CONDUIT 20MM 3M', 4.50, 'activo'),
('40.4.0', 'TUBERIA CONDUIT 25MM 3M', 6.00, 'activo'),
('40.5.0', 'CAJA DE EMPALME 4X4', 2.50, 'activo'),
('40.6.0', 'CAJA DE EMPALME 6X6', 3.50, 'activo'),
('40.7.0', 'SOPORTE PARA CAJA', 1.20, 'activo'),
('40.8.0', 'ABRAZADERA METALICA 1/2', 0.30, 'activo'),
('40.9.0', 'ABRAZADERA METALICA 3/4', 0.40, 'activo'),
('41.0.0', 'TUBO FLEXIBLE 1/2 3M', 2.00, 'activo'),
('41.1.0', 'TUBO FLEXIBLE 3/4 3M', 3.00, 'activo'),
('41.2.0', 'TUBO FLEXIBLE 1 3M', 4.50, 'activo'),
('41.3.0', 'SOPORTE PARA TUBO', 0.80, 'activo'),
('41.4.0', 'CODO PVC 1/2', 0.50, 'activo'),
('41.5.0', 'CODO PVC 3/4', 0.70, 'activo'),
('41.6.0', 'CODO PVC 1', 1.00, 'activo'),
('41.7.0', 'REDUCCION PVC 3/4 A 1/2', 0.90, 'activo'),
('41.8.0', 'TE PVC 1/2', 0.80, 'activo'),
('41.9.0', 'TE PVC 3/4', 1.10, 'activo');

-- ============================================================
-- 14. DATOS: Movimientos de ejemplo (ultimos 7 dias)
-- ============================================================
DO $$
DECLARE
  prod_ids UUID[];
BEGIN
  SELECT array_agg(id) INTO prod_ids FROM productos LIMIT 10;
  
  IF prod_ids IS NOT NULL THEN
    INSERT INTO movimientos (producto_id, cantidad, tipo, sitio, creado_en) VALUES
    (prod_ids[1], 50, 'entrada', 'Bodega principal', now() - interval '6 days'),
    (prod_ids[2], 20, 'entrada', 'Bodega principal', now() - interval '5 days'),
    (prod_ids[3], 10, 'salida', 'Obra Norte', now() - interval '4 days'),
    (prod_ids[4], 30, 'entrada', 'Bodega principal', now() - interval '3 days'),
    (prod_ids[5], 5, 'salida', 'Obra Centro', now() - interval '2 days'),
    (prod_ids[1], 15, 'salida', 'Obra Norte', now() - interval '1 day'),
    (prod_ids[6], 100, 'entrada', 'Bodega principal', now() - interval '1 day'),
    (prod_ids[7], 8, 'salida', 'Instalacion Bodega', now()),
    (prod_ids[8], 25, 'entrada', 'Bodega principal', now()),
    (prod_ids[9], 12, 'salida', 'Obra Norte', now());
  END IF;
END $$;

-- ============================================================
-- SETUP COMPLETO
-- ============================================================
-- Tablas: 9
-- Productos: 100+
-- Obras: 3
-- Movimientos: 10
-- Notificaciones: 3
-- RLS: Configurado
--
-- SIGUIENTE PASO:
-- 1. Levantar servidor local
-- 2. /admin-dashboard/setup/dev-master-key.html → generar key
-- 3. /admin-dashboard/crear-jefe.html → crear cuenta
-- 4. Login → Dashboard funcional con datos reales
-- ============================================================
