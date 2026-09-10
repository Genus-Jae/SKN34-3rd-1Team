import type { z } from 'zod'
import { ApplicationPreparationError } from '../../domain/errors/ApplicationPreparationError'
import { applicationPreparationProblemSchema } from '../models/ApplicationPreparationDto'
import { getCoreApiBaseUrl } from './coreApiConfig'

export async function applicationPreparationRequest<T>(
  path: string,
  schema: z.ZodType<T>,
  method: 'GET' | 'POST',
  body?: unknown,
  signal?: AbortSignal,
): Promise<T> {
  const controller = new AbortController()
  const abort = () => controller.abort()
  signal?.addEventListener('abort', abort, { once: true })
  if (signal?.aborted) controller.abort()
  let timedOut = false
  const timer = setTimeout(() => {
    timedOut = true
    abort()
  }, 15_000)
  try {
    const response = await fetch(`${getCoreApiBaseUrl()}/api/v1/application-preparations${path}`, {
      method,
      credentials: 'include',
      cache: 'no-store',
      signal: controller.signal,
      ...(body === undefined ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
    })
    if (!response.ok) {
      const problem = applicationPreparationProblemSchema.safeParse(await response.json().catch(() => null))
      throw new ApplicationPreparationError(response.status, problem.success ? problem.data.code : 'REQUEST_FAILED')
    }
    const payload = await response.json().catch(() => null)
    const parsed = schema.safeParse(payload)
    if (!parsed.success) throw new ApplicationPreparationError(502, 'INVALID_RESPONSE')
    return parsed.data
  } catch (error) {
    if (error instanceof ApplicationPreparationError) throw error
    if (signal?.aborted) throw error
    if (timedOut) throw new ApplicationPreparationError(504, 'REQUEST_TIMEOUT')
    throw new ApplicationPreparationError(0, 'REQUEST_FAILED')
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', abort)
  }
}
