WITH ranked AS (
  SELECT
    id,
    codigo,
    ROW_NUMBER() OVER (PARTITION BY codigo ORDER BY created_at DESC, id DESC) AS rn
  FROM productos
)
DELETE FROM productos
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);
