import { Amplify } from 'aws-amplify';
// amplify_outputs.json is generated from ../invoicesandexpensesbackend.
// It is gitignored; run `yarn sandbox` in the backend project to generate it locally.

try {
  const outputs = require('../../amplify_outputs.json');
  Amplify.configure(outputs.default ?? outputs);
} catch {
  console.warn('Amplify outputs not found. Run `yarn sandbox` in ../invoicesandexpensesbackend before using backend features.');
}
