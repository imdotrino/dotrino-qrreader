# QR Reader — Dotrino

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
