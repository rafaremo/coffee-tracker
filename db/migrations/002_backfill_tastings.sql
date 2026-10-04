UPDATE coffees
SET data = json_insert(data, '$.tastings', json_array(json_object(
  'date', substr(created_at, 1, 10),
  'method', COALESCE(NULLIF(substr(json_extract(data, '$.brewingMethods'), 1, 200), ''), 'Registro inicial'),
  'rating', json_extract(data, '$.myRating')
)))
WHERE json_extract(data, '$.myRating') IS NOT NULL
  AND json_type(data, '$.tastings') IS NULL;
