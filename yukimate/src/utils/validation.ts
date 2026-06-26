/**
 * Input validation utilities
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Email validation
 */
export const validateEmail = (email: string): ValidationResult => {
  if (!email || email.trim() === '') {
    return { isValid: false, error: 'メールアドレスを入力してください' };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, error: '有効なメールアドレスを入力してください' };
  }

  return { isValid: true };
};

/**
 * Password validation
 * Requirements:
 * - At least 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 */
export const validatePassword = (password: string): ValidationResult => {
  if (!password || password.trim() === '') {
    return { isValid: false, error: 'パスワードを入力してください' };
  }

  if (password.length < 8) {
    return { isValid: false, error: 'パスワードは8文字以上である必要があります' };
  }

  if (!/[A-Z]/.test(password)) {
    return { isValid: false, error: 'パスワードには大文字を含める必要があります' };
  }

  if (!/[a-z]/.test(password)) {
    return { isValid: false, error: 'パスワードには小文字を含める必要があります' };
  }

  if (!/[0-9]/.test(password)) {
    return { isValid: false, error: 'パスワードには数字を含める必要があります' };
  }

  return { isValid: true };
};

/**
 * Password confirmation validation
 */
export const validatePasswordConfirmation = (
  password: string,
  confirmation: string
): ValidationResult => {
  if (!confirmation || confirmation.trim() === '') {
    return { isValid: false, error: 'パスワード（確認）を入力してください' };
  }

  if (password !== confirmation) {
    return { isValid: false, error: 'パスワードが一致しません' };
  }

  return { isValid: true };
};

/**
 * Display name validation
 */
export const validateDisplayName = (displayName: string): ValidationResult => {
  if (!displayName || displayName.trim() === '') {
    return { isValid: false, error: '表示名を入力してください' };
  }

  if (displayName.length < 2) {
    return { isValid: false, error: '表示名は2文字以上である必要があります' };
  }

  if (displayName.length > 50) {
    return { isValid: false, error: '表示名は50文字以内である必要があります' };
  }

  return { isValid: true };
};

/**
 * Text content validation (for posts, comments, etc.)
 */
export const validateTextContent = (
  text: string,
  minLength: number = 1,
  maxLength: number = 1000
): ValidationResult => {
  if (!text || text.trim() === '') {
    return { isValid: false, error: 'テキストを入力してください' };
  }

  if (text.length < minLength) {
    return { isValid: false, error: `テキストは${minLength}文字以上である必要があります` };
  }

  if (text.length > maxLength) {
    return { isValid: false, error: `テキストは${maxLength}文字以内である必要があります` };
  }

  return { isValid: true };
};

/**
 * URL validation
 */
export const validateUrl = (url: string): ValidationResult => {
  if (!url || url.trim() === '') {
    return { isValid: false, error: 'URLを入力してください' };
  }

  try {
    new URL(url);
    return { isValid: true };
  } catch {
    return { isValid: false, error: '有効なURLを入力してください' };
  }
};

/**
 * File size validation (in bytes)
 */
export const validateFileSize = (
  sizeInBytes: number,
  maxSizeInMB: number = 10
): ValidationResult => {
  const maxSizeInBytes = maxSizeInMB * 1024 * 1024;

  if (sizeInBytes > maxSizeInBytes) {
    return {
      isValid: false,
      error: `ファイルサイズは${maxSizeInMB}MB以下である必要があります`,
    };
  }

  return { isValid: true };
};

/**
 * Image file type validation
 */
export const validateImageFileType = (mimeType: string): ValidationResult => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

  if (!allowedTypes.includes(mimeType.toLowerCase())) {
    return {
      isValid: false,
      error: 'JPEG、PNG、またはWebP形式の画像のみアップロード可能です',
    };
  }

  return { isValid: true };
};

/**
 * Sanitize text input to prevent XSS
 */
export const sanitizeText = (text: string): string => {
  return text
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

/**
 * Get password strength
 */
export const getPasswordStrength = (password: string): 'weak' | 'medium' | 'strong' => {
  let strength = 0;

  if (password.length >= 8) strength++;
  if (password.length >= 12) strength++;
  if (/[A-Z]/.test(password)) strength++;
  if (/[a-z]/.test(password)) strength++;
  if (/[0-9]/.test(password)) strength++;
  if (/[^A-Za-z0-9]/.test(password)) strength++;

  if (strength <= 2) return 'weak';
  if (strength <= 4) return 'medium';
  return 'strong';
};
