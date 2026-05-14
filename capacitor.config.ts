import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.asthikasamaj.sandhyavandhanam',
  appName: 'Sandhyavandhanam',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_stat_logo',
      iconColor: '#FF9933',
    }
  }
};

export default config;
