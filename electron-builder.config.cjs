const { name, version } = require('./package.json');

module.exports = {
  appId: 'dev.waveterm.app',
  productName: 'Wave Terminal - AI Kubernetes Terminal',
  copyright: 'Copyright © 2024 Command Line Inc.',
  directories: {
    output: 'make',
  },
  files: [
    'dist/**/*',
    'emain/**/*',
    'mcp-servers/**/*',
    'security-config.json',
    'node_modules/**/*',
    '!node_modules/@types/**/*',
    '!node_modules/.cache/**/*',
    'package.json'
  ],
  extraResources: [
    {
      from: 'dist/bin',
      to: 'bin',
      filter: ['**/*']
    }
  ],
  mac: {
    category: 'public.app-category.developer',
    target: [
      {
        target: 'dmg',
        arch: ['x64', 'arm64']
      }
    ],
    entitlements: 'build/entitlements.plist',
    entitlementsInherit: 'build/entitlements.plist',
    hardenedRuntime: true,
    gatekeeperAssess: false,
  },
  linux: {
    target: [
      {
        target: 'AppImage',
        arch: ['x64', 'arm64']
      },
      {
        target: 'deb',
        arch: ['x64', 'arm64']
      }
    ],
    category: 'Development',
    synopsis: 'AI-Enhanced Terminal with Multi-Agent System and Kubernetes Integration',
  },
  win: {
    target: [
      {
        target: 'nsis',
        arch: ['x64', 'arm64']
      }
    ],
    certificateFile: process.env.WIN_CSC_FILE,
    certificatePassword: process.env.WIN_CSC_KEY_PASSWORD,
  },
  nsis: {
    oneClick: false,
    perMachine: false,
    allowToChangeInstallationDirectory: true,
    deleteAppDataOnUninstall: false,
  },
  publish: {
    provider: 'generic',
    url: 'https://dl.waveterm.dev/releases/',
  },
};
