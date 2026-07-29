// MySkinAnalyzer — carga perezosa de OpenCV.js dentro del Web Worker.
// Se usa la build WASM oficial servida desde jsDelivr; para producción se
// recomienda auto-hospedarla (ver README) para no depender de un tercero.

declare const cv: any;

let loaded: Promise<void> | null = null;

export function loadOpenCv(): Promise<void> {
  if (loaded) return loaded;

  loaded = new Promise((resolve, reject) => {
    // @ts-ignore
    self.importScripts('https://docs.opencv.org/4.9.0/opencv.js');
    const check = () => {
      // @ts-ignore
      if (typeof cv !== 'undefined' && cv.Mat) {
        resolve();
      } else {
        setTimeout(check, 30);
      }
    };
    // @ts-ignore
    if (typeof cv !== 'undefined' && cv.onRuntimeInitialized) {
      // @ts-ignore
      cv.onRuntimeInitialized = () => resolve();
    } else {
      check();
    }
    setTimeout(() => reject(new Error('Timeout cargando OpenCV.js')), 15000);
  });

  return loaded;
}

export function getCv(): any {
  // @ts-ignore
  return cv;
}
