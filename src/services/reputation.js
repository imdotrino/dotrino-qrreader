// Puente al registro de reputación (@dotrino/reputation, backend rep.dotrino.com).
// Reusa el web-of-trust local del vault para ponderar (anti-sybil). No inventamos
// score propio: el paquete pondera por MI confianza en los emisores.
import { createVaultReputation } from '@dotrino/reputation'
import { getIdentity } from './identity'

let _rep = null

/** Instancia compartida de reputación (o null si no hay vault). */
export async function getReputation () {
  if (_rep) return _rep
  const id = await getIdentity()
  if (!id) return null
  try { _rep = createVaultReputation(id) } catch (_) { _rep = null }
  return _rep
}
