type GeminiGeneration = {
  distinctId: string
  traceId: string
  sessionId: string
  input: string
  output?: string
  inputTokens?: number
  outputTokens?: number
  latency: number
  httpStatus?: number
  error?: string
}

export async function captureGeminiGeneration(generation: GeminiGeneration) {
  const token = Deno.env.get('POSTHOG_PROJECT_TOKEN')
  const host = Deno.env.get('POSTHOG_HOST')
  const privacyMode = Deno.env.get('POSTHOG_AI_PRIVACY_MODE') === 'true'

  if (!token || !host) {
    if (Deno.env.get('NODE_ENV') !== 'production') {
      if (!token) console.warn('POSTHOG_PROJECT_TOKEN variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once POSTHOG_PROJECT_TOKEN is configured')
      if (!host) console.warn('POSTHOG_HOST variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once POSTHOG_HOST is configured')
    }
    return
  }

  const properties: Record<string, unknown> = {
    distinct_id: generation.distinctId,
    $ai_trace_id: generation.traceId,
    $ai_session_id: generation.sessionId,
    $ai_span_name: 'receipt_reading',
    $ai_model: 'gemini-2.5-flash',
    $ai_provider: 'gemini',
    $ai_temperature: 0,
    $ai_input_tokens: generation.inputTokens,
    $ai_output_tokens: generation.outputTokens,
    $ai_latency: generation.latency,
    $ai_http_status: generation.httpStatus,
    $ai_is_error: Boolean(generation.error),
  }

  if (generation.error) properties.$ai_error = generation.error
  if (!privacyMode) {
    properties.$ai_input = [{ role: 'user', content: generation.input }]
    if (generation.output !== undefined) properties.$ai_output_choices = [{ role: 'assistant', content: generation.output }]
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 2000)
  try {
    await fetch(`${host.replace(/\/+$/, '')}/i/v0/e/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: token, event: '$ai_generation', properties }),
      signal: controller.signal,
    })
  } catch {
    // AI observability must not affect receipt reading when analytics is unavailable.
  } finally {
    clearTimeout(timeout)
  }
}
