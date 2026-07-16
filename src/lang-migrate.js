/**
 * Migra la preferencia de idioma de la clave propia de la app a la del
 * ecosistema: 'qrreader.lang' → 'dotrino.lang'.
 *
 * El <dotrino-topbar> es la fuente de verdad del idioma y persiste en
 * 'dotrino.lang'. Esta app guardaba su propia clave; sin migrar, a quien ya
 * había elegido idioma se le reseteaba al detectado por el navegador.
 *
 * IMPORTANTE: este módulo se importa ANTES de '@dotrino/topbar'. El componente
 * resuelve el idioma al definirse (connectedCallback → _resolveLang lee
 * 'dotrino.lang'), y los imports de ES se evalúan en orden: si se importara
 * después, la migración llegaría tarde.
 */
const OLD_KEY = 'qrreader.lang'
const NEW_KEY = 'dotrino.lang'

try {
  const old = localStorage.getItem(OLD_KEY)
  // Solo migra si el usuario no eligió ya idioma en otra app del ecosistema.
  if (old && !localStorage.getItem(NEW_KEY)) {
    localStorage.setItem(NEW_KEY, old === 'en' ? 'en' : 'es')
  }
  if (old) localStorage.removeItem(OLD_KEY)
} catch (_) { /* modo privado: sin localStorage, el topbar detecta el idioma */ }
