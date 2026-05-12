import { PlaywrightTestConfig } from '@playwright/test';
const config: PlaywrightTestConfig = {
  testDir: './tests',
  timeout: 30000,
  expect: { timeout: 5000 },
  reporter: [['html'], ['list']],
  use: { actionTimeout: 0, trace: 'on-first-retry' },
};
export default config;
