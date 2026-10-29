/**
 * Minimaler Client für OpenAI-kompatible Chat-Completions-APIs.
 * Funktioniert mit DeepSeek, OpenAI, Google Gemini, Groq, Mistral und OpenRouter –
 * gewechselt wird nur über die Secrets AI_API_KEY, AI_BASE_URL und AI_MODEL.
 */

export type ContentPart = { type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string; detail?: 'low' | 'high' | 'auto' } }

export type ChatMessage =
  | { role: 'system'; content: string }
  | { role: 'user'; content: string | ContentPart[] }
  | { role: 'assistant'; content: string | null; tool_calls?: ToolCall[] }
  | { role: 'tool'; tool_call_id: string; content: string }

export interface ToolCall {
  id: string
  type: 'function'
  function: { name: string; arguments: string }
}

export interface ToolDefinition {
  type: 'function'
  function: { name: string; description: string; parameters: Record<string, unknown> }
}

export interface CompletionRequest {
  messages: ChatMessage[]
  tools?: ToolDefinition[]
  /** Antwort als JSON-Objekt erzwingen (der Prompt muss das Format beschreiben). */
  json?: boolean
  maxTokens?: number
  /** Modell für diese Anfrage, z. B. ein Bildmodell. Standard: config.model. */
  model?: string
  /** Abbruch nach dieser Zeit (ms). Standard 30 s. */
  timeoutMs?: number
}

export interface CompletionResult {
  content: string | null
  toolCalls: ToolCall[]
}

export interface LlmConfig {
  apiKey: string
  baseUrl: string
  model: string
  /** Modell für Bildauswertung (AI_VISION_MODEL), Standard wie `model`. */
  visionModel: string
}

export class LlmError extends Error {
  /**
   * @param status         HTTP-Status für das Frontend
   * @param providerStatus HTTP-Status, den der KI-Anbieter geliefert hat (falls vorhanden)
   */
  constructor(message: string, readonly status = 502, readonly providerStatus?: number) {
    super(message)
    this.name = 'LlmError'
  }
}

export const DEFAULT_BASE_URL = 'https://api.deepseek.com'
export const DEFAULT_MODEL = 'deepseek-flash'

export const readConfig = (env: (key: string) => string | undefined): LlmConfig | null => {
  const apiKey = env('AI_API_KEY')
  if (!apiKey) return null
  const model = env('AI_MODEL') || DEFAULT_MODEL
  return {
    apiKey,
    baseUrl: (env('AI_BASE_URL') || DEFAULT_BASE_URL).replace(/\/+$/, ''),
    model,
    visionModel: env('AI_VISION_MODEL') || model,
  }
}

/** Anbieterspezifische Zusatzfelder. DeepSeek «denkt» standardmässig – für kurze Antworten zu langsam. */
export const providerExtras = (baseUrl: string): Record<string, unknown> =>
  baseUrl.includes('deepseek.com') ? { thinking: { type: 'disabled' } } : {}

export const buildBody = (config: LlmConfig, req: CompletionRequest): Record<string, unknown> => ({
  model: req.model ?? config.model,
  messages: req.messages,
  max_tokens: req.maxTokens ?? 800,
  ...(req.tools?.length ? { tools: req.tools, tool_choice: 'auto' } : {}),
  ...(req.json ? { response_format: { type: 'json_object' } } : {}),
  ...providerExtras(config.baseUrl),
})

export const complete = async (config: LlmConfig, req: CompletionRequest, fetchFn: typeof fetch = fetch): Promise<CompletionResult> => {
  let res: Response
  try {
    res = await fetchFn(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(buildBody(config, req)),
      signal: AbortSignal.timeout(req.timeoutMs ?? 30_000),
    })
  } catch (e) {
    if (e instanceof DOMException && e.name === 'TimeoutError') throw new LlmError('Die KI hat zu lange gebraucht. Bitte erneut versuchen.', 504)
    throw new LlmError(`KI-Dienst nicht erreichbar: ${String(e)}`)
  }
  const data = (await res.json().catch(() => ({}))) as {
    choices?: { message?: { content?: string | null; tool_calls?: ToolCall[] } }[]
    error?: { message?: string }
  }
  if (!res.ok) {
    console.error('KI-Anbieter', res.status, data.error?.message)
    if (res.status === 401) throw new LlmError('Der KI-Schlüssel ist ungültig (AI_API_KEY prüfen).', 503, 401)
    if (res.status === 402) throw new LlmError('Das Guthaben beim KI-Anbieter ist aufgebraucht.', 503, 402)
    if (res.status === 429) throw new LlmError('Der KI-Dienst ist gerade ausgelastet. Bitte kurz warten.', 429, 429)
    throw new LlmError(`KI-Anbieter meldet Fehler ${res.status}.`, 502, res.status)
  }
  const message = data.choices?.[0]?.message
  return { content: message?.content ?? null, toolCalls: message?.tool_calls ?? [] }
}

/** Liest ein JSON-Objekt aus der Antwort, auch wenn das Modell es in ```json … ``` einpackt. */
export const parseJsonObject = (text: string | null): Record<string, unknown> => {
  if (!text) throw new LlmError('Die KI hat keine Antwort geliefert.')
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1 || end <= start) throw new LlmError('Die KI-Antwort war kein gültiges JSON.')
  try {
    const value = JSON.parse(text.slice(start, end + 1))
    if (value && typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>
  } catch {
    // fällt unten durch
  }
  throw new LlmError('Die KI-Antwort war kein gültiges JSON.')
}
