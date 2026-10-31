-- Retour arrière de supabase/migrations/20261031130000_search_path_profil.sql :
-- rétablit l'état antérieur (search_path non fixé, alerte function_search_path_mutable).
alter function public.rp_proteger_profil() reset search_path;
