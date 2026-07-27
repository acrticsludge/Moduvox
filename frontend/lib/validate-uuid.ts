const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function validateUuid(value: string, name: string): { valid: true; value: string } | { valid: false; error: string } {
  if (!UUID_REGEX.test(value)) {
    return { valid: false, error: `${name} must be a valid UUID` }
  }
  return { valid: true, value }
}
