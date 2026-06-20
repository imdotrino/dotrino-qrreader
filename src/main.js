/**
 * QR Reader — lector de QR del ecosistema Dotrino.
 * Escanea con la cámara (BarcodeDetector nativo, fallback a jsQR) o sube una
 * imagen, muestra la información decodificada, detecta el tipo (URL/email/tel/
 * wifi/texto) y permite abrir el enlace o copiar el contenido. 100% en el
 * navegador: nada se sube a ningún servidor.
 */
import jsQR from 'jsqr'
import { registerSW } from 'virtual:pwa-register'
import '@dotrino/support'
import '@dotrino/install'
import './style.css'

// Recarga cuando el SW nuevo toma control + re-chequeo periódico (CONVENCIONES §3).
const updateSW = registerSW({ immediate: true })
setInterval(() => updateSW(), 30 * 60 * 1000)

/* ---------------- i18n ---------------- */
const I18N = {
  es: {
    tagline: 'Lee un código QR: escanea con la cámara o sube una imagen.',
    scan: 'Escanear con la cámara',
    stop: 'Detener',
    upload: 'Subir imagen',
    result: 'Contenido del código',
    open: 'Abrir enlace',
    call: 'Llamar',
    email: 'Enviar correo',
    copy: 'Copiar',
    copied: 'Copiado',
    again: 'Escanear otro',
    noCam: 'No se pudo acceder a la cámara. Sube una imagen.',
    notFound: 'No se encontró ningún código QR en la imagen.',
    pointCam: 'Apunta la cámara a un código QR',
    types: { url: 'Enlace', email: 'Correo', tel: 'Teléfono', wifi: 'Red Wi-Fi', geo: 'Ubicación', text: 'Texto' },
    install: 'Instalar app',
    privacy: 'Todo ocurre en tu navegador. Nada se sube a ningún servidor.',
  },
  en: {
    tagline: 'Read a QR code: scan with the camera or upload an image.',
    scan: 'Scan with camera',
    stop: 'Stop',
    upload: 'Upload image',
    result: 'Code content',
    open: 'Open link',
    call: 'Call',
    email: 'Send email',
    copy: 'Copy',
    copied: 'Copied',
    again: 'Scan another',
    noCam: 'Could not access the camera. Upload an image instead.',
    notFound: 'No QR code found in the image.',
    pointCam: 'Point the camera at a QR code',
    types: { url: 'Link', email: 'Email', tel: 'Phone', wifi: 'Wi-Fi network', geo: 'Location', text: 'Text' },
    install: 'Install app',
    privacy: 'Everything happens in your browser. Nothing is uploaded to any server.',
  },
}
const LANG_KEY = 'qrreader.lang'
let lang = (localStorage.getItem(LANG_KEY) || (navigator.language || 'es').slice(0, 2)) === 'en' ? 'en' : 'es'
const t = () => I18N[lang]

/* ---------------- Detección de tipo de contenido ---------------- */
function classify(raw) {
  const s = raw.trim()
  if (/^https?:\/\//i.test(s)) return { type: 'url', href: s }
  if (/^mailto:/i.test(s) || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) return { type: 'email', href: s.startsWith('mailto:') ? s : 'mailto:' + s }
  if (/^tel:/i.test(s) || /^\+?[\d\s().-]{6,}$/.test(s)) return { type: 'tel', href: s.startsWith('tel:') ? s : 'tel:' + s.replace(/\s/g, '') }
  if (/^WIFI:/i.test(s)) return { type: 'wifi', wifi: parseWifi(s) }
  if (/^geo:/i.test(s)) return { type: 'geo', href: 'https://maps.google.com/?q=' + s.slice(4) }
  return { type: 'text' }
}
function parseWifi(s) {
  const m = (k) => (s.match(new RegExp(k + ':([^;]*)', 'i')) || [])[1] || ''
  return { ssid: m('S'), type: m('T') || 'WPA', pass: m('P') }
}

/* ---------------- UI ---------------- */
const app = document.getElementById('app')

function render(state = {}) {
  const _ = t()
  app.innerHTML = `
    <header class="topbar">
      <div class="brand">
        <img src="/icon.svg" alt="" width="30" height="30" />
        <span>QR Reader</span>
      </div>
      <div class="actions">
        <div class="lang" role="group" aria-label="es / en">
          <button data-lang="es" class="${lang === 'es' ? 'on' : ''}">ES</button>
          <button data-lang="en" class="${lang === 'en' ? 'on' : ''}">EN</button>
        </div>
        <dotrino-install lang="${lang}" label="${_.install}"></dotrino-install>
        <dotrino-support
          href="https://ko-fi.com/dotrino"
          repo="imdotrino/dotrino-qrreader"
          discord="https://discord.gg/D648uq7cth"
          lang="${lang}"></dotrino-support>
      </div>
    </header>

    <main class="wrap">
      <h1 class="tagline">${_.tagline}</h1>

      <div class="stage" id="stage">
        ${state.result != null ? resultCard(state.result) : scanCard(state)}
      </div>

      <p class="privacy">${_.privacy}</p>
    </main>
    <input type="file" id="file" accept="image/*" hidden />
  `
  wire(state)
}

function scanCard(state) {
  const _ = t()
  return `
    <div class="card scan-card">
      <div class="viewport ${state.scanning ? 'live' : ''}">
        <video id="video" playsinline ${state.scanning ? '' : 'hidden'}></video>
        ${state.scanning ? `<div class="reticle"></div><p class="hint">${_.pointCam}</p>` : `<div class="placeholder">${qrGlyph()}</div>`}
      </div>
      ${state.error ? `<p class="error">${state.error}</p>` : ''}
      <div class="btn-row">
        ${state.scanning
          ? `<button class="btn btn-ghost" data-act="stop">${_.stop}</button>`
          : `<button class="btn btn-primary" data-act="scan">${camIcon()} ${_.scan}</button>`}
        <button class="btn btn-ghost" data-act="upload">${imgIcon()} ${_.upload}</button>
      </div>
    </div>`
}

function resultCard(res) {
  const _ = t()
  const c = classify(res)
  const badge = _.types[c.type]
  let primary = ''
  if (c.type === 'url' || c.type === 'geo') primary = `<a class="btn btn-primary" href="${escAttr(c.href)}" target="_blank" rel="noopener noreferrer">${linkIcon()} ${_.open}</a>`
  else if (c.type === 'tel') primary = `<a class="btn btn-primary" href="${escAttr(c.href)}">${_.call}</a>`
  else if (c.type === 'email') primary = `<a class="btn btn-primary" href="${escAttr(c.href)}">${_.email}</a>`

  const body = c.type === 'wifi'
    ? `<div class="wifi"><div><span>SSID</span><b>${esc(c.wifi.ssid)}</b></div><div><span>${c.wifi.type}</span><b>${esc(c.wifi.pass)}</b></div></div>`
    : `<pre class="content" data-testid="qr-content">${esc(res)}</pre>`

  return `
    <div class="card result-card" data-testid="qr-result">
      <div class="badge">${badge}</div>
      ${body}
      <div class="btn-row">
        ${primary}
        <button class="btn btn-ghost" data-act="copy" data-copy="${escAttr(res)}">${copyIcon()} ${_.copy}</button>
      </div>
      <button class="btn btn-link" data-act="again">${_.again}</button>
    </div>`
}

/* ---------------- Cableado / lógica ---------------- */
let stream = null
let rafId = 0
let detector = null

function wire(state) {
  app.querySelectorAll('[data-lang]').forEach((b) =>
    b.addEventListener('click', () => { lang = b.dataset.lang; localStorage.setItem(LANG_KEY, lang); document.documentElement.lang = lang; stopScan(); render() }))

  const file = app.querySelector('#file')
  file?.addEventListener('change', (e) => {
    const f = e.target.files?.[0]
    if (f) decodeImageFile(f)
  })

  app.querySelectorAll('[data-act]').forEach((el) => {
    el.addEventListener('click', () => {
      const act = el.dataset.act
      if (act === 'scan') startScan()
      else if (act === 'stop') { stopScan(); render() }
      else if (act === 'upload') file.click()
      else if (act === 'again') { stopScan(); render() }
      else if (act === 'copy') copy(el.dataset.copy, el)
    })
  })

  if (state.scanning) startVideoLoop()
}

async function startScan() {
  stopScan()
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
    render({ scanning: true })
  } catch {
    render({ error: t().noCam })
  }
}

function startVideoLoop() {
  const video = app.querySelector('#video')
  if (!video || !stream) return
  video.srcObject = stream
  video.play().catch(() => {})
  if ('BarcodeDetector' in window && !detector) {
    try { detector = new window.BarcodeDetector({ formats: ['qr_code'] }) } catch { detector = null }
  }
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d', { willReadFrequently: true })

  const tick = async () => {
    if (!stream) return
    if (video.readyState >= 2) {
      let found = null
      if (detector) {
        try { const codes = await detector.detect(video); if (codes[0]) found = codes[0].rawValue } catch { /* sigue con jsQR */ }
      }
      if (!found) {
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        if (canvas.width && canvas.height) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
          const img = ctx.getImageData(0, 0, canvas.width, canvas.height)
          const code = jsQR(img.data, img.width, img.height)
          if (code?.data) found = code.data
        }
      }
      if (found) { stopScan(); render({ result: found }); return }
    }
    rafId = requestAnimationFrame(tick)
  }
  rafId = requestAnimationFrame(tick)
}

function stopScan() {
  cancelAnimationFrame(rafId); rafId = 0
  if (stream) { stream.getTracks().forEach((tr) => tr.stop()); stream = null }
}

function decodeImageFile(f) {
  const url = URL.createObjectURL(f)
  const img = new Image()
  img.onload = () => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    ctx.drawImage(img, 0, 0)
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const code = jsQR(data.data, data.width, data.height)
    URL.revokeObjectURL(url)
    if (code?.data) render({ result: code.data })
    else render({ error: t().notFound })
  }
  img.onerror = () => { URL.revokeObjectURL(url); render({ error: t().notFound }) }
  img.src = url
}

function copy(text, btn) {
  navigator.clipboard?.writeText(text).then(() => {
    const old = btn.innerHTML
    btn.innerHTML = copyIcon() + ' ' + t().copied
    setTimeout(() => { btn.innerHTML = old }, 1500)
  }).catch(() => {})
}

/* ---------------- helpers / iconos ---------------- */
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const escAttr = (s) => esc(s).replace(/"/g, '&quot;')
const camIcon = () => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>'
const imgIcon = () => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>'
const linkIcon = () => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.5 1.5"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7L12 19"/></svg>'
const copyIcon = () => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>'
const qrGlyph = () => '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3 3h7v7H3zm2 2v3h3V5zm7-2h0M3 14h7v7H3zm2 2v3h3v-3zm9-13h7v7h-7zm2 2v3h3V5zm-5 9h2v2h-2zm0 4h2v2h-2zm4-4h2v2h-2zm4 0h2v2h-2zm-4 4h2v2h-2zm4 0h2v2h-2z"/></svg>'

document.documentElement.lang = lang
render()
