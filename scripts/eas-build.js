#!/usr/bin/env node

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const [, , platform, profile = 'production'] = process.argv;

if (!['ios', 'android'].includes(platform)) {
  console.error('Usage: node scripts/eas-build.js <ios|android> [profile]');
  process.exit(1);
}

const buildNumbersPath = path.join(__dirname, '..', 'build-numbers.json');
const buildNumbers = JSON.parse(fs.readFileSync(buildNumbersPath, 'utf8'));

if (platform === 'ios') {
  buildNumbers.iosBuildNumber = Number(buildNumbers.iosBuildNumber ?? 0) + 1;
} else {
  buildNumbers.androidVersionCode = Number(buildNumbers.androidVersionCode ?? 0) + 1;
}

fs.writeFileSync(buildNumbersPath, `${JSON.stringify(buildNumbers, null, 2)}\n`);

const env = {
  ...process.env,
  IOS_BUILD_NUMBER: String(buildNumbers.iosBuildNumber),
  ANDROID_VERSION_CODE: String(buildNumbers.androidVersionCode),
};

console.log(
  `Building ${platform} with iOS build ${env.IOS_BUILD_NUMBER} and Android versionCode ${env.ANDROID_VERSION_CODE}`
);

const result = spawnSync(
  'eas',
  ['build', '--profile', profile, '--platform', platform],
  { stdio: 'inherit', env }
);

process.exit(result.status ?? 1);
