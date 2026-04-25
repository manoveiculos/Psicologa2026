
export const ALLOWED_EMAILS = [
  'mayne.margadona@gmail.com',
  'alexandre.gorges@gmail.com'
];

export function isEmailAllowed(email?: string) {
  if (!email) return false;
  return ALLOWED_EMAILS.includes(email.toLowerCase());
}
