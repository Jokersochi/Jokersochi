insert into properties (
  title,
  address,
  price_listing,
  price_floor,
  passport_json
)
values (
  'Квартира, пилотный объект',
  'demo address',
  9000000,
  8500000,
  '{"rooms": null, "area": null, "floor": null, "renovation": null, "documents": "уточнить у владельца", "description": "Пилотный объект для AI Realtor MVP"}'::jsonb
)
on conflict do nothing;
