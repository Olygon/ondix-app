export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 16;
export const PASSWORD_SPECIAL_CHARACTER_REGEX = /[^A-Za-z0-9]/;

export type PasswordStrength = "fraca" | "media" | "forte";

export function hasSpecialCharacter(value: string) {
  return PASSWORD_SPECIAL_CHARACTER_REGEX.test(value);
}

export function getPasswordStrength(value: string): PasswordStrength {
  let score = 0;

  if (value.length >= PASSWORD_MIN_LENGTH) score += 1;
  if (/[A-Z]/.test(value) && /[a-z]/.test(value)) score += 1;
  if (/\d/.test(value)) score += 1;
  if (hasSpecialCharacter(value)) score += 1;

  if (score >= 4 && value.length >= 12) {
    return "forte";
  }

  if (score >= 3) {
    return "media";
  }

  return "fraca";
}

export function validatePasswordPolicy(value: string) {
  return (
    value.length >= PASSWORD_MIN_LENGTH &&
    value.length <= PASSWORD_MAX_LENGTH &&
    hasSpecialCharacter(value)
  );
}
