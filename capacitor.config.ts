import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.myskinanalyzer.app',
  appName: 'MySkinAnalyzer',
  webDir: 'dist',
  plugins: {
    Camera: {
      // Permisos gestionados vía Info.plist / AndroidManifest, ver README.
    }
  }
};

export default config;
