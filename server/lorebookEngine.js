/**
 * Long Voyage - Modern AI Roleplay Lorebook Engine
 * Implements Multi-Pattern Keyword Matching, Selective AND-Logic,
 * Recursive Scanning, and Canon Lock Enforcement.
 * Based on: "AI Roleplay System Architecture" & "WILL Hero Academy Worldbook"
 */

class LorebookEngine {
  constructor() {
    this.maxRecursionDepth = 2;
  }

  /**
   * Normalize search text
   */
  normalizeText(text) {
    if (!text || typeof text !== 'string') return '';
    return text.toLowerCase();
  }

  /**
   * Match a single Lorebook entry against text
   */
  matchEntry(entry, textNorm) {
    if (!entry) return false;

    // Constant match is always active
    if (entry.mode === 'constant' || entry.always_active) {
      return true;
    }

    if (!entry.keys || !entry.keys.length) return false;

    // 1. Primary keys match (OR logic: at least one primary key must exist)
    const hasPrimaryKey = entry.keys.some(k => textNorm.includes(this.normalizeText(k)));
    if (!hasPrimaryKey) return false;

    // 2. Selective matching (AND logic: if secondary keys defined, at least one must also exist)
    if (entry.mode === 'selective' && entry.secondary_keys && entry.secondary_keys.length > 0) {
      const hasSecondaryKey = entry.secondary_keys.some(sk => textNorm.includes(this.normalizeText(sk)));
      if (!hasSecondaryKey) return false;
    }

    return true;
  }

  /**
   * Multi-pattern scan with recursive entry activation
   */
  scan(text, lorebookEntries = [], currentDepth = 0) {
    if (!text || !lorebookEntries || !lorebookEntries.length) return [];

    const textNorm = this.normalizeText(text);
    const activatedEntries = new Map();

    // 1. First pass: Scan incoming text
    for (const entry of lorebookEntries) {
      if (this.matchEntry(entry, textNorm)) {
        activatedEntries.set(entry.id, entry);
      }
    }

    // 2. Recursive pass: Scan activated entry contents for further triggers
    if (currentDepth < this.maxRecursionDepth) {
      let newlyActivated = [];
      for (const entry of activatedEntries.values()) {
        if (entry.recursion !== false && entry.content) {
          const entryContentNorm = this.normalizeText(entry.content);
          for (const otherEntry of lorebookEntries) {
            if (!activatedEntries.has(otherEntry.id) && this.matchEntry(otherEntry, entryContentNorm)) {
              newlyActivated.push(otherEntry);
              activatedEntries.set(otherEntry.id, otherEntry);
            }
          }
        }
      }
    }

    // 3. Sort by priority descending
    const result = Array.from(activatedEntries.values());
    result.sort((a, b) => (b.priority || 10) - (a.priority || 10));

    return result;
  }

  /**
   * Canon Locks Verifier (52 Rules from WILL Worldbook)
   * Scans text to check for narrative integrity violations
   */
  verifyCanonLocks(text, canonLocks = []) {
    if (!text || !canonLocks || !canonLocks.length) return { compliant: true, violations: [] };

    const textNorm = this.normalizeText(text);
    const violations = [];

    for (const lock of canonLocks) {
      // If forbidden keywords/patterns exist without required qualifiers
      if (lock.forbidden_patterns && lock.forbidden_patterns.length) {
        for (const pattern of lock.forbidden_patterns) {
          if (textNorm.includes(this.normalizeText(pattern))) {
            violations.push({
              lockId: lock.id,
              rule: lock.rule,
              severity: lock.severity || 'warning'
            });
          }
        }
      }
    }

    return {
      compliant: violations.length === 0,
      violations
    };
  }
}

module.exports = LorebookEngine;
