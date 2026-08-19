import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.finwise.app',
  appName: 'FinWise',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;
