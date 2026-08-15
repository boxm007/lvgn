/**
 * Long Voyage — Fate & Status Engine (Deterministic D20 Anti-Cheat System)
 * 100% Deterministic Code (No AI bias / No hallucinated dice numbers)
 */

class FateEngine {
  /**
   * Roll a D20 with character modifier and calculate outcome tier
   * @param {Object} options
   * @param {number} [options.modifier=0] Character stat modifier (e.g. +2 for strength)
   * @param {string} [options.statName='general'] Stat being tested
   * @param {number} [options.targetDC=12] Target Difficulty Class
   * @returns {Object} Deterministic roll outcome
   */
  static roll({ modifier = 0, statName = 'general', targetDC = 12 } = {}) {
    // True deterministic random integer from 1 to 20
    const d20 = Math.floor(Math.random() * 20) + 1;
    const total = d20 + modifier;

    let tier = 'success';
    let tier_th = 'สำเร็จ';
    let color = '#10b981'; // Emerald

    if (d20 === 1) {
      tier = 'critical_failure';
      tier_th = 'ล้มเหลวร้ายแรง (Critical Failure)';
      color = '#ef4444'; // Red
    } else if (d20 === 20) {
      tier = 'critical_success';
      tier_th = 'สำเร็จอย่างงดงาม (Critical Success)';
      color = '#f59e0b'; // Amber Gold
    } else if (total < targetDC) {
      tier = 'failure';
      tier_th = 'ล้มเหลว (Failure)';
      color = '#f97316'; // Orange
    } else {
      tier = 'success';
      tier_th = 'สำเร็จ (Success)';
      color = '#10b981'; // Emerald
    }

    const badgeText = `🎲 [D20: ${d20}] + [${statName}: ${modifier >= 0 ? '+' : ''}${modifier}] = ${total} (${tier_th})`;

    return {
      d20,
      modifier,
      statName,
      targetDC,
      total,
      tier,
      tier_th,
      color,
      badgeText,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Helper to extract character stat modifier
   * @param {Object} character 
   * @param {string} statKey 
   * @returns {number}
   */
  static getStatModifier(character, statKey = 'general') {
    if (!character || !character.static_profile || !character.static_profile.base_stats) {
      return 0;
    }
    const val = character.static_profile.base_stats[statKey.toLowerCase()];
    if (typeof val === 'number') {
      // D&D style stat modifier: (Stat - 10) / 2 or direct raw bonus
      return val > 10 ? Math.floor((val - 10) / 2) : (val <= 5 ? val : 0);
    }
    return 0;
  }
}

module.exports = FateEngine;
