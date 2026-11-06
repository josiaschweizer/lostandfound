/**
 * Adapter für OpenAI-kompatible Chat-Completions-APIs (DeepSeek, OpenAI, Mistral, Groq, OpenRouter …).
 * Gewechselt wird nur über die Secrets AI_BASE_URL und AI_MODEL.
 */
import { AiError, type CompleteRequest, type CompleteResult, type Provider } from './types.ts'

export interface OpenAiConfig {
  apiKey: string
  baseUrl: string
  model: string
}

/** DeepSeek «denkt» je nach Modell standardmässig – für kurze JSON-Antworten zu langsam. */
const providerExtras = (baseUrl: string): Record<string, unknown> => (baseUrl.includes('deepseek.com') ? { thinking: { type: 'disabled' } } : {})

export const buildBody = (config: OpenAiConfig, req: CompleteRequest): Record<string, unknown> => ({
  model: config.model,
  messages: [
    { role: 'system', content: req.system },
    { role: 'user', content: req.user },
  ],
  max_tokens: req.maxTokens ?? 600,
  temperature: 0,
  ...(req.json ? { response_format: { type: 'json_object' } } : {}),
  ...providerExtras(config.baseUrl),
})

export const createOpenAiProvider = (config: OpenAiConfig, fetchFn: typeof fetch = fetch): Provider => ({
  name: 'openai-compatible',
  async complete(req: CompleteRequest, signal: AbortSignal): Promise<CompleteResult> {
    let res: Response
    try {
      res = await fetchFn(`${config.baseUrl.replace(/\/+$/, '')}/chat/completions`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(buildBody(config, req)),
        signal,
      })
    } catch (e) {
      if (signal.aborted) throw new AiError('Die KI hat zu lange gebraucht.', 504)
      throw new AiError(`KI-Dienst nicht erreichbar: ${String(e)}`)
    }
    const data = (await res.json().catch(() => ({}))) as {
      choices?: { message?: { content?: string | null } }[]
      usage?: { prompt_tokens?: number; completion_tokens?: number }
      error?: { message?: string }
    }
    if (!res.ok) {
      console.error('KI-Anbieter', res.status, data.error?.message)
      if (res.status === 401) throw new AiError('Der KI-Schlüssel ist ungültig (AI_API_KEY prüfen).', 503)
      if (res.status === 402) throw new AiError('Das Guthaben beim KI-Anbieter ist aufgebraucht.', 503)
      if (res.status === 429) throw new AiError('Der KI-Dienst ist gerade ausgelastet.', 429)
      throw new AiError(`KI-Anbieter meldet Fehler ${res.status}.`)
    }
    return {
      text: data.choices?.[0]?.message?.content ?? '',
      usage: { input: data.usage?.prompt_tokens ?? 0, output: data.usage?.completion_tokens ?? 0 },
    }
  },
})
