import { Redirect } from 'expo-router';

// Legacy code-entry page. We use magic-link now, so this route just redirects home.
export default function LegacyVerifyScreen() {
  return <Redirect href="/" />;
}
