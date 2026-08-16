/**
 * Cliente LLM unificado — enruta a través de Vercel AI Gateway.
 * El modelo se selecciona vía la variable de entorno AI_GATEWAY_MODEL
 * (formato "proveedor/modelo", ej. "anthropic/claude-sonnet-5").
 */

import { generateText } from 'ai';

interface CallLLMOptions {
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
  timeoutMs?: number;
}

// Tope por llamada: una llamada colgada no puede comerse el presupuesto entero
// de la función (maxDuration 120s) — con esto quedan ~2 reintentos posibles.
const DEFAULT_TIMEOUT_MS = 45_000;

interface LLMResponse {
  content: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

const DEFAULT_MODEL = 'anthropic/claude-sonnet-5';

/**
 * Llama al LLM con una interfaz unificada a través de AI Gateway.
 */
export async function callLLM(
  systemPrompt: string,
  userPrompt: string,
  options: CallLLMOptions = {}
): Promise<LLMResponse> {
  const {
    temperature = 0.7,
    maxTokens = 4000,
    jsonMode = true,
    timeoutMs = DEFAULT_TIMEOUT_MS,
  } = options;

  const jsonInstruction = jsonMode
    ? '\n\nIMPORTANTE: Responde ÚNICAMENTE con JSON válido. Sin texto adicional, sin markdown, sin bloques de código.'
    : '';

  const result = await generateText({
    model: process.env.AI_GATEWAY_MODEL || DEFAULT_MODEL,
    system: systemPrompt + jsonInstruction,
    prompt: userPrompt,
    temperature,
    maxOutputTokens: maxTokens,
    abortSignal: AbortSignal.timeout(timeoutMs),
  });

  return {
    content: result.text,
    usage: result.usage
      ? {
          inputTokens: result.usage.inputTokens ?? 0,
          outputTokens: result.usage.outputTokens ?? 0,
        }
      : undefined,
  };
}

/**
 * Parsea JSON de la respuesta del LLM, manejando posibles wrappers de markdown.
 */
export function parseJSONResponse(content: string): unknown {
  // Intentar parsear directamente
  try {
    return JSON.parse(content);
  } catch {
    // Si falla, intentar extraer JSON de un bloque de código markdown
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1].trim());
    }

    // Intentar encontrar el primer { y último }
    const start = content.indexOf('{');
    const end = content.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) {
      return JSON.parse(content.slice(start, end + 1));
    }

    throw new Error('No se pudo extraer JSON válido de la respuesta del LLM');
  }
}
