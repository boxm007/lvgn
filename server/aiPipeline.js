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
 * Helper: Advance scene day/time/location
 */
function advanceSceneTime(currentScene, updates = {}) {
  let day = currentScene?.day || 1;
  let timeStr = currentScene?.time || "08:30";
  let location = updates.location || currentScene?.location || "จุดเริ่มต้น";

  if (updates.new_time) {
    timeStr = updates.new_time;
  } else {
    // Advance 10-25 mins
    const [hh, mm] = timeStr.split(':').map(Number);
    let totalMinutes = (isNaN(hh) ? 8 : hh) * 60 + (isNaN(mm) ? 30 : mm) + Math.floor(Math.random() * 15 + 10);
    if (totalMinutes >= 24 * 60) {
      day += Math.floor(totalMinutes / (24 * 60));
      totalMinutes %= 24 * 60;
    }
    const newH = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
    const newM = String(totalMinutes % 60).padStart(2, '0');
    timeStr = `${newH}:${newM}`;
  }

  if (updates.day_increment) {
    day += updates.day_increment;
  }

  return { day, time: timeStr, location };
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
    const knownNpcNames = [
      ...(slot.roster || []).map(n => n.name),
      ...(slot.discovered_npcs || []).map(n => n.name)
    ];
    const reasoningPrompt = getReasoningPrompt({
      playerInput,
      fateResult,
      activeCharacter: { ...character, dynamic_state: slot.dynamic_state },
      worldContext: world,
      worldRoster: slot.roster || [],
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
  // ADVANCE SCENE TIME & LOCATION (Section 1, 7, 39)
  // ==========================================
  const currentScene = slot.dynamic_state.scene || { day: 1, time: "08:30", location: world.name || "จุดเริ่มต้น" };
  const updatedScene = advanceSceneTime(currentScene, consequence.scene_updates || {});
  slot.dynamic_state.scene = updatedScene;

  // ==========================================
  // STAGE 3: AI #3 — Storyteller / Prose Craft Engine
  // ==========================================
  const storytellerSysPrompt = getStorytellerSystemPrompt(stylePreset);
  const storytellerUserPrompt = getStorytellerUserPrompt({
    world,
    character: { ...character, dynamic_state: slot.dynamic_state },
    worldRoster: slot.roster || [],
    playerInput,
    fateResult,
    consequence,
    recentHistory: (slot.history || []).slice(-4),
    rollingSummary: slot.rolling_summary || '',
    scene: updatedScene,
    customInstructions: stylePreset.custom_instructions || ''
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
  // Ensure compact scene status header format: [ วันที่ X | เวลา XX:XX น. | สถานที่: ... ]
  const sceneHeader = `📍 **[ วันที่ ${updatedScene.day} | เวลา ${updatedScene.time} น. | สถานที่: ${updatedScene.location} ]**\n\n`;
  let finalNarration = narrationText.trim();
  if (!finalNarration.startsWith('📍') && !finalNarration.includes('[ วันที่')) {
    finalNarration = sceneHeader + finalNarration;
  }

  // Apply multi-character relationship deltas
  if (!slot.roster) slot.roster = [];
  if (!slot.discovered_npcs) slot.discovered_npcs = [];

  const deltas = consequence.state_changes?.relationship_deltas || [];
  deltas.forEach(d => {
    const charName = (d.character_name || d.character_id || '').toLowerCase();
    const targetNpc = slot.roster.find(n => n.name.toLowerCase().includes(charName) || (n.id && n.id.toLowerCase() === charName))
      || slot.discovered_npcs.find(n => n.name.toLowerCase().includes(charName));

    if (targetNpc && typeof d.delta === 'number') {
      targetNpc.relationship_value = Math.min(100, Math.max(-100, (targetNpc.relationship_value || 0) + d.delta));
      if (targetNpc.relationship_value >= 40) targetNpc.relationship_status = 'ผูกพันลึกซึ้ง';
      else if (targetNpc.relationship_value >= 20) targetNpc.relationship_status = 'สนิทสนม';
      else if (targetNpc.relationship_value >= 5) targetNpc.relationship_status = 'เพื่อนร่วมทาง';
      else if (targetNpc.relationship_value <= -30) targetNpc.relationship_status = 'ศัตรูคู่อาฆาต';
      else if (targetNpc.relationship_value <= -10) targetNpc.relationship_status = 'ระแวง';
      else targetNpc.relationship_status = 'เป็นกลาง';
    }
  });

  // Apply emotion updates
  const emotionUpdates = consequence.state_changes?.emotion_updates || [];
  emotionUpdates.forEach(u => {
    const charName = (u.character_name || u.character_id || '').toLowerCase();
    const targetNpc = slot.roster.find(n => n.name.toLowerCase().includes(charName))
      || slot.discovered_npcs.find(n => n.name.toLowerCase().includes(charName));
    if (targetNpc && u.new_emotion) {
      targetNpc.current_emotion = u.new_emotion;
    }
  });

  // Handle newly discovered NPC
  if (consequence.discovered_npc && consequence.discovered_npc.name) {
    const newNpcName = consequence.discovered_npc.name.trim();
    const alreadyExists = slot.roster.some(n => n.name.toLowerCase() === newNpcName.toLowerCase()) ||
                          slot.discovered_npcs.some(n => n.name.toLowerCase() === newNpcName.toLowerCase());
    
    if (!alreadyExists) {
      const newNpcObj = {
        id: 'npc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        name: newNpcName,
        role: consequence.discovered_npc.role || 'ตัวละครใหม่ในโลก',
        brief_desc: consequence.discovered_npc.brief_desc || '',
        avatar: consequence.discovered_npc.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=300&auto=format&fit=crop',
        personality_tags: consequence.discovered_npc.personality_tags || ['ลึกลับ'],
        relationship_value: consequence.discovered_npc.initial_relationship || 0,
        relationship_status: 'เพิ่งพบเจอ',
        current_emotion: 'ปกติ',
        base_stats: consequence.discovered_npc.base_stats || { strength: 10, agility: 10, intelligence: 10, charisma: 10, perception: 10 },
        codex_notes: consequence.discovered_npc.secret_notes || [],
        discovered_at: new Date().toISOString()
      };
      slot.discovered_npcs.push(newNpcObj);
    }
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

  // Apply secret notes unlock across protagonist and roster
  const unlockedSecrets = consequence.state_changes?.secret_notes_unlocked || [];
  if (consequence.unlock_secret_id) unlockedSecrets.push(consequence.unlock_secret_id);

  if (unlockedSecrets.length > 0) {
    if (Array.isArray(slot.codex_notes)) {
      slot.codex_notes.forEach(note => {
        if (unlockedSecrets.includes(note.id)) note.unlocked = true;
      });
    }
    slot.roster.forEach(npc => {
      if (Array.isArray(npc.codex_notes)) {
        npc.codex_notes.forEach(note => {
          if (unlockedSecrets.includes(note.id)) note.unlocked = true;
        });
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
    content: finalNarration,
    scene: updatedScene,
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
    roster: slot.roster || [],
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

  const parsed = cleanAndParseJSON(res);
  
  if (!parsed.characters && parsed.character) {
    parsed.characters = [parsed.character];
  }
  if (!Array.isArray(parsed.characters)) {
    parsed.characters = [];
  }

  // Ensure world has lore_details
  if (parsed.world && !parsed.world.lore_details && parsed.world.lore) {
    parsed.world.lore_details = {
      geography: parsed.world.lore.geography || '',
      magic_rules: parsed.world.lore.magic_rules || parsed.world.lore.magic_tech_rules || '',
      factions: parsed.world.lore.factions || parsed.world.lore.factions_politics || '',
      custom_lore: parsed.world.lore.custom_lore || ''
    };
  }

  return parsed;
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
