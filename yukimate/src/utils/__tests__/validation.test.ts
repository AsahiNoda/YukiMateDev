import {
  validateEmail,
  validatePassword,
  validatePasswordConfirmation,
  validateDisplayName,
  validateTextContent,
  validateUrl,
  validateFileSize,
  validateImageFileType,
  sanitizeText,
  getPasswordStrength,
} from '../validation';

describe('Validation Utils', () => {
  describe('validateEmail', () => {
    it('should validate correct email addresses', () => {
      expect(validateEmail('test@example.com').isValid).toBe(true);
      expect(validateEmail('user.name@domain.co.jp').isValid).toBe(true);
      expect(validateEmail('valid+email@test.com').isValid).toBe(true);
    });

    it('should reject invalid email addresses', () => {
      expect(validateEmail('').isValid).toBe(false);
      expect(validateEmail('invalid').isValid).toBe(false);
      expect(validateEmail('missing@domain').isValid).toBe(false);
      expect(validateEmail('@nodomain.com').isValid).toBe(false);
      expect(validateEmail('no-at-sign.com').isValid).toBe(false);
    });

    it('should return appropriate error messages', () => {
      expect(validateEmail('').error).toBe('メールアドレスを入力してください');
      expect(validateEmail('invalid').error).toBe('有効なメールアドレスを入力してください');
    });
  });

  describe('validatePassword', () => {
    it('should validate strong passwords', () => {
      expect(validatePassword('Password1').isValid).toBe(true);
      expect(validatePassword('StrongPass123').isValid).toBe(true);
      expect(validatePassword('MySecure1Password').isValid).toBe(true);
    });

    it('should reject weak passwords', () => {
      expect(validatePassword('').isValid).toBe(false);
      expect(validatePassword('short1').isValid).toBe(false);
      expect(validatePassword('alllowercase1').isValid).toBe(false);
      expect(validatePassword('ALLUPPERCASE1').isValid).toBe(false);
      expect(validatePassword('NoNumbers').isValid).toBe(false);
    });

    it('should return appropriate error messages', () => {
      expect(validatePassword('').error).toBe('パスワードを入力してください');
      expect(validatePassword('short').error).toBe('パスワードは8文字以上である必要があります');
      expect(validatePassword('lowercase1').error).toBe('パスワードには大文字を含める必要があります');
      expect(validatePassword('UPPERCASE1').error).toBe('パスワードには小文字を含める必要があります');
      expect(validatePassword('NoNumbers').error).toBe('パスワードには数字を含める必要があります');
    });
  });

  describe('validatePasswordConfirmation', () => {
    it('should validate matching passwords', () => {
      expect(validatePasswordConfirmation('Password1', 'Password1').isValid).toBe(true);
    });

    it('should reject non-matching passwords', () => {
      expect(validatePasswordConfirmation('Password1', 'Password2').isValid).toBe(false);
      expect(validatePasswordConfirmation('Password1', '').isValid).toBe(false);
    });

    it('should return appropriate error messages', () => {
      expect(validatePasswordConfirmation('Password1', '').error).toBe(
        'パスワード（確認）を入力してください'
      );
      expect(validatePasswordConfirmation('Password1', 'Different1').error).toBe(
        'パスワードが一致しません'
      );
    });
  });

  describe('validateDisplayName', () => {
    it('should validate correct display names', () => {
      expect(validateDisplayName('John').isValid).toBe(true);
      expect(validateDisplayName('スノーボーダー').isValid).toBe(true);
      expect(validateDisplayName('Test User 123').isValid).toBe(true);
    });

    it('should reject invalid display names', () => {
      expect(validateDisplayName('').isValid).toBe(false);
      expect(validateDisplayName('A').isValid).toBe(false);
      expect(validateDisplayName('A'.repeat(51)).isValid).toBe(false);
    });

    it('should return appropriate error messages', () => {
      expect(validateDisplayName('').error).toBe('表示名を入力してください');
      expect(validateDisplayName('A').error).toBe('表示名は2文字以上である必要があります');
      expect(validateDisplayName('A'.repeat(51)).error).toBe(
        '表示名は50文字以内である必要があります'
      );
    });
  });

  describe('validateTextContent', () => {
    it('should validate text within length limits', () => {
      expect(validateTextContent('Valid text', 1, 100).isValid).toBe(true);
      expect(validateTextContent('Hello', 5, 10).isValid).toBe(true);
    });

    it('should reject text outside length limits', () => {
      expect(validateTextContent('', 1, 100).isValid).toBe(false);
      expect(validateTextContent('Short', 10, 100).isValid).toBe(false);
      expect(validateTextContent('Too long text', 1, 5).isValid).toBe(false);
    });
  });

  describe('validateUrl', () => {
    it('should validate correct URLs', () => {
      expect(validateUrl('https://example.com').isValid).toBe(true);
      expect(validateUrl('http://test.com/page').isValid).toBe(true);
      expect(validateUrl('https://domain.co.jp/path?query=value').isValid).toBe(true);
    });

    it('should reject invalid URLs', () => {
      expect(validateUrl('').isValid).toBe(false);
      expect(validateUrl('not-a-url').isValid).toBe(false);
      expect(validateUrl('missing-protocol.com').isValid).toBe(false);
    });
  });

  describe('validateFileSize', () => {
    it('should validate files within size limit', () => {
      expect(validateFileSize(1024, 10).isValid).toBe(true); // 1KB < 10MB
      expect(validateFileSize(5 * 1024 * 1024, 10).isValid).toBe(true); // 5MB < 10MB
    });

    it('should reject files exceeding size limit', () => {
      expect(validateFileSize(11 * 1024 * 1024, 10).isValid).toBe(false); // 11MB > 10MB
      expect(validateFileSize(20 * 1024 * 1024, 10).isValid).toBe(false); // 20MB > 10MB
    });

    it('should return appropriate error message', () => {
      expect(validateFileSize(11 * 1024 * 1024, 10).error).toBe(
        'ファイルサイズは10MB以下である必要があります'
      );
    });
  });

  describe('validateImageFileType', () => {
    it('should validate allowed image types', () => {
      expect(validateImageFileType('image/jpeg').isValid).toBe(true);
      expect(validateImageFileType('image/jpg').isValid).toBe(true);
      expect(validateImageFileType('image/png').isValid).toBe(true);
      expect(validateImageFileType('image/webp').isValid).toBe(true);
      expect(validateImageFileType('IMAGE/JPEG').isValid).toBe(true); // Case insensitive
    });

    it('should reject disallowed file types', () => {
      expect(validateImageFileType('image/gif').isValid).toBe(false);
      expect(validateImageFileType('image/bmp').isValid).toBe(false);
      expect(validateImageFileType('application/pdf').isValid).toBe(false);
      expect(validateImageFileType('text/plain').isValid).toBe(false);
    });

    it('should return appropriate error message', () => {
      expect(validateImageFileType('image/gif').error).toBe(
        'JPEG、PNG、またはWebP形式の画像のみアップロード可能です'
      );
    });
  });

  describe('sanitizeText', () => {
    it('should sanitize HTML special characters', () => {
      expect(sanitizeText('<script>alert("XSS")</script>')).toBe(
        '&lt;script&gt;alert(&quot;XSS&quot;)&lt;&#x2F;script&gt;'
      );
      expect(sanitizeText('Test <b>bold</b>')).toBe('Test &lt;b&gt;bold&lt;&#x2F;b&gt;');
      expect(sanitizeText("It's a test")).toBe('It&#x27;s a test');
    });

    it('should handle empty strings', () => {
      expect(sanitizeText('')).toBe('');
    });

    it('should not modify safe text', () => {
      expect(sanitizeText('Safe text 123')).toBe('Safe text 123');
    });
  });

  describe('getPasswordStrength', () => {
    it('should return "weak" for weak passwords', () => {
      expect(getPasswordStrength('pass')).toBe('weak');
      expect(getPasswordStrength('password')).toBe('weak');
    });

    it('should return "medium" for medium passwords', () => {
      expect(getPasswordStrength('Password1')).toBe('medium');
      expect(getPasswordStrength('MyPass123')).toBe('medium');
    });

    it('should return "strong" for strong passwords', () => {
      expect(getPasswordStrength('MyStrongPass123!')).toBe('strong');
      expect(getPasswordStrength('Secure@Password2024')).toBe('strong');
    });
  });
});
