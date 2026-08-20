const config = require('./config');
const db = require('./db');
const FateEngine = require('./fateEngine');
const MemoryEngine = require('./memoryEngine');
const LorebookEngine = require('./lorebookEngine');
const {
  getContextExtractorPrompt,
  getReasoningPrompt,
  getStorytellerSystemPrompt,
  getStorytellerUserPrompt,
  getFactAndMemoryExtractorPrompt,
  getMemorySummaryPrompt,
  getWorldbookAnalyzerPrompt,
  getPrologueGeneratorPrompt
} = require('./prompts');

const memoryEngine = new MemoryEngine();
const lorebookEngine = new LorebookEngine();

function getChatCompletionsUrl(rawBaseURL) {
  let url = (rawBaseURL || 'https://api.deepseek.com').trim().replace(/\/+$/, '');
  if (url.endsWith('/chat/completions')) return url;
  return `${url}/chat/completions`;
}

function normalizeModelName(rawModel, rawBaseURL = '') {
  if (!rawModel) return 'deepseek-chat';
  let m = rawModel.trim();
  const base = (rawBaseURL || '').toLowerCase();
  
  // If not using OpenRouter (e.g. using DeepSeek official, DashScope, SiliconFlow, or standard endpoint)
  if (!base.includes('openrouter.ai')) {
    if (m === 'deepseek/deepseek-chat-v4-flash' || m === 'deepseek/deepseek-v4-flash') {
      m = 'deepseek-v4-flash';
    } else if (m === 'deepseek/deepseek-chat-v4-pro' || m === 'deepseek/deepseek-v4-pro') {
      m = 'deepseek-v4-pro';
    } else if (m === 'deepseek/deepseek-chat' || m === 'deepseek/deepseek-v3') {
      m = 'deepseek-chat';
    } else if (m === 'deepseek/deepseek-r1' || m === 'deepseek/deepseek-reasoner') {
      m = 'deepseek-reasoner';
    }
  } else {
    // OpenRouter mappings
    if (m === 'deepseek-chat' || m === 'deepseek-v3') {
      m = 'deepseek/deepseek-chat';
    } else if (m === 'deepseek-reasoner' || m === 'deepseek-r1') {
      m = 'deepseek/deepseek-r1';
    } else if (m === 'qwen-max') {
      m = 'qwen/qwen-max';
    } else if (m === 'qwen-2.5-72b-instruct' || m === 'qwen2.5-72b-instruct') {
      m = 'qwen/qwen-2.5-72b-instruct';
    }
  }

  return m;
}

/**
 * Call AI Brain API (DeepSeek / Qwen / OpenRouter / SiliconFlow / OpenAI Compatible)
 * Supports dual-model architecture: Fast backend referee brain (deepseek-v4-flash) & High-literary Storyteller
 */
async function callDeepSeek({ messages, temperature = 0.85, max_tokens = 800, response_format = null, overrideModel = null, min_p = 0.05 }) {
  const settings = db.getSettings();
  const apiKey = settings.apiKey || config.deepseek.apiKey;
  const baseURL = settings.baseURL || config.deepseek.baseURL;
  
  // Dual-model resolution: Use overrideModel if provided, else user's storyteller model, else default
  const rawModel = overrideModel || settings.storytellerModel || settings.model || config.deepseek.model || 'deepseek-v4-pro';
  const model = normalizeModelName(rawModel, baseURL);

  const body = {
    model: model,
    messages: messages,
    temperature: typeof temperature === 'number' ? temperature : 0.85,
    max_tokens: max_tokens || 800
  };

  if (response_format) {
    body.response_format = response_format;
  }

  const endpoint = getChatCompletionsUrl(baseURL);

  let lastErr = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey.trim()}`
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errText = await response.text();
        let parsedErr = errText;
        try {
          const jsonErr = JSON.parse(errText);
          parsedErr = jsonErr.error?.message || jsonErr.message || errText;
        } catch (e) {}
        throw new Error(`AI API error (${response.status}): ${parsedErr}`);
      }

      const data = await response.json();
      if (!data.choices || data.choices.length === 0) {
        throw new Error('AI API returned empty choices');
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
 * Call Fast Backend Referee Brain (Always uses deepseek-v4-flash or fast model)
 */
async function callFastRefereeBrain(options) {
  const settings = db.getSettings();
  const fastModel = settings.refereeModel || 'deepseek-v4-flash';
  return callDeepSeek({
    ...options,
    overrideModel: fastModel
  });
}

/**
 * Helper to clean and parse JSON from AI response
 */
function cleanAndParseJSON(rawText) {
  try {
    let clean = (rawText || '').trim();
    clean = clean.replace(/```json\s*/gi, '').replace(/```\s*$/gi, '').trim();
    const firstBrace = clean.indexOf('{');
    const lastBrace = clean.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      clean = clean.substring(firstBrace, lastBrace + 1);
    }
    return JSON.parse(clean);
  } catch (err) {
    console.warn('Failed to parse clean JSON:', err.message);
    const jsonMatch = (rawText || '').match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw err;
  }
}

/**
 * Advance scene clock by 10-25 minutes per standard turn
 */
function advanceSceneTime(currentScene, updates = {}) {
  let { day = 1, time = "08:30", location = "จุดเริ่มต้น" } = currentScene || {};

  if (updates.location) {
    location = updates.location;
  }

  let [hours, minutes] = (time || "08:30").split(':').map(Number);
  if (isNaN(hours)) hours = 8;
  if (isNaN(minutes)) minutes = 30;

  const minutesToAdd = updates.minutes_passed || (Math.floor(Math.random() * 15) + 10);
  let totalMinutes = (hours * 60) + minutes + minutesToAdd;

  let timeStr = time;
  if (totalMinutes >= 24 * 60) {
    day += Math.floor(totalMinutes / (24 * 60));
    totalMinutes = totalMinutes % (24 * 60);
    const newH = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
    const newM = String(totalMinutes % 60).padStart(2, '0');
    timeStr = `${newH}:${newM}`;
  } else {
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
 * Execute Full Turn through 9-Tier Memory, Lorebook Scanner, and Fate Engine
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
  const maxStoryTokens = parseInt(stylePreset.max_response_tokens || settings.max_story_tokens || settings.maxTokens || 1200, 10);

  // ==========================================
  // STAGE 1 & 2: DETERMINISTIC MECHANICAL GM & FATE ENGINE
  // ==========================================
  const textLower = playerInput.text.toLowerCase();
  let statToCheck = 'charisma';
  if (playerInput.type === 'Do') {
    if (/วิ่ง|หลบ|กระโดด|ปีน|เร็ว|หนี/.test(textLower)) statToCheck = 'agility';
    else if (/มอง|สังเกต|สำรวจ|ค้น|ฟัง|ตรวจ/.test(textLower)) statToCheck = 'perception';
    else if (/คิด|คำนวณ|วิเคราะห์|ร่าย|เวท|กลยุทธ์/.test(textLower)) statToCheck = 'intelligence';
    else if (/ยิ้ม|พูด|ทัก|ปลอบ|กล่อม|เจรจา|ขอร้อง/.test(textLower)) statToCheck = 'charisma';
    else statToCheck = 'strength';
  } else {
    if (/หลอก|โกหก|ขู่|โน้มน้าว|ร้องขอ|ทักทาย|ถาม/.test(textLower)) statToCheck = 'charisma';
    else if (/วิเคราะห์|ตั้งสมมติฐาน|อธิบาย/.test(textLower)) statToCheck = 'intelligence';
    else statToCheck = 'charisma';
  }

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
      statName: statToCheck,
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

  // Determine outcome summary based on Fate Tier
  let outcomeSummary = 'การกระทำดำเนินต่อไปอย่างราบรื่น';
  if (fateResult.tier === 'critical_success') {
    outcomeSummary = 'การกระทำประสบความสำเร็จขั้นสูงสุด ได้ผลลัพธ์ยอดเยี่ยมเกินคาดและสร้างความประทับใจลึกซึ้ง';
  } else if (fateResult.tier === 'success') {
    outcomeSummary = 'การกระทำประสบความสำเร็จตามที่มุ่งหวัง ทุกอย่างดำเนินไปอย่างราบรื่น';
  } else if (fateResult.tier === 'success_with_consequence') {
    outcomeSummary = 'สำเร็จแต่มีอุปสรรคหรือความตึงเครียดตามมาเล็กน้อย ต้องแลกด้วยความพยายามหรือความรู้สึกประหม่า';
  } else if (fateResult.tier === 'failure') {
    outcomeSummary = 'เกิดความผิดพลาดหรือไม่เป็นไปตามแผน ต้องเผชิญหน้ากับความท้าทายหรือปฏิกิริยาที่เย็นชา/ตึงเครียด';
  } else if (fateResult.tier === 'critical_failure') {
    outcomeSummary = 'เกิดความล้มเหลวร้ายแรง นำมาซึ่งความเสียหาย ความเข้าใจผิด หรืออันตรายฉับพลัน';
  }

  const consequence = {
    roll_result: fateResult.tier,
    outcome_summary: outcomeSummary,
    consequence_summary: outcomeSummary,
    state_changes: {
      relationship_deltas: [],
      inventory_changes: [],
      emotion_updates: [],
      secret_notes_unlocked: []
    },
    narrative_directives: {
      must_include: [],
      tone_hint: stylePreset.tone_directive || 'drama'
    },
    discovered_npc: null
  };

  // ==========================================
  // STAGE 2.5: MEMORY ENGINE & LOREBOOK RETRIEVAL (Hybrid RAG)
  // ==========================================
  // 1. Scan Lorebook entries
  const allLoreEntries = (world.lorebook_entries || []).concat(
    (world.lore_details ? [
      { id: 'lore_geo', title: 'ภูมิศาสตร์และสถานที่', content: world.lore_details.geography, mode: 'normal', keys: ['ที่ไหน', 'สถานที่', 'ทางไป', 'ห้อง'] },
      { id: 'lore_magic', title: 'กฎของพลัง Will / เวทมนตร์', content: world.lore_details.magic_rules, mode: 'normal', keys: ['will', 'พลัง', 'ธาตุ', 'ออร่า'] },
      { id: 'lore_factions', title: 'สภานักเรียนและองค์กร', content: world.lore_details.factions, mode: 'normal', keys: ['สภา', 'สมาคม', 'องค์กร', 'กิลด์'] }
    ] : [])
  );
  const triggeredLore = lorebookEngine.scan(playerInput.text, allLoreEntries);

  // 2. Search relevant episodic memories via Hybrid RAG
  const currentTurnIdx = (slot.history || []).length;
  const retrievedMems = memoryEngine.searchRelevantMemories(slotId, playerInput.text, currentTurnIdx, { topK: 3 });

  // 3. Fetch relevant semantic facts via Progressive Injection [P1]
  const activeFacts = memoryEngine.getRelevantFacts(slotId, playerInput.text, { topK: 10 });

  // ==========================================
  // ADVANCE SCENE TIME & LOCATION
  // ==========================================
  const currentScene = slot.dynamic_state.scene || { day: 1, time: "08:30", location: world.name || "จุดเริ่มต้น" };
  const updatedScene = advanceSceneTime(currentScene);
  slot.dynamic_state.scene = updatedScene;

  // ==========================================
  // STAGE 3: AI #3 — AUTHORITATIVE MASTER STORYTELLER (Prose Craft Engine)
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
    currentScene: updatedScene,
    customInstructions: stylePreset.custom_instructions || '',
    lorebookInjections: triggeredLore,
    retrievedMemories: retrievedMems,
    activeFacts: activeFacts
  });

  let narrationText = '';
  try {
    narrationText = await callDeepSeek({
      messages: [
        { role: 'system', content: storytellerSysPrompt },
        { role: 'user', content: storytellerUserPrompt }
      ],
      temperature: parseFloat(stylePreset.temperature || 0.85),
      max_tokens: maxStoryTokens
    });
  } catch (err) {
    console.error('Storyteller call error:', err.message);
  }

  // Safety Fallback: Ensure narration is never empty or header-only
  const sceneHeader = `📍 **[ วันที่ ${updatedScene.day} | เวลา ${updatedScene.time} น. | สถานที่: ${updatedScene.location} ]**\n\n`;
  let bodyOnly = (narrationText || '').replace(/📍\s*\*\*\[[^\]]+\]\*\*/g, '').trim();

  if (bodyOnly.length < 20) {
    console.warn('Narration returned empty/short body, running emergency fallback pass...');
    try {
      const retryRes = await callDeepSeek({
        messages: [
          { role: 'system', content: `คุณคือนักเขียนนิยาย RPG ภาษาไทย จงเขียนบทบรรยาย 2 ย่อหน้าตอบสนองต่อการกระทำของผู้เล่นในฉากอย่างมีชีวิตชีวา โดยเริ่มด้วยบรรทัดสถานะฉากเสมอ` },
          { role: 'user', content: `[ตัวเอก]: ${character.name} | [โลก]: ${world.name}\n[การกระทำ]: ${playerInput.type} "${playerInput.text}"\n[ผลลัพธ์]: ${fateResult.tier_th}\n\nจงเริ่มบรรยายโดยขึ้นต้นด้วย: 📍 **[ วันที่ ${updatedScene.day} | เวลา ${updatedScene.time} น. | สถานที่: ${updatedScene.location} ]**` }
        ],
        temperature: 0.7,
        max_tokens: maxStoryTokens
      });
      narrationText = retryRes;
      bodyOnly = (narrationText || '').replace(/📍\s*\*\*\[[^\]]+\]\*\*/g, '').trim();
    } catch (retryErr) {
      console.error('Emergency retry error:', retryErr.message);
    }
  }

  // Final guaranteed fallback if AI network is completely unreachable
  if (bodyOnly.length < 20) {
    bodyOnly = `สายลมอ่อนพัดผ่านพื้นที่ของ ${updatedScene.location} บรรยากาศรอบตัวเต็มไปด้วยความเงียบสงบชั่วขณะ หลังจากการกระทำของ ${character.name} สิ้นสุดลง ผู้คนในบริเวณต่างหันมาจับจ้องด้วยความสนใจ ปฏิกิริยาของสิ่งรอบข้างเริ่มก่อตัวขึ้นตามผลลัพธ์ของชะตากรรม`;
    narrationText = sceneHeader + bodyOnly;
  }

  let finalNarration = narrationText.trim();
  if (!finalNarration.startsWith('📍') && !finalNarration.includes('[ วันที่')) {
    finalNarration = sceneHeader + finalNarration;
  }

  // Check Canon Locks
  if (world.canon_locks && world.canon_locks.length > 0) {
    const canonCheck = lorebookEngine.verifyCanonLocks(finalNarration, world.canon_locks);
    if (!canonCheck.compliant) {
      console.warn('[CanonLock] Warning detected in narrative:', canonCheck.violations);
    }
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

      // [P2] Sync relationship change as fact triplet
      memoryEngine.syncRelationshipFact(slotId, targetNpc.name, targetNpc.relationship_status, targetNpc.relationship_value, Math.floor((slot.history || []).length / 2), updatedScene);
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

  // Apply secret notes unlock
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

  // Update save folder
  const { snapshots, ...slotDataToUpdate } = slot;
  db.updateSaveSlot(slotId, slotDataToUpdate);

  // ==========================================
  // STAGE 4: ASYNC MEMORY WRITER & FACT EXTRACTION (Sections 6, 8, 9)
  // ==========================================
  setTimeout(async () => {
    try {
      // 1. Extract Fact Triplets & Episodic Memory
      const reflectionPrompt = getFactAndMemoryExtractorPrompt({
        worldName: world.name,
        characterName: character.name,
        latestTurns: [userTurn, aiTurn],
        currentScene: updatedScene,
        currentFacts: activeFacts
      });

      const reflectionRes = await callFastRefereeBrain({
        messages: [{ role: 'system', content: reflectionPrompt }],
        temperature: 0.3,
        max_tokens: 400
      });

      const parsedReflection = cleanAndParseJSON(reflectionRes);

      if (parsedReflection.episodic_memory && parsedReflection.episodic_memory.content) {
        memoryEngine.addEpisodicMemory(slotId, {
          turn_number: Math.floor(slot.history.length / 2),
          content: parsedReflection.episodic_memory.content,
          importance: parsedReflection.episodic_memory.importance || 5,
          emotional_valence: parsedReflection.episodic_memory.emotional_valence || 'neutral',
          entities: parsedReflection.episodic_memory.entities || [],
          location: updatedScene.location,
          // [P1] Temporal metadata
          game_day: updatedScene.day,
          game_time: updatedScene.time,
          game_location: updatedScene.location,
          // [P1] Provenance
          source_turn_ids: [userTurn.id, aiTurn.id],
          created_by: 'ai_extractor'
        });
      }

      if (Array.isArray(parsedReflection.new_facts)) {
        for (const f of parsedReflection.new_facts) {
          if (f.subject && f.predicate && f.object) {
            memoryEngine.reconcileFact(slotId, {
              ...f,
              turn_number: Math.floor(slot.history.length / 2),
              // [P1] Temporal metadata
              game_day: updatedScene.day,
              game_time: updatedScene.time,
              game_location: updatedScene.location,
              // [P1] Provenance
              source_turn_ids: [userTurn.id, aiTurn.id],
              created_by: 'ai_extractor'
            });
          }
        }
      }

      // [P0] Entity Alias Extraction — register any new aliases detected
      if (Array.isArray(parsedReflection.entity_aliases)) {
        for (const alias of parsedReflection.entity_aliases) {
          if (alias.canonical && alias.alias) {
            memoryEngine.registerAlias(slotId, alias.canonical, alias.alias);
          }
        }
      }

      // [P2] Memory Importance Decay — gradually reduce old low-importance memories
      memoryEngine.applyImportanceDecay(slotId, Math.floor(slot.history.length / 2));

      // 2. Periodic Long-term Recursive Summarization
      if (slot.history.length % 8 === 0) {
        // [P1] Summary Versioning — archive current summary before overwriting
        const currentSlotForSummary = db.getSaveSlotById(slotId);
        if (currentSlotForSummary && currentSlotForSummary.rolling_summary) {
          memoryEngine.pushSummaryVersion(slotId, currentSlotForSummary.rolling_summary);
        }

        const summaryPrompt = getMemorySummaryPrompt({
          worldName: world.name,
          characterName: character.name,
          currentSummary: slot.rolling_summary,
          recentTurns: slot.history.slice(-8),
          activeDynamicState: slot.dynamic_state
        });
        const summaryRes = await callFastRefereeBrain({
          messages: [{ role: 'system', content: summaryPrompt }],
          temperature: 0.3,
          max_tokens: 350
        });
        const parsedSummary = cleanAndParseJSON(summaryRes);
        const currentSlot = db.getSaveSlotById(slotId);
        if (currentSlot) {
          currentSlot.rolling_summary = parsedSummary.rolling_summary || summaryRes;
          db.updateSaveSlot(slotId, currentSlot);
        }
      }
    } catch (e) {
      console.warn('[MemoryEngine] Async reflection warning:', e.message);
    }
  }, 100);

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
    consequence,
    retrieved_memories: retrievedMems,
    active_facts: activeFacts
  };
}

/**
 * Regenerate story for the last AI response
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
  const maxStoryTokens = parseInt(stylePreset.max_response_tokens || settings.maxTokens || 800, 10);

  const consequence = lastAiTurn.consequence || {
    outcome_summary: 'การสนทนาดำเนินต่อไป',
    consequence_summary: 'การสนทนาดำเนินต่อไป',
    emotion_update: slot.dynamic_state.current_emotion
  };
  const fateResult = lastAiTurn.fateResult || null;

  const currentTurnIdx = slot.history.length;
  const retrievedMems = memoryEngine.searchRelevantMemories(slotId, lastUserTurn.content, currentTurnIdx, { topK: 3 });
  const activeFacts = memoryEngine.getRelevantFacts(slotId, lastUserTurn.content, { topK: 10 });

  const storytellerSysPrompt = getStorytellerSystemPrompt(stylePreset);
  const storytellerUserPrompt = getStorytellerUserPrompt({
    world,
    character: { ...character, dynamic_state: slot.dynamic_state },
    worldRoster: slot.roster || [],
    playerInput: { type: lastUserTurn.type || 'Say', text: lastUserTurn.content },
    fateResult,
    consequence,
    recentHistory: slot.history.slice(0, -2).slice(-4),
    rollingSummary: slot.rolling_summary,
    currentScene: lastAiTurn.scene || slot.dynamic_state.scene || { day: 1, time: "08:30", location: world.name },
    customInstructions: customInstructions || stylePreset.custom_instructions,
    retrievedMemories: retrievedMems,
    activeFacts: activeFacts
  });

  const newNarration = await callDeepSeek({
    messages: [
      { role: 'system', content: storytellerSysPrompt },
      { role: 'user', content: storytellerUserPrompt }
    ],
    temperature: parseFloat(stylePreset.temperature || 0.88),
    max_tokens: maxStoryTokens
  });

  lastAiTurn.content = newNarration.trim();
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
    max_tokens: 3000
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
  const prompt = getPrologueGeneratorPrompt({
    worldName,
    worldDesc,
    characterName,
    charDesc,
    charPersonality
  });
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
  generateOpeningPrologue,
  memoryEngine,
  lorebookEngine
};
