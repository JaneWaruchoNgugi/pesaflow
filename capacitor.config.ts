import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.finwise.app',
  appName: 'PesaFlow',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;
