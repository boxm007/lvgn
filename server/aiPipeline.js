const config = require('./config');
const db = require('./db');
const FateEngine = require('./fateEngine');
const {
  getContextExtractorPrompt,
  getReasoningPrompt,
  getStorytellerSystemPrompt,
  getStorytellerUserPrompt,
  getMemorySummaryPrompt,
  getWorldbookAnalyzerPrompt,
  getPrologueGeneratorPrompt
} = require('./prompts');

/**
 * Call DeepSeek Chat API
 */
async function callDeepSeek({ messages, temperature = 0.85, max_tokens = 500, response_format = null }) {
  const settings = db.getSettings();
  const apiKey = settings.apiKey || config.deepseek.apiKey;
  const baseURL = (settings.baseURL || config.deepseek.baseURL).replace(/\/+$/, '');
  const model = settings.model || config.deepseek.model || 'deepseek-chat';

  const body = {
    model: model,
    messages: messages,
    temperature: typeof temperature === 'number' ? temperature : 0.85,
    max_tokens: max_tokens || 500
  };

  if (response_format) {
    body.response_format = response_format;
  }

  const endpoint = `${baseURL}/chat/completions`;

  let lastErr = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`DeepSeek API error (${response.status}): ${errText}`);
      }

      const data = await response.json();
      if (!data.choices || data.choices.length === 0) {
        throw new Error('DeepSeek API returned empty choices');
      }

      return data.choices[0].message.content;
    } catch (err) {
      lastErr = err;
      if (attempt < 3) {
        await new Promise(r => setTimeout(r, 600 * attempt));
      }
    }
  }

  throw lastErr;
}

/**
 * Helper to clean and parse JSON from AI response
 */
function cleanAndParseJSON(rawText) {
  try {
    let clean = rawText.trim();
    clean = clean.replace(/```json\s*/gi, '').replace(/```\s*$/gi, '').trim();
    const firstBrace = clean.indexOf('{');
    const lastBrace = clean.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      clean = clean.substring(firstBrace, lastBrace + 1);
    }
    return JSON.parse(clean);
  } catch (err) {
    console.warn('Failed to parse clean JSON:', err.message);
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw err;
  }
}

/**
 * Helper: Generate Layer 1 Master Index (Lean Bible Architecture)
 */
function generateMasterIndex(world, character, slot) {
  const stats = character.static_profile?.base_stats || {};
  const discovered = slot.discovered_npcs || [];
  
  let indexText = `# WORLD INDEX — ${world.name}\n\n`;
  indexText += `## Characters\n| id | name | short_desc | role | rel_val |\n|---|---|---|---|---|\n`;
  indexText += `| ${character.id} | ${character.name} | ${character.short_desc || ''} | Main Character | ${slot.dynamic_state?.relationship_value || 0} |\n`;
  
  discovered.forEach(n => {
    indexText += `| ${n.id} | ${n.name} | ${n.brief_desc || ''} | ${n.role || 'NPC'} | ${n.relationship_value || 0} |\n`;
  });

  indexText += `\n## Player Stats Available\nSTR: ${stats.strength || 10}, AGI: ${stats.agility || 10}, INT: ${stats.intelligence || 10}, CHA: ${stats.charisma || 10}, PER: ${stats.perception || 10}\n`;

  if (slot.inventory && slot.inventory.length > 0) {
    indexText += `\n## Inventory Items\n${slot.inventory.map(i => `- ${i}`).join('\n')}\n`;
  }

  if (slot.codex_notes && slot.codex_notes.length > 0) {
    indexText += `\n## Secret Notes & Codex\n${slot.codex_notes.map(n => `- [${n.id}] ${n.title} (สถานะ: ${n.unlocked ? 'ปลดล็อกแล้ว' : 'ล็อกอยู่'})`).join('\n')}\n`;
  }

  indexText += `\n## Current State Summary\nอารมณ์ของ ${character.name}: ${slot.dynamic_state?.current_emotion || 'ปกติ'}, ความผูกพัน: ${slot.dynamic_state?.relationship_status || 'เป็นกลาง'}\n`;

  return indexText;
}

/**
 * Execute 4-Stage Pipeline for a single turn (Speed-Optimized & Folder-Isolated)
 */
async function executeTurnPipeline({ slotId, playerInput, customRoll = null }) {
  // Step 0: Save Snapshot before executing turn (Enables clean Undo / Rollback)
  db.pushSnapshot(slotId);

  const slot = db.getSaveSlotById(slotId);
  if (!slot) throw new Error('Save slot not found');

  const character = db.getCharacterById(slot.character_id);
  const world = db.getWorldById(slot.world_id);
  if (!character || !world) throw new Error('World or Character not found');

  const settings = db.getSettings();
  const stylePreset = slot.style_preset || {};
  const maxStoryTokens = parseInt(stylePreset.max_response_tokens || settings.maxTokens || 500, 10);

  // ==========================================
  // STAGE 1: AI #1 — Context Extractor (Layer 1 Master Index)
  // ==========================================
  let extractedContext = {
    action_type: playerInput.type.toLowerCase(),
    relevant_stat: playerInput.type === 'Do' ? 'strength' : 'charisma',
    relevant_characters: [character.id],
    relevant_inventory_items: [],
    potential_secret_flags: [],
    requires_roll: true
  };

  try {
    const masterIndex = generateMasterIndex(world, character, slot);
    const recentHistoryText = (slot.history || []).slice(-3).map(h => `[${h.role}]: ${h.content}`).join('\n');
    const extractorPrompt = getContextExtractorPrompt(playerInput, masterIndex, recentHistoryText);

    const extractorRes = await callDeepSeek({
      messages: [{ role: 'system', content: extractorPrompt }],
      temperature: 0.2,
      max_tokens: 300,
      response_format: { type: 'json_object' }
    });

    const parsedContext = cleanAndParseJSON(extractorRes);
    extractedContext = { ...extractedContext, ...parsedContext };
  } catch (err) {
    console.warn('AI #1 Extractor fallback:', err.message);
  }

  // ==========================================
  // DETERMINISTIC STAGE: Fate Engine (Pure JS/D20)
  // ==========================================
  const statToCheck = extractedContext.relevant_stat || (playerInput.type === 'Do' ? 'strength' : 'charisma');
  let modifier = 0;
  if (customRoll && typeof customRoll.modifier === 'number') {
    modifier = customRoll.modifier;
  } else {
    modifier = FateEngine.getStatModifier(character, statToCheck);
  }

  let fateResult = null;
  if (customRoll && customRoll.skipRoll) {
    fateResult = {
      d20: 10,
      modifier: 0,
      statName: 'none',
      total: 10,
      tier: 'success',
      tier_th: 'ดำเนินไปตามปกติ',
      color: '#60a5fa',
      badgeText: '🎲 ดำเนินการตามปกติ'
    };
  } else {
    fateResult = FateEngine.roll({
      modifier: modifier,
      statName: statToCheck,
      targetDC: 12
    });
  }

  // ==========================================
  // STAGE 2: AI #2 — Mechanical GM & Reasoning Engine
  // ==========================================
  let consequence = {
    roll_result: fateResult.tier,
    outcome_summary: 'การกระทำดำเนินต่อไป',
    consequence_summary: 'การสนทนาดำเนินต่อไป',
    state_changes: {
      relationship_deltas: [{ character_id: character.id, delta: 1, reason: 'ปฏิสัมพันธ์ทั่วไป' }],
      inventory_changes: [],
      emotion_updates: [{ character_id: character.id, new_emotion: slot.dynamic_state.current_emotion || 'ปกติ' }],
      secret_notes_unlocked: []
    },
    narrative_directives: {
      must_include: [],
      tone_hint: 'neutral'
    },
    discovered_npc: null
  };

  try {
    const knownNpcNames = (slot.discovered_npcs || []).map(n => n.name);
    const reasoningPrompt = getReasoningPrompt({
      playerInput,
      fateResult,
      activeCharacter: { ...character, dynamic_state: slot.dynamic_state },
      worldContext: world,
      relevantDetails: {
        inventory: extractedContext.relevant_inventory_items || [],
        secrets: extractedContext.potential_secret_flags || []
      },
      knownDiscoveredNpcs: knownNpcNames
    });

    const reasoningRes = await callDeepSeek({
      messages: [{ role: 'system', content: reasoningPrompt }],
      temperature: 0.35,
      max_tokens: 500,
      response_format: { type: 'json_object' }
    });

    const parsedReasoning = cleanAndParseJSON(reasoningRes);
    consequence = { ...consequence, ...parsedReasoning };
    if (!consequence.outcome_summary && consequence.consequence_summary) {
      consequence.outcome_summary = consequence.consequence_summary;
    }
  } catch (err) {
    console.warn('AI #2 Reasoning fallback:', err.message);
    if (fateResult.tier === 'critical_success') consequence.outcome_summary = 'การกระทำประสบความสำเร็จอย่างงดงาม';
    if (fateResult.tier === 'critical_failure') consequence.outcome_summary = 'เกิดความผิดพลาดอย่างรุนแรงและมีผลเสียตามมา';
  }

  // ==========================================
  // STAGE 3: AI #3 — Storyteller / Prose Craft Engine
  // ==========================================
  const storytellerSysPrompt = getStorytellerSystemPrompt(stylePreset);
  const storytellerUserPrompt = getStorytellerUserPrompt({
    world,
    character: { ...character, dynamic_state: slot.dynamic_state },
    playerInput,
    fateResult,
    consequence,
    recentHistory: slot.history.slice(-4),
    rollingSummary: slot.rolling_summary,
    customInstructions: stylePreset.custom_instructions
  });

  const narrationText = await callDeepSeek({
    messages: [
      { role: 'system', content: storytellerSysPrompt },
      { role: 'user', content: storytellerUserPrompt }
    ],
    temperature: parseFloat(stylePreset.temperature || 0.85),
    max_tokens: maxStoryTokens
  });

  // ==========================================
  // STAGE 4: AI #4 — State Commit & Memory Cement
  // ==========================================
  // Apply relationship deltas
  const deltas = consequence.state_changes?.relationship_deltas || [];
  let totalDelta = 0;
  deltas.forEach(d => {
    if (typeof d.delta === 'number') totalDelta += d.delta;
  });
  if (typeof consequence.relationship_delta === 'number') {
    totalDelta = consequence.relationship_delta;
  }

  const currentRel = slot.dynamic_state.relationship_value || 0;
  slot.dynamic_state.relationship_value = Math.min(100, Math.max(-100, currentRel + totalDelta));
  
  if (slot.dynamic_state.relationship_value >= 40) slot.dynamic_state.relationship_status = 'ผูกพันลึกซึ้ง';
  else if (slot.dynamic_state.relationship_value >= 20) slot.dynamic_state.relationship_status = 'สนิทสนม';
  else if (slot.dynamic_state.relationship_value >= 5) slot.dynamic_state.relationship_status = 'เพื่อนร่วมทาง';
  else if (slot.dynamic_state.relationship_value <= -30) slot.dynamic_state.relationship_status = 'ศัตรูคู่อาฆาต';
  else if (slot.dynamic_state.relationship_value <= -10) slot.dynamic_state.relationship_status = 'ระแวง';
  else slot.dynamic_state.relationship_status = 'เป็นกลาง';

  // Apply emotion updates
  const emotionUpdates = consequence.state_changes?.emotion_updates || [];
  if (emotionUpdates.length > 0 && emotionUpdates[0].new_emotion) {
    slot.dynamic_state.current_emotion = emotionUpdates[0].new_emotion;
  } else if (consequence.emotion_update) {
    slot.dynamic_state.current_emotion = consequence.emotion_update;
  }

  // Apply inventory changes
  const invChanges = consequence.state_changes?.inventory_changes || [];
  invChanges.forEach(change => {
    if (change.action === 'add' && change.item_id) {
      slot.inventory.push(change.item_id);
    } else if (change.action === 'remove' && change.item_id) {
      slot.inventory = slot.inventory.filter(i => i !== change.item_id);
    }
  });

  if (Array.isArray(consequence.inventory_add)) {
    slot.inventory.push(...consequence.inventory_add);
  }
  if (Array.isArray(consequence.inventory_remove)) {
    slot.inventory = slot.inventory.filter(i => !consequence.inventory_remove.includes(i));
  }

  // Apply secret notes unlock
  const unlockedSecrets = consequence.state_changes?.secret_notes_unlocked || [];
  if (consequence.unlock_secret_id) unlockedSecrets.push(consequence.unlock_secret_id);

  if (unlockedSecrets.length > 0 && Array.isArray(slot.codex_notes)) {
    slot.codex_notes.forEach(note => {
      if (unlockedSecrets.includes(note.id)) {
        note.unlocked = true;
      }
    });
  }

  // Append history turns
  const userTurn = {
    id: 'msg_' + Date.now() + '_u',
    role: 'user',
    type: playerInput.type,
    content: playerInput.text,
    timestamp: new Date().toISOString()
  };

  const aiTurn = {
    id: 'msg_' + Date.now() + '_a',
    role: 'assistant',
    content: narrationText,
    fateResult: fateResult,
    consequence: consequence,
    timestamp: new Date().toISOString()
  };

  slot.history.push(userTurn, aiTurn);

  // Update save folder without clobbering snapshot history
  const { snapshots, ...slotDataToUpdate } = slot;
  db.updateSaveSlot(slotId, slotDataToUpdate);

  // Background Rolling Summary (AI #4)
  if (slot.history.length % 8 === 0) {
    setTimeout(async () => {
      try {
        const summaryPrompt = getMemorySummaryPrompt(
          character.name,
          slot.rolling_summary,
          slot.history.slice(-8)
        );
        const summaryRes = await callDeepSeek({
          messages: [{ role: 'system', content: summaryPrompt }],
          temperature: 0.3,
          max_tokens: 300
        });
        const currentSlot = db.getSaveSlotById(slotId);
        if (currentSlot) {
          currentSlot.rolling_summary = summaryRes;
          db.updateSaveSlot(slotId, currentSlot);
        }
      } catch (e) {
        console.warn('Async memory summary warning:', e.message);
      }
    }, 100);
  }

  return {
    slotId,
    userTurn,
    aiTurn,
    dynamic_state: slot.dynamic_state,
    inventory: slot.inventory,
    codex_notes: slot.codex_notes,
    discovered_npcs: slot.discovered_npcs,
    discovered_npc: consequence.discovered_npc || null,
    fateResult,
    consequence
  };
}

/**
 * Regenerate story for the last AI response (Calls AI #3 only)
 */
async function regenerateNarration({ slotId, customInstructions = '' }) {
  const slot = db.getSaveSlotById(slotId);
  if (!slot || slot.history.length < 2) {
    throw new Error('Not enough history to regenerate');
  }

  const lastAiTurn = slot.history[slot.history.length - 1];
  const lastUserTurn = slot.history[slot.history.length - 2];

  if (lastAiTurn.role !== 'assistant') {
    throw new Error('Last message is not from assistant');
  }

  const character = db.getCharacterById(slot.character_id);
  const world = db.getWorldById(slot.world_id);
  const settings = db.getSettings();
  const stylePreset = slot.style_preset || {};
  const maxStoryTokens = parseInt(stylePreset.max_response_tokens || settings.maxTokens || 500, 10);

  const consequence = lastAiTurn.consequence || {
    outcome_summary: 'การสนทนาดำเนินต่อไป',
    consequence_summary: 'การสนทนาดำเนินต่อไป',
    emotion_update: slot.dynamic_state.current_emotion
  };
  const fateResult = lastAiTurn.fateResult || null;

  const storytellerSysPrompt = getStorytellerSystemPrompt(stylePreset);
  const storytellerUserPrompt = getStorytellerUserPrompt({
    world,
    character: { ...character, dynamic_state: slot.dynamic_state },
    playerInput: { type: lastUserTurn.type || 'Say', text: lastUserTurn.content },
    fateResult,
    consequence,
    recentHistory: slot.history.slice(0, -2).slice(-4),
    rollingSummary: slot.rolling_summary,
    customInstructions: customInstructions || stylePreset.custom_instructions
  });

  const newNarration = await callDeepSeek({
    messages: [
      { role: 'system', content: storytellerSysPrompt },
      { role: 'user', content: storytellerUserPrompt }
    ],
    temperature: parseFloat(stylePreset.temperature || 0.88),
    max_tokens: maxStoryTokens
  });

  lastAiTurn.content = newNarration;
  lastAiTurn.updated_at = new Date().toISOString();
  db.updateSaveSlot(slotId, slot);

  return {
    slotId,
    aiTurn: lastAiTurn
  };
}

/**
 * Worldbook / Lorebook AI Analyzer
 */
async function analyzeWorldbookContent(rawContent) {
  if (!rawContent || !rawContent.trim()) {
    throw new Error('Empty worldbook content');
  }

  const prompt = getWorldbookAnalyzerPrompt(rawContent);
  const res = await callDeepSeek({
    messages: [{ role: 'system', content: prompt }],
    temperature: 0.5,
    max_tokens: 2500
  });

  return cleanAndParseJSON(res);
}

/**
 * AI Opening Prologue Generator
 */
async function generateOpeningPrologue({ worldName, worldDesc, characterName, charDesc, charPersonality }) {
  const prompt = getPrologueGeneratorPrompt(worldName, worldDesc, characterName, charDesc, charPersonality);
  const res = await callDeepSeek({
    messages: [{ role: 'system', content: prompt }],
    temperature: 0.85,
    max_tokens: 800
  });

  return res.trim();
}

module.exports = {
  executeTurnPipeline,
  regenerateNarration,
  callDeepSeek,
  analyzeWorldbookContent,
  generateOpeningPrologue
};
