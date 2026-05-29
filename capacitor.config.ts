import type { CapacitorConfig } from '@capacitor/cli';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

function readEnvValue(name: string): string | undefined {
  if (process.env[name]) return process.env[name];

  for (const fileName of ['.env.local', '.env']) {
    const filePath = resolve(process.cwd(), fileName);
    if (!existsSync(filePath)) continue;

    const line = readFileSync(filePath, 'utf8')
      .split('\n')
      .find((entry) => entry.trim().startsWith(`${name}=`));
    if (!line) continue;

    return line.split('=').slice(1).join('=').trim().replace(/^"|"$/g, '');
  }

  return undefined;
}

const serverUrl = readEnvValue('CAPACITOR_SERVER_URL');

const config: CapacitorConfig = {
  appId: 'com.rbalbi.gearlife',
  appName: 'GearLife',
  webDir: 'public',
  server: serverUrl
    ? {
        url: serverUrl,
        cleartext: serverUrl.startsWith('http://'),
      }
    : undefined,
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: '#ffffff',
      androidSplashResourceName: 'splash',
      showSpinner: false,
    },
  },
};

export default config;
