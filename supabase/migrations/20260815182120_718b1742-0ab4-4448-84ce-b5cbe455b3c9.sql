-- Fix search_path for publish_lesson_document
ALTER FUNCTION public.publish_lesson_document(UUID) SET search_path = public;
