-- Verificar el trigger trg_notificar_stock
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'trg_notificar_stock';
