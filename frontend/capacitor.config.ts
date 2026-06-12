import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.qingyue.zhiheng',
  appName: '青跃智衡早筛端',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
