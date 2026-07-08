-- ============================================================
-- SCRIPT: Asignar categorías a productos existentes
-- Ejecutar en el SQL Editor de Supabase
-- ============================================================

-- Primero verificar que la columna categoria existe
-- (Si ya existe, este comando no hace nada)
ALTER TABLE productos ADD COLUMN IF NOT EXISTS categoria TEXT;

-- ============================================================
-- HERRAMIENTAS
-- ============================================================
UPDATE productos SET categoria = 'Herramientas'
WHERE categoria IS NULL AND (
  descripcion ILIKE '%ALICATE%'
  OR descripcion ILIKE '%BROCHA%'
  OR descripcion ILIKE '%RODILLO%'
  OR descripcion ILIKE '%DESTORNILLADOR%'
  OR descripcion ILIKE '%MARTILLO%'
  OR descripcion ILIKE '%LLAVE%'
  OR descripcion ILIKE '%SIERRA%'
  OR descripcion ILIKE '%TALADRO%'
  OR descripcion ILIKE '%NIVEL%'
  OR descripcion ILIKE '%METRO%'
  OR descripcion ILIKE '%CEPILLO%'
  OR descripcion ILIKE '%ESPATULA%'
  OR descripcion ILIKE '%PISTOLA%'
  OR descripcion ILIKE '%PRENSA%'
  OR descripcion ILIKE '%TENAZA%'
  OR descripcion ILIKE '%PINZA%'
  OR descripcion ILIKE '%CAUTIN%'
  OR descripcion ILIKE '%SOLDADOR%'
  OR descripcion ILIKE '%BANDEJA RODILLO%'
  OR descripcion ILIKE '%BASE REFRIGERANTE%'
);

-- ============================================================
-- ELECTRICIDAD / ELECTRÓNICA
-- ============================================================
UPDATE productos SET categoria = 'Electricidad'
WHERE categoria IS NULL AND (
  descripcion ILIKE '%CABLE%'
  OR descripcion ILIKE '%CONDUCTOR%'
  OR descripcion ILIKE '%CONECTOR%'
  OR descripcion ILIKE '%ADAPTADOR%'
  OR descripcion ILIKE '%ANTENA%'
  OR descripcion ILIKE '%ARDUINO%'
  OR descripcion ILIKE '%BORNE%'
  OR descripcion ILIKE '%CINTA AISLANTE%'
  OR descripcion ILIKE '%ETHERNET%'
  OR descripcion ILIKE '%HDMI%'
  OR descripcion ILIKE '%VGA%'
  OR descripcion ILIKE '%USB%'
  OR descripcion ILIKE '%NVR%'
  OR descripcion ILIKE '%DVR%'
  OR descripcion ILIKE '%CAMARA IP%'
  OR descripcion ILIKE '%WIFI%'
  OR descripcion ILIKE '%GSM%'
  OR descripcion ILIKE '%BNC%'
  OR descripcion ILIKE '%DISCO DVR%'
  OR descripcion ILIKE '%BOQUILLA%'
  OR descripcion ILIKE '%FLUX%'
  OR descripcion ILIKE '%ESTANADO%'
  OR descripcion ILIKE '%ALAMBRE ESTANADO%'
  OR descripcion ILIKE '%CINTA TERMICA%'
  OR descripcion ILIKE '%CINTA KAPTON%'
);

-- ============================================================
-- PLOMERÍA / TUBERÍA
-- ============================================================
UPDATE productos SET categoria = 'Plomeria'
WHERE categoria IS NULL AND (
  descripcion ILIKE '%CODO PVC%'
  OR descripcion ILIKE '%TUBO%'
  OR descripcion ILIKE '%VALVULA%'
  OR descripcion ILIKE '%TEFLON%'
  OR descripcion ILIKE '%ABRAZADERA%'
  OR descripcion ILIKE '%CAJA DE EMPALME%'
  OR descripcion ILIKE '%REDUCCION%'
  OR descripcion ILIKE '%UNION%'
  OR descripcion ILIKE '%TEE%'
  OR descripcion ILIKE '%NIPLE%'
);

-- ============================================================
-- PINTURA / ACABADOS
-- ============================================================
UPDATE productos SET categoria = 'Pintura'
WHERE categoria IS NULL AND (
  descripcion ILIKE '%PINTURA%'
  OR descripcion ILIKE '%MASKING%'
  OR descripcion ILIKE '%LIJA%'
  OR descripcion ILIKE '%SELLADOR%'
  OR descripcion ILIKE '%BARNIZ%'
  OR descripcion ILIKE '%THINNER%'
);

-- ============================================================
-- CONSUMIBLES / OFICINA
-- ============================================================
UPDATE productos SET categoria = 'Consumibles'
WHERE categoria IS NULL AND (
  descripcion ILIKE '%CINTA ADHESIVA%'
  OR descripcion ILIKE '%CARTUCHO%'
  OR descripcion ILIKE '%TONER%'
  OR descripcion ILIKE '%PAPEL%'
  OR descripcion ILIKE '%ACEITE LUBRICANTE%'
);

-- ============================================================
-- MATERIALES (todo lo que no se clasificó arriba)
-- ============================================================
UPDATE productos SET categoria = 'Materiales'
WHERE categoria IS NULL;

-- ============================================================
-- VERIFICAR RESULTADO
-- ============================================================
SELECT categoria, COUNT(*) as total
FROM productos
GROUP BY categoria
ORDER BY categoria;
