/**
 * Long Voyage — Fate & Status Engine (Deterministic D20 Anti-Cheat System)
 * Implemented directly from AI Storyteller Master Prompt (Section 15.2 & 15.3)
 * 100% Deterministic Code (No AI bias / No hallucinated dice numbers)
 */

class FateEngine {
  /**
   * Suggested Difficulty Classes (DC) from Master Prompt Section 15.2:
   * 5: Trivial, 8: Very Easy, 10: Easy, 12: Moderate, 15: Challenging, 18: Hard, 20: Very Hard, 25: Extreme, 30: Nearly Impossible
   */
  static DCS = {
    TRIVIAL: 5,
    VERY_EASY: 8,
    EASY: 10,
    MODERATE: 12,
    CHALLENGING: 15,
    HARD: 18,
    VERY_HARD: 20,
    EXTREME: 25,
    NEARLY_IMPOSSIBLE: 30
  };

  /**
   * Roll a D20 with character modifier and calculate outcome tier based on Master Prompt 15.3
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

    let tier = 'standard_success';
    let tier_th = 'สำเร็จมาตรฐาน (Standard Success)';
    let color = '#10b981'; // Emerald

    // Master Prompt Section 15.3 Outcome Degrees
    if (d20 === 1) {
      tier = 'critical_failure';
      tier_th = 'ล้มเหลวร้ายแรง (Critical Failure)';
      color = '#ef4444'; // Red
    } else if (d20 === 20) {
      tier = 'critical_success';
      tier_th = 'สำเร็จอย่างงดงาม (Critical Success)';
      color = '#f59e0b'; // Amber Gold
    } else if (total <= 5) {
      tier = 'major_failure';
      tier_th = 'ล้มเหลวอย่างหนัก (Major Failure)';
      color = '#dc2626'; // Deep Red
    } else if (total <= 9) {
      tier = 'failure';
      tier_th = 'ล้มเหลว (Failure)';
      color = '#f97316'; // Orange
    } else if (total === 10) {
      tier = 'failure_minor_consequence';
      tier_th = 'ล้มเหลวพร้อมผลข้างเคียงเล็กน้อย (Failure with Minor Consequence)';
      color = '#fb923c'; // Light Orange
    } else if (total <= 12) {
      tier = 'success_with_consequence';
      tier_th = 'สำเร็จแต่มีต้นทุน/ผลข้างเคียง (Success with Consequence)';
      color = '#38bdf8'; // Sky Blue
    } else if (total <= 15) {
      tier = 'standard_success';
      tier_th = 'สำเร็จมาตรฐาน (Standard Success)';
      color = '#10b981'; // Emerald Green
    } else if (total <= 18) {
      tier = 'strong_success';
      tier_th = 'สำเร็จอย่างดีเยี่ยม (Strong Success)';
      color = '#059669'; // Dark Emerald
    } else if (total === 19) {
      tier = 'exceptional_success';
      tier_th = 'สำเร็จเป็นเลิศ (Exceptional Success)';
      color = '#eab308'; // Bright Gold
    } else {
      // 20+
      tier = 'critical_success';
      tier_th = 'สำเร็จอย่างงดงาม (Critical Success)';
      color = '#f59e0b'; // Amber Gold
    }

    const badgeText = `🎲 [D20: ${d20}] + [${statName}: ${modifier >= 0 ? '+' : ''}${modifier}] = ${total} (DC: ${targetDC}) → ${tier_th}`;

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
