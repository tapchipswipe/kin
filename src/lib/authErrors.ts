/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/** Map Supabase auth errors to plain-language messages for non-technical users. */
export function plainAuthError(raw: string): string {
  const lower = raw.toLowerCase();
  if (lower.includes('invalid login credentials') || lower.includes('invalid email or password')) {
    return "That email and password don't match. Please try again.";
  }
  if (lower.includes('email not confirmed')) {
    return 'Please check your email and click the confirmation link first, then try signing in.';
  }
  if (lower.includes('user already registered')) {
    return 'An account with this email already exists. Try signing in instead.';
  }
  if (lower.includes('password') && lower.includes('least')) {
    return 'Please choose a password with at least 6 characters.';
  }
  if (lower.includes('rate limit') || lower.includes('too many')) {
    return 'Too many attempts. Please wait a few minutes and try again.';
  }
  if (lower.includes('invalid email')) {
    return 'Please enter a valid email address.';
  }
  if (lower.includes('signup') && lower.includes('disabled')) {
    return 'New accounts are not available right now. Please contact your family organizer.';
  }
  return 'Something went wrong. Please try again or ask a family member for help.';
}
