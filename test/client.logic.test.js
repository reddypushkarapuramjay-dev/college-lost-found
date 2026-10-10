const { describe, it } = require('node:test');
const assert = require('node:assert');

// Logic extracted from script.js for headless testing
const COLLEGE_DOMAIN = 'srkrec.ac.in';

function isValidEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

function isCollegeEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const trimmed = email.trim();
  const parts = trimmed.split('@');
  if (parts.length !== 2) return false;
  const username = parts[0];
  const domain = parts[1].toLowerCase();
  return domain === COLLEGE_DOMAIN && username.length > 0 && /^[^\s@]+$/.test(username);
}

function getAuthUserDetails(user) {
  if (!user) return { name: '', email: '' };

  let name = user.displayName || '';
  if (!name && Array.isArray(user.providerData)) {
    for (const p of user.providerData) {
      if (p && p.displayName) {
        name = p.displayName;
        break;
      }
    }
  }

  let email = user.email || '';
  if (!email && Array.isArray(user.providerData)) {
    for (const p of user.providerData) {
      if (p && p.email) {
        email = p.email;
        break;
      }
    }
  }

  if (!name && email) {
    name = email.split('@')[0];
  }

  return { name: name.trim(), email: email.trim() };
}

describe('Client-Side Logic & Authentication Validation Tests', () => {
  describe('isCollegeEmail Domain Verification', () => {
    it('accepts valid @srkrec.ac.in emails across different student rolls and departments', () => {
      assert.strictEqual(isCollegeEmail('student@srkrec.ac.in'), true);
      assert.strictEqual(isCollegeEmail('2024.ec.089@srkrec.ac.in'), true);
      assert.strictEqual(isCollegeEmail('faculty.cse@srkrec.ac.in'), true);
      assert.strictEqual(isCollegeEmail('21b91a0501@srkrec.ac.in'), true);
    });

    it('validates emails case-insensitively', () => {
      assert.strictEqual(isCollegeEmail('Student@SRKREC.AC.IN'), true);
      assert.strictEqual(isCollegeEmail('P.Reddy@Srkrec.Ac.In'), true);
    });

    it('rejects Gmail, Yahoo, Outlook, and non-college domains', () => {
      assert.strictEqual(isCollegeEmail('student@gmail.com'), false);
      assert.strictEqual(isCollegeEmail('user@yahoo.co.in'), false);
      assert.strictEqual(isCollegeEmail('test@outlook.com'), false);
      assert.strictEqual(isCollegeEmail('fake@srkrec.edu'), false);
      assert.strictEqual(isCollegeEmail('spoof@srkrec.ac.in.fake.com'), false);
    });

    it('rejects malformed or empty email addresses', () => {
      assert.strictEqual(isCollegeEmail(''), false);
      assert.strictEqual(isCollegeEmail(null), false);
      assert.strictEqual(isCollegeEmail(undefined), false);
      assert.strictEqual(isCollegeEmail('@srkrec.ac.in'), false);
      assert.strictEqual(isCollegeEmail('student@@srkrec.ac.in'), false);
      assert.strictEqual(isCollegeEmail('student srkrec.ac.in'), false);
    });
  });

  describe('getAuthUserDetails Identity Resolution', () => {
    it('uses Google displayName and email when present', () => {
      const user = {
        displayName: 'Pushkara Puramjay',
        email: 'puramjay@srkrec.ac.in'
      };
      const details = getAuthUserDetails(user);
      assert.strictEqual(details.name, 'Pushkara Puramjay');
      assert.strictEqual(details.email, 'puramjay@srkrec.ac.in');
    });

    it('falls back to username prefix when displayName is missing', () => {
      const user = {
        displayName: '',
        email: '2024.ece.042@srkrec.ac.in'
      };
      const details = getAuthUserDetails(user);
      assert.strictEqual(details.name, '2024.ece.042');
      assert.strictEqual(details.email, '2024.ece.042@srkrec.ac.in');
    });

    it('never uses "Demo Student" or hardcoded fallbacks', () => {
      const user = {
        displayName: null,
        email: 'student@srkrec.ac.in'
      };
      const details = getAuthUserDetails(user);
      assert.notStrictEqual(details.name, 'Demo Student');
      assert.strictEqual(details.name, 'student');
    });
  });
});
