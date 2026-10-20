-- =====================================================================
-- L'adhésion à 5 € (20/10/2026, Sarah) : la même adhésion que celle de
-- 50 €, réglée au mois. Une formule à part, pour que l'écran des membres
-- (menu « Adhésion ») la distingue ; elle dure un mois.
-- Elle n'est pas proposée au paiement en ligne : seule l'administration
-- l'accorde pour l'instant.
-- =====================================================================

insert into public.membership_plans (slug, label, price_cents, currency, description, is_active)
values ('palier_5', 'Adhésion 5 €', 500, 'EUR', 'La même adhésion que celle à 50 €, au mois. Accordée par l''administration.', true)
on conflict (slug) do nothing;
