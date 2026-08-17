import { supabase } from "@/integrations/supabase/client";

/**
 * Upload de mídia do caderno (Fase 03.2). O bucket 'lesson-media' é
 * privado e tem teto duro de 50 MB + allowlist de MIME no servidor; esta
 * camada valida ANTES do upload, por categoria, com limites mais justos e
 * mensagens em português. O documento persiste o CAMINHO do objeto
 * ({user_id}/{contexto}/{uuid}-{nome}, onde contexto é a aula ou o curso —
 * ver document-anchor.ts), nunca a URL assinada — ela expira; a resolução
 * para exibição acontece em resolveMediaUrl.
 */

export const MEDIA_BUCKET = "lesson-media";

const MB = 1024 * 1024;

const CATEGORY_LIMITS: Record<string, { mimes: string[]; maxBytes: number; label: string }> = {
  image: {
    mimes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
    maxBytes: 5 * MB,
    label: "Imagens",
  },
  video: {
    mimes: ["video/mp4", "video/webm"],
    maxBytes: 50 * MB,
    label: "Vídeos",
  },
  audio: {
    mimes: ["audio/mpeg", "audio/mp4", "audio/ogg", "audio/wav"],
    maxBytes: 50 * MB,
    label: "Áudios",
  },
  file: {
    mimes: [
      "application/pdf",
      "text/plain",
      "application/zip",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ],
    maxBytes: 20 * MB,
    label: "Arquivos",
  },
};

export function categoryForMime(mime: string): keyof typeof CATEGORY_LIMITS | null {
  for (const [category, config] of Object.entries(CATEGORY_LIMITS)) {
    if (config.mimes.includes(mime)) return category as keyof typeof CATEGORY_LIMITS;
  }
  return null;
}

export class MediaValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MediaValidationError";
  }
}

export function validateMediaFile(file: File): void {
  const category = categoryForMime(file.type);
  if (!category) {
    throw new MediaValidationError(
      `Tipo de arquivo não permitido (${file.type || "desconhecido"}).`,
    );
  }
  const { maxBytes, label } = CATEGORY_LIMITS[category];
  if (file.size > maxBytes) {
    throw new MediaValidationError(`${label} podem ter no máximo ${Math.round(maxBytes / MB)} MB.`);
  }
}

/** Remove tudo que não for seguro num nome de arquivo dentro do caminho do storage. */
export function sanitizeFileName(name: string): string {
  const trimmed = name.normalize("NFKD").replace(/[̀-ͯ]/g, "");
  const safe = trimmed.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/_{2,}/g, "_");
  return safe.slice(-80) || "arquivo";
}

export function buildMediaPath(userId: string, contextKey: string, fileName: string): string {
  return `${userId}/${contextKey}/${crypto.randomUUID()}-${sanitizeFileName(fileName)}`;
}

/**
 * Handler para o `uploadFile` do BlockNote: valida, sobe para o bucket e
 * devolve o caminho do objeto (que o bloco guarda em props.url).
 */
export function createMediaUploader(userId: string, contextKey: string) {
  return async function uploadMedia(file: File): Promise<string> {
    validateMediaFile(file);
    const path = buildMediaPath(userId, contextKey, file.name);
    const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(path, file, {
      contentType: file.type,
    });
    if (error) throw error;
    return path;
  };
}

const SIGNED_URL_TTL_SECONDS = 3600;
// Renova antes de expirar de verdade para nunca exibir mídia quebrada.
const CACHE_TTL_MS = (SIGNED_URL_TTL_SECONDS - 300) * 1000;

const signedUrlCache = new Map<string, { url: string; expiresAt: number }>();

const DANGEROUS_SCHEME = /^\s*(javascript|data|vbscript|file):/i;

/**
 * Handler para o `resolveFileUrl` do BlockNote: caminhos do storage viram
 * URL assinada (com cache); http(s) externo passa direto; esquemas
 * perigosos nunca chegam ao DOM.
 */
export async function resolveMediaUrl(url: string): Promise<string> {
  if (!url) return "";
  if (DANGEROUS_SCHEME.test(url)) return "";
  if (/^https?:\/\//i.test(url)) return url;

  const cached = signedUrlCache.get(url);
  if (cached && cached.expiresAt > Date.now()) return cached.url;

  const { data, error } = await supabase.storage
    .from(MEDIA_BUCKET)
    .createSignedUrl(url, SIGNED_URL_TTL_SECONDS);
  if (error || !data?.signedUrl) return "";
  signedUrlCache.set(url, { url: data.signedUrl, expiresAt: Date.now() + CACHE_TTL_MS });
  return data.signedUrl;
}
