import type { z } from 'zod'
import { ApplicationPreparationError } from '../../domain/errors/ApplicationPreparationError'
import { applicationPreparationProblemSchema } from '../models/ApplicationPreparationDto'
import { getCoreApiBaseUrl } from './coreApiConfig'

export type ApplicationPreparationNotFoundScope = 'feature' | 'preparation'

export async function applicationPreparationRequest<T>(
  path: string,
  schema: z.ZodType<T>,
  method: 'GET' | 'POST' | 'PUT',
  body?: unknown,
  signal?: AbortSignal,
  notFoundScope: ApplicationPreparationNotFoundScope = 'feature',
): Promise<T> {
  const controller = new AbortController()
  const abort = () => controller.abort()
  signal?.addEventListener('abort', abort, { once: true })
  if (signal?.aborted) controller.abort()
  let timedOut = false
  const timer = setTimeout(() => {
    timedOut = true
    abort()
  }, path.endsWith('/forms/discover') ? 90_000 : path.endsWith('/messages') ? 45_000 : 15_000)
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
      const serverCode = problem.success ? problem.data.code : null
      const code = response.status === 404
        ? serverCode?.startsWith('APPLICATION_FORM_')
          ? serverCode
          : notFoundScope === 'preparation' && (
            serverCode === 'APPLICATION_PREPARATION_NOT_FOUND' || serverCode === 'APPLICATION_PREPARATION_SECTION_NOT_FOUND'
          )
          ? serverCode
          : 'APPLICATION_PREPARATION_API_UNAVAILABLE'
        : serverCode ?? 'REQUEST_FAILED'
      throw new ApplicationPreparationError(response.status, code)
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
