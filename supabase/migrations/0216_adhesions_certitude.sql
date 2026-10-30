-- Adhésions de la Maison (0215) : degré de certitude et origine (30/10/2026).
-- certitude : « payée » (paiement confirmé : reçu, PayPal, la Maison accuse
-- réception), « déclarée » (formulaire rempli ou paiement annoncé),
-- « demandée » (la Maison a réclamé la cotisation, sans preuve de paiement).
-- source : la boîte d'où vient la ligne (boite_cm = maisondesscenaristes.cm).
alter table public.adhesions_maison add column if not exists certitude text;
alter table public.adhesions_maison add column if not exists source text not null default 'boite_cm';
