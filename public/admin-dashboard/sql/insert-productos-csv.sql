-- ============================================================
-- ADDBOX — INSERTAR PRODUCTOS DESDE CSV (SCRIPT AUXILIAR)
-- Ejecutar en Supabase SQL Editor
-- Descripción: Inserta productos desde cvs-1.csv y cvs-2.csv
-- NOTA: Este script es auxiliar. Lo recomendado es usar la
--       interfaz de importación en /admin-dashboard/importar-productos.html
-- ============================================================

-- ============================================================
-- 1. Insertar productos de cvs-1.csv (ejemplo - primeras 10 líneas)
-- ============================================================
INSERT INTO productos (codigo, descripcion, unidad, costo_prom, costo_prom_dolares, categoria, estado, umbral_critico, umbral_alerta) VALUES
('CON-0001', 'AMBIENTADORES', 'UND', 332.15, 9.10, 'CONSUMIBLES', 'ACTIVO', 5, 9),
('HER-0001', 'ASPIRADORA INDUSTRIAL RIDGID', 'UND', 18103.16, 495.92, 'HERRAMIENTAS', 'ACTIVO', 5, 9),
('HER-0002', 'ARNES DE SEGURIDAD', 'UND', 2002.00, 55.00, 'HERRAMIENTAS', 'ACTIVO', 5, 9),
('CON-0002', 'ACEITE 15W-40 PARA MOTOR MARCA LUBRIC MOK', 'LITRO', 0, 0, 'CONSUMIBLES', 'ACTIVO', 5, 9),
('CON-0003', 'ACEITE CASTROL 10W-30', 'LITRO', 0, 0, 'CONSUMIBLES', 'ACTIVO', 5, 9),
('PIN-0001', 'PINTURA AV2000 MONTAFIX SATINADO A0647', 'GALON', 968.64, 26.46, 'PINTURA', 'ACTIVO', 5, 9),
('MAT-0001', 'ARANDELA PLANA DE 1/2', 'UND', 0, 0, 'MATERIALES', 'ACTIVO', 5, 9),
('MAT-0002', 'ARENA LAVADA (SACO)', 'SACO', 25.16, 0.69, 'MATERIALES', 'ACTIVO', 5, 9),
('ELE-0001', 'ADAPTADOR EMT MACHO 1/2', 'UND', 655.20, 18.00, 'ELECTRICIDAD', 'ACTIVO', 5, 9),
('ELE-0002', 'ABRAZADERAS EMT 3/4 DE DOS PATAS', 'UND', 91.00, 2.50, 'ELECTRICIDAD', 'ACTIVO', 5, 9);

-- ============================================================
-- 2. Insertar productos de cvs-2.csv (ejemplo - primeras 10 líneas)
-- ============================================================
INSERT INTO productos (codigo, descripcion, unidad, costo_prom, costo_prom_dolares, categoria, estado, umbral_critico, umbral_alerta) VALUES
('MAT-0099', 'PERFIL TIPO U DE ALUM. 1/2X1/2 DE 3 MTRS', 'UND', 365.00, 10.00, 'MATERIALES', 'ACTIVO', 5, 9),
('ELE-0173', 'PLATINA DE ALUM. NAT. DE 1/2X1/2X3MTRS', 'UND', 0, 0, 'ELECTRICIDAD', 'ACTIVO', 5, 9),
('CON-0110', 'PASTA TERMICA PARA SOLDADURA', 'UND', 2359.20, 64.80, 'CONSUMIBLES', 'ACTIVO', 5, 9),
('CON-0111', 'PINTURA LOXON EXTERIOR MAGNOLIA MATE', 'GALON', 2231.50, 61.00, 'CONSUMIBLES', 'ACTIVO', 5, 9),
('ELE-0174', 'PINTURA LOXON EXTERIOR MATE', 'GALON', 7300.00, 200.00, 'ELECTRICIDAD', 'ACTIVO', 5, 9),
('ELE-0175', 'PINTURA LOXON EXTERIOR BASE MATE', 'GALON', 949.00, 26.00, 'ELECTRICIDAD', 'ACTIVO', 5, 9),
('ELE-0176', 'PARAL DE ROMANILLA 2.00X5X3', 'UND', 1095.00, 30.00, 'ELECTRICIDAD', 'ACTIVO', 5, 9),
('ELE-0177', 'PEGA TANKE 25ML', 'UND', 201.40, 5.53, 'ELECTRICIDAD', 'ACTIVO', 5, 9),
('ELE-0178', 'PALA DE JARDINERÍA 320M', 'UND', 126.92, 3.48, 'ELECTRICIDAD', 'ACTIVO', 5, 9),
('ELE-0179', 'PASTA PROFESIONAL CROMAS', 'UND', 566.48, 15.52, 'ELECTRICIDAD', 'ACTIVO', 5, 9);

-- ============================================================
-- 3. Actualizar tasas de cambio
-- ============================================================
INSERT INTO tasas_cambio (fecha, tasa, fuente) VALUES
(CURRENT_DATE, 36.50, 'BCV')
ON CONFLICT (fecha, fuente) DO NOTHING;

-- ============================================================
-- FIN DEL SCRIPT
-- ============================================================
