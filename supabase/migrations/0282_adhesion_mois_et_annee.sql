-- L'adhésion de WFG 2 (Sarah, 15/11/2026) : deux façons de payer.
--   • à l'année, en une fois : 75 € ;
--   • au mois, par prélèvement : 7 € par mois. HelloAsso ne fait pas
--     d'abonnement sans fin : c'est un paiement en 12 fois (7 € tout de
--     suite, puis 11 prélèvements de 7 €), soit un engagement d'un an —
--     accepté par Sarah le 15/11. price_cents est le total (84 €) ; le
--     premier paiement (7 €) suffit à activer l'adhésion.
insert into public.membership_plans (slug, label, price_cents, currency, description, is_active)
values
  ('annee_75', 'Adhésion à l''année — 75 €', 7500, 'EUR',
   'Un an d''adhésion, payé en une fois.', true),
  ('mois_7', 'Adhésion au mois — 12 × 7 €', 8400, 'EUR',
   'Un an d''adhésion, payé en 12 prélèvements de 7 € par mois.', true)
on conflict (slug) do update
  set label = excluded.label, price_cents = excluded.price_cents,
      description = excluded.description, is_active = true;
