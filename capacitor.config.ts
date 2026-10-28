import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'in.pgcscorer.app',
  appName: 'ADS Falcons Scorer',
  webDir: 'dist',
  android: {
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 600,
      backgroundColor: '#0f3d2e',
      showSpinner: false,
    },
  },
};

export default config;
