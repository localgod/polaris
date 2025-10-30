import type { H3Event } from 'h3'

/**
 * Send a successful response with data
 */
export function sendSuccess<T>(event: H3Event, data: T, statusCode = 200) {
  setResponseStatus(event, statusCode)
  return {
    success: true,
    data,
    count: Array.isArray(data) ? data.length : undefined
  }
}

/**
 * Send a 201 Created response
 */
export function sendCreated<T>(event: H3Event, data: T) {
  return sendSuccess(event, data, 201)
}

/**
 * Send a 204 No Content response
 */
export function sendNoContentResponse(event: H3Event) {
  setResponseStatus(event, 204)
  return null
}

/**
 * Throw an HTTP error with status code and message
 */
export function throwHttpError(statusCode: number, message: string): never {
  throw createError({
    statusCode,
    message
  })
}

/**
 * Throw a 400 Bad Request error
 */
export function sendBadRequest(message: string): never {
  return throwHttpError(400, message)
}

/**
 * Throw a 404 Not Found error
 */
export function sendNotFound(resource: string, identifier: string): never {
  return throwHttpError(404, `${resource} '${identifier}' not found`)
}

/**
 * Throw a 409 Conflict error
 */
export function sendConflict(message: string): never {
  return throwHttpError(409, message)
}

/**
 * Throw a 422 Unprocessable Entity error
 */
export function sendUnprocessableEntity(message: string): never {
  return throwHttpError(422, message)
}

/**
 * Throw a 403 Forbidden error
 */
export function sendForbidden(message: string): never {
  return throwHttpError(403, message)
}
