const fs = require('fs');
const path = require('path');

const parseEnvFile = (filePath) => {
  const env = {};
  if (!fs.existsSync(filePath)) return env;
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    if (!line || line.startsWith('#')) continue;
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim();
      env[key] = value;
    }
  }
  return env;
};

const env = parseEnvFile(path.resolve(__dirname, '.env'));

const firebase = {
  apiKey: env.FIREBASE_API_KEY || '',
  authDomain: env.FIREBASE_AUTH_DOMAIN || '',
  projectId: env.FIREBASE_PROJECT_ID || '',
  storageBucket: env.FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: env.FIREBASE_MESSAGING_SENDER_ID || '',
  appId: env.FIREBASE_APP_ID || '',
  measurementId: env.FIREBASE_MEASUREMENT_ID || '',
};

const openRouteService = {
  apiKey: env.ORS_API_KEY || '',
};

module.exports = ({ config }) => ({
  ...config,
  extra: {
    ...(config.extra || {}),
    firebase,
    openRouteService,
  },
});
