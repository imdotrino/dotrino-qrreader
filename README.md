# QR Reader — Dotrino

> **Parte del ecosistema [Dotrino](https://dotrino.com).** Dotrino es un ecosistema de aplicaciones centradas en la privacidad de los datos: tu información es tuya, y las decisiones sobre ella también — qué compartes, con quién, cuándo y por qué. Sin anuncios, sin cookies, sin rastreo de datos, sin vender tu identidad a nadie.

Lector de códigos QR simple y autohospedado del ecosistema **Dotrino**
(`qrreader.dotrino.com`). Escanea con la cámara o sube una imagen, muestra la
información decodificada, detecta el tipo (enlace, correo, teléfono, Wi-Fi,
ubicación, texto) y permite **abrir el enlace** o copiar el contenido.

**Todo ocurre en el navegador**: nada se sube a ningún servidor. Sin trackers de
terceros, sin cuentas, sin cookies. Filosofía Dotrino: *tu información, en tu
servidor, bajo tus reglas*.

## Cómo funciona

- **Cámara**: usa `BarcodeDetector` nativo cuando está disponible, con fallback a
  [`jsQR`](https://github.com/cozmo/jsQR) en un canvas.
- **Imagen**: decodifica el archivo con `jsQR`, sin subirlo a ningún lado.
- **Tipos**: clasifica el contenido (`http(s)`, `mailto:`/email, `tel:`/teléfono,
  `WIFI:`, `geo:`, texto) y ofrece la acción adecuada (abrir, llamar, escribir,
  copiar).

## Stack

Vite (sin framework) + PWA (`vite-plugin-pwa`). Web Components compartidos del
ecosistema: `<dotrino-support>` (soporte) y `<dotrino-install>` (instalar PWA).
Bilingüe es/en. Ver [`CONVENCIONES-APPS.md`](../CONVENCIONES-APPS.md).

## Desarrollo

```sh
npm install
npm run dev      # servidor de desarrollo
npm run build    # build a dist/ (lo despliega GitHub Actions)
```
