const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./config');
const db = require('./db');
const { initSeedData } = require('./seedData');
const { executeTurnPipeline, regenerateNarration, analyzeWorldbookContent, generateOpeningPrologue, memoryEngine, lorebookEngine } = require('./aiPipeline');

// Initialize Seed Data on startup
initSeedData();

const app = express();

app.use(cors());
app.use(express.json({ limit: '25mb' }));
app.use(express.static(path.join(__dirname, '..', 'public')));

// ==========================================
// REST API ENDPOINTS
// ==========================================

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    name: 'Long Voyage Engine (Modern AI Roleplay Architecture)',
    version: '2.0.0',
    storage: 'Folder-Based Isolated Saves (9-Tier Memory Enabled)',
    model: db.getSettings().model,
    timestamp: new Date().toISOString()
  });
});

// --- Worlds ---
app.get('/api/worlds', (req, res) => {
  res.json({ worlds: db.getWorlds() });
});

app.post('/api/worlds', (req, res) => {
  try {
    const { name, description, tag, cover_image, lore_details, lorebook_entries, canon_locks } = req.body;
    if (!name) return res.status(400).json({ error: 'World name is required' });
    const newWorld = db.createWorld({ name, description, tag, cover_image, lore_details, lorebook_entries, canon_locks });
    res.json({ world: newWorld });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Advanced World & Characters Batch Creation
app.post('/api/worlds/advanced', (req, res) => {
  try {
    const { world, characters } = req.body;
    if (!world || !world.name) {
      return res.status(400).json({ error: 'World name is required' });
    }

    const createdWorld = db.createWorld(world);
    const createdChars = [];

    if (Array.isArray(characters) && characters.length > 0) {
      characters.forEach(c => {
        const charObj = db.createCharacter({
          ...c,
          world_id: createdWorld.id
        });
        createdChars.push(charObj);
      });
    }

    res.json({ world: createdWorld, characters: createdChars });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get World Lorebook & Canon Locks
app.get('/api/lorebook/:worldId', (req, res) => {
  try {
    const world = db.getWorldById(req.params.worldId);
    if (!world) return res.status(404).json({ error: 'World not found' });
    res.json({
      worldId: world.id,
      name: world.name,
      lore_details: world.lore_details || {},
      lorebook_entries: world.lorebook_entries || [],
      canon_locks: world.canon_locks || []
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Worldbook Analyzer (Import & Auto-Extract) ---
app.post('/api/worldbook/analyze', async (req, res) => {
  try {
    const { content } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Worldbook content is required' });
    }

    const analyzed = await analyzeWorldbookContent(content);
    res.json(analyzed);
  } catch (err) {
    console.error('Worldbook analysis error:', err);
    res.status(500).json({ error: err.message });
  }
});

// --- AI Prologue Generator ---
app.post('/api/ai/generate-prologue', async (req, res) => {
  try {
    const { worldName, worldDesc, characterName, charDesc, charPersonality } = req.body;
    if (!characterName) return res.status(400).json({ error: 'Character name is required' });

    const prologue = await generateOpeningPrologue({
      worldName: worldName || 'โลกแฟนตาซี',
      worldDesc: worldDesc || '',
      characterName,
      charDesc: charDesc || '',
      charPersonality: charPersonality || []
    });

    res.json({ prologue });
  } catch (err) {
    console.error('Prologue generation error:', err);
    res.status(500).json({ error: err.message });
  }
});

// --- Characters ---
app.get('/api/characters', (req, res) => {
  const { world_id } = req.query;
  res.json({ characters: db.getCharacters(world_id) });
});

app.post('/api/characters', (req, res) => {
  try {
    const { world_id, name, short_desc, avatar, personality_tags, opening_prologue, static_profile, dynamic_state, initial_inventory, codex_notes } = req.body;
    if (!name || !world_id) return res.status(400).json({ error: 'Name and World ID are required' });
    const newChar = db.createCharacter({
      world_id,
      name,
      short_desc,
      avatar,
      personality_tags,
      opening_prologue,
      static_profile,
      dynamic_state,
      initial_inventory,
      codex_notes
    });
    res.json({ character: newChar });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/characters/:id', (req, res) => {
  try {
    const updated = db.updateCharacter(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'Character not found' });
    res.json({ character: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Save Slots (Folder-Based Isolated Saves) ---
app.get('/api/slots', (req, res) => {
  const { world_id, character_id } = req.query;
  res.json({ slots: db.getSaveSlots(world_id, character_id) });
});

app.get('/api/slots/:id', (req, res) => {
  const slot = db.getSaveSlotById(req.params.id);
  if (!slot) return res.status(404).json({ error: 'Slot not found' });
  const character = db.getCharacterById(slot.character_id);
  const world = db.getWorldById(slot.world_id);
  res.json({ slot, character, world });
});

app.post('/api/slots', (req, res) => {
  try {
    const { world_id, character_id, slot_name } = req.body;
    if (!world_id || !character_id) {
      return res.status(400).json({ error: 'world_id and character_id are required' });
    }
    const newSlot = db.createSaveSlot(world_id, character_id, slot_name);
    res.json({ slot: newSlot });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/slots/:id', (req, res) => {
  const success = db.deleteSaveSlot(req.params.id);
  if (!success) return res.status(404).json({ error: 'Slot not found' });
  res.json({ success: true });
});

// Update slot character / avatar
app.put('/api/slots/:id/character/avatar', (req, res) => {
  try {
    const { avatar, character_id } = req.body;
    if (!avatar) return res.status(400).json({ error: 'Avatar URL is required' });

    const slot = db.getSaveSlotById(req.params.id);
    if (!slot) return res.status(404).json({ error: 'Slot not found' });

    if (!character_id || character_id === slot.character_id) {
      slot.custom_avatar = avatar;
    } else if (slot.roster) {
      const npc = slot.roster.find(r => r.id === character_id);
      if (npc) npc.avatar = avatar;
    }

    db.updateSaveSlot(slot.id, slot);
    res.json({ success: true, slot });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Dynamic NPC Remember / Register into Worldbook ---
app.post('/api/slots/:id/npc/remember', (req, res) => {
  try {
    const { npc } = req.body;
    if (!npc || !npc.name) return res.status(400).json({ error: 'NPC name is required' });

    const registered = db.rememberNPC(req.params.id, npc);
    const updatedSlot = db.getSaveSlotById(req.params.id);
    res.json({ success: true, npc: registered, slot: updatedSlot });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Memory & Fact Management Endpoints ---
app.get('/api/slots/:id/memories', (req, res) => {
  try {
    const memories = memoryEngine.getMemories(req.params.id);
    const facts = memoryEngine.getFacts(req.params.id);
    const slot = db.getSaveSlotById(req.params.id);
    res.json({
      slotId: req.params.id,
      memories,
      facts,
      rolling_summary: slot?.rolling_summary || ''
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/slots/:id/memories/:memId', (req, res) => {
  try {
    memoryEngine.deleteMemory(req.params.id, req.params.memId);
    res.json({ success: true, memoryId: req.params.memId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/slots/:id/facts', (req, res) => {
  try {
    const { subject, predicate, object, confidence } = req.body;
    if (!subject || !predicate || !object) {
      return res.status(400).json({ error: 'Subject, predicate, and object are required' });
    }
    const created = memoryEngine.reconcileFact(req.params.id, {
      subject,
      predicate,
      object,
      confidence: confidence || 0.95
    });
    res.json({ success: true, fact: created });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/slots/:id/facts/:factId', (req, res) => {
  try {
    memoryEngine.deleteFact(req.params.id, req.params.factId);
    res.json({ success: true, factId: req.params.factId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Turn Execution Pipeline ---
app.post('/api/slots/:id/turn', async (req, res) => {
  try {
    const { playerInput, customRoll } = req.body;
    if (!playerInput || !playerInput.text) {
      return res.status(400).json({ error: 'playerInput.text is required' });
    }
    const result = await executeTurnPipeline({
      slotId: req.params.id,
      playerInput: {
        type: playerInput.type === 'Do' ? 'Do' : 'Say',
        text: playerInput.text
      },
      customRoll
    });
    res.json(result);
  } catch (err) {
    console.error('Turn execution error:', err);
    res.status(500).json({ error: err.message });
  }
});

// --- Regenerate ---
app.post('/api/slots/:id/regenerate', async (req, res) => {
  try {
    const { customInstructions } = req.body || {};
    const result = await regenerateNarration({
      slotId: req.params.id,
      customInstructions
    });
    res.json(result);
  } catch (err) {
    console.error('Regenerate error:', err);
    res.status(500).json({ error: err.message });
  }
});

// --- Undo ---
app.post('/api/slots/:id/undo', (req, res) => {
  try {
    const updatedSlot = db.rollbackSnapshot(req.params.id);
    if (!updatedSlot) {
      return res.status(400).json({ error: 'No previous snapshot to undo' });
    }
    res.json({ slot: updatedSlot });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Style Preset ---
app.put('/api/slots/:id/preset', (req, res) => {
  try {
    const { style_preset } = req.body;
    const slot = db.getSaveSlotById(req.params.id);
    if (!slot) return res.status(404).json({ error: 'Slot not found' });
    
    slot.style_preset = { ...slot.style_preset, ...style_preset };
    db.updateSaveSlot(slot.id, slot);
    res.json({ slot });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Inventory ---
app.put('/api/slots/:id/inventory', (req, res) => {
  try {
    const { inventory } = req.body;
    const slot = db.getSaveSlotById(req.params.id);
    if (!slot) return res.status(404).json({ error: 'Slot not found' });
    
    slot.inventory = inventory || [];
    db.updateSaveSlot(slot.id, slot);
    res.json({ slot });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Settings ---
app.get('/api/settings', (req, res) => {
  res.json({ settings: db.getSettings() });
});

app.post('/api/settings', (req, res) => {
  try {
    const updated = db.updateSettings(req.body);
    res.json({ settings: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Verify & Test API Key Connection (DeepSeek / Qwen / OpenRouter / SiliconFlow) ---
function getChatCompletionsUrl(rawBaseURL) {
  let url = (rawBaseURL || 'https://api.deepseek.com').trim().replace(/\/+$/, '');
  if (url.endsWith('/chat/completions')) return url;
  return `${url}/chat/completions`;
}

function normalizeModelName(rawModel, rawBaseURL = '') {
  if (!rawModel) return 'deepseek-chat';
  let m = rawModel.trim();
  const base = (rawBaseURL || '').toLowerCase();
  
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

app.post('/api/settings/verify', async (req, res) => {
  try {
    const { apiKey, baseURL, model } = req.body;
    if (!apiKey || !apiKey.trim()) {
      return res.status(400).json({ success: false, error: 'กรุณากรอก API Key ก่อนทดสอบ' });
    }

    const endpoint = getChatCompletionsUrl(baseURL);
    const cleanModel = normalizeModelName(model || 'deepseek-chat', baseURL);
    const startTime = Date.now();

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey.trim()}`
      },
      body: JSON.stringify({
        model: cleanModel,
        messages: [{ role: 'user', content: 'ตอบว่า "OK" สั้นๆ เพื่อทดสอบระบบ' }],
        max_tokens: 20,
        temperature: 0.1
      })
    });

    const latencyMs = Date.now() - startTime;

    if (!response.ok) {
      const errText = await response.text();
      let parsedErr = errText;
      try {
        const jsonErr = JSON.parse(errText);
        parsedErr = jsonErr.error?.message || jsonErr.message || errText;
      } catch (e) {}
      return res.status(response.status).json({
        success: false,
        error: `AI Provider Error (${response.status}): ${parsedErr}`,
        latencyMs
      });
    }

    const data = await response.json();
    const reply = data.choices && data.choices[0] ? (data.choices[0].message?.content || 'OK') : 'OK';

    res.json({
      success: true,
      message: 'เชื่อมต่อและทดสอบส่งข้อความสำเร็จ!',
      reply: reply.trim(),
      model: cleanModel,
      latencyMs
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: `Network Connection Error: ${err.message}`
    });
  }
});

// Start Server
const PORT = config.port;
const HOST = config.host;
app.listen(PORT, HOST, () => {
  console.log(`=========================================`);
  console.log(` Long Voyage 2.0 (Modern AI Roleplay Architecture)`);
  console.log(` Server running at: http://localhost:${PORT}`);
  console.log(` 9-Tier Memory & Lorebook Engine: ACTIVE`);
  console.log(` Storage: Folder-Based Isolated Saves (data/saves/)`);
  console.log(`=========================================`);
});
