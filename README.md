# MySkinAnalyzer — MVP

Análisis facial orientativo y seguimiento de cambios visibles en la piel mediante fotografías
estandarizadas. Todo el procesamiento del MVP ocurre **localmente en el dispositivo** (navegador
o WebView de la app móvil vía Capacitor); no se usa ninguna API de IA de pago ni se sube ninguna
fotografía a un servidor.

Ver `MySkinAnalyzer_Arquitectura_MVP.md` (carpeta raíz de outputs) para el documento completo de
arquitectura, alcance, algoritmos por métrica, modelo de datos y fases de desarrollo.

## Stack

React + TypeScript + Vite · MediaPipe Face Landmarker (WASM) · OpenCV.js (WASM, en Web Worker) ·
Capacitor (empaquetado a iOS/Android sin reescribir la app) · IndexedDB (persistencia local del MVP).

## Requisitos previos

- Node.js 18+
- Un navegador con soporte de `getUserMedia`, Web Workers con `OffscreenCanvas` y WASM (Chrome,
  Safari y Edge recientes; para probar el flujo de cámara se necesita HTTPS o `localhost`).

## Instalación y ejecución (web)

```bash
npm install
npm run dev
```

Antes de la primera ejecución, descarga el modelo `face_landmarker.task` de MediaPipe y colócalo
en `public/models/` (ver `public/models/README.md`). Mientras tanto, `faceLandmarker.ts` puede
apuntarse temporalmente a la ruta del modelo en el CDN de MediaPipe para pruebas rápidas.

## Empaquetado móvil (Capacitor)

```bash
npm run build
npx cap add ios
npx cap add android
npm run cap:sync
npm run cap:ios      # abre Xcode
npm run cap:android  # abre Android Studio
```

Agrega los permisos de cámara nativos antes de compilar:

- **iOS** (`ios/App/App/Info.plist`): `NSCameraUsageDescription`.
- **Android** (`android/app/src/main/AndroidManifest.xml`): `<uses-permission android:name="android.permission.CAMERA" />`.

## Estructura del proyecto

Ver la sección 7 del documento de arquitectura para el árbol completo comentado. Resumen:

- `src/screens/` — las 6 pantallas del flujo (Home, Consentimiento, Captura, Procesando,
  Resultados, Historial deshabilitado).
- `src/lib/face/` — detección facial (MediaPipe), regiones faciales, validaciones de captura.
- `src/lib/vision/` — normalización de imagen y las 5 métricas del MVP, todo pensado para correr
  dentro de `src/workers/analysis.worker.ts` con OpenCV.js.
- `src/lib/scoring/` — sistema de confianza/calidad y formato del resultado (JSON).
- `src/lib/comparison/` — comparación básica entre sesiones con umbral mínimo de cambio relevante.
- `src/lib/storage/` — persistencia local (IndexedDB) y borrador de sesión en memoria durante la captura.

## Qué incluye este MVP

Captura guiada de 3 fotografías (frontal, 45° izquierda, 45° derecha) con validación automática de
calidad en tiempo real, normalización de imagen, segmentación por regiones faciales y cálculo de
5 métricas: uniformidad del tono, rojeces, brillo/sebo, textura superficial y poros aparentes.
Cada métrica se presenta con su nivel de confianza y sus limitaciones. Se incluye comparación
básica entre sesiones guardadas localmente.

## Qué NO incluye (pospuesto a v2/v3)

Perfiles de cliente, reportes PDF, sincronización con Supabase, backend FastAPI, arrugas
avanzadas, pigmentación avanzada, edad estimada de la piel, hidratación estimada, daño solar
estimado, y captura con luz UV/polarizada. Ver secciones 12-19 del documento de arquitectura.

## Nota sobre los umbrales de los algoritmos

Los umbrales en `captureValidations.ts` y en cada métrica de `src/lib/vision/metrics/` están
marcados como "calibrados empíricamente" — son puntos de partida razonables, no valores
definitivos. Deben ajustarse con un set real de fotos de prueba antes de considerar el MVP listo
para usuarios reales.
