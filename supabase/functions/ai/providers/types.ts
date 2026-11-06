/** Gemeinsame Schnittstelle aller KI-Anbieter (KONZEPT 7.1). */
export interface CompleteRequest {
  system: string
  /** Inhalt der Person – immer als abgegrenzter Block im User-Teil, nie im System-Prompt. */
  user: string
  /** Antwort als JSON-Objekt erzwingen. */
  json?: boolean
  maxTokens?: number
  /** Nur für den Mock: welche Aktion gerade läuft, damit er passend antworten kann. */
  action: string
}

export interface CompleteResult {
  text: string
  usage: { input: number; output: number }
}

export interface Provider {
  readonly name: string
  complete(req: CompleteRequest, signal: AbortSignal): Promise<CompleteResult>
}

/** Fehler mit HTTP-Status für das Frontend. Die Nachricht ist für Menschen gedacht. */
export class AiError extends Error {
  constructor(message: string, readonly status = 502) {
    super(message)
    this.name = 'AiError'
  }
}
