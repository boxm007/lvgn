const fs = require('fs');
const path = require('path');
const config = require('./config');

const DATA_DIR = config.dataDir;
const WORLDS_FILE = path.join(DATA_DIR, 'worlds.json');
const CHARACTERS_FILE = path.join(DATA_DIR, 'characters.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');
const SAVES_DIR = path.join(DATA_DIR, 'saves');

// Ensure root and saves directories exist
[DATA_DIR, SAVES_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

class Database {
  constructor() {
    this.worlds = [];
    this.characters = [];
    this.settings = {
      apiKey: config.deepseek.apiKey,
      baseURL: config.deepseek.baseURL,
      model: config.deepseek.model,
      temperature: config.deepseek.temperature,
      maxTokens: 500,
      fastMode: true
    };
    this.loadGlobalData();
  }

  loadGlobalData() {
    try {
      if (fs.existsSync(WORLDS_FILE)) {
        this.worlds = JSON.parse(fs.readFileSync(WORLDS_FILE, 'utf8'));
      }
      if (fs.existsSync(CHARACTERS_FILE)) {
        this.characters = JSON.parse(fs.readFileSync(CHARACTERS_FILE, 'utf8'));
      }
      if (fs.existsSync(SETTINGS_FILE)) {
        this.settings = { ...this.settings, ...JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8')) };
      }
    } catch (err) {
      console.error('Error loading global DB files:', err);
    }
  }

  saveGlobalData() {
    try {
      fs.writeFileSync(WORLDS_FILE, JSON.stringify(this.worlds, null, 2), 'utf8');
      fs.writeFileSync(CHARACTERS_FILE, JSON.stringify(this.characters, null, 2), 'utf8');
      fs.writeFileSync(SETTINGS_FILE, JSON.stringify(this.settings, null, 2), 'utf8');
    } catch (err) {
      console.error('Error saving global DB files:', err);
    }
  }

  // ==========================================
  // WORLD METHODS
  // ==========================================
  getWorlds() {
    return this.worlds;
  }

  getWorldById(worldId) {
    return this.worlds.find(w => w.id === worldId);
  }

  createWorld(world) {
    const newWorld = {
      id: world.id || 'world_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      name: world.name,
      description: world.description || '',
      tag: world.tag || 'Fantasy',
      cover_image: world.cover_image || '',
      lore_details: world.lore_details || {
        geography: '',
        magic_rules: '',
        factions: '',
        custom_lore: ''
      },
      created_at: new Date().toISOString(),
      creator: world.creator || 'user'
    };
    this.worlds.push(newWorld);
    this.saveGlobalData();
    return newWorld;
  }

  // ==========================================
  // CHARACTER METHODS
  // ==========================================
  getCharacters(worldId) {
    if (worldId) {
      return this.characters.filter(c => c.world_id === worldId);
    }
    return this.characters;
  }

  getCharacterById(characterId) {
    return this.characters.find(c => c.id === characterId);
  }

  createCharacter(character) {
    const newChar = {
      id: character.id || 'char_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      world_id: character.world_id,
      name: character.name,
      short_desc: character.short_desc || '',
      avatar: character.avatar || '',
      personality_tags: character.personality_tags || [],
      opening_prologue: character.opening_prologue || '',
      static_profile: character.static_profile || {
        history: '',
        base_stats: { strength: 10, agility: 10, intelligence: 10, charisma: 10, perception: 10 }
      },
      dynamic_state: character.dynamic_state || {
        relationship_value: 0,
        relationship_status: 'เป็นกลาง',
        current_emotion: 'ปกติ'
      },
      initial_inventory: character.initial_inventory || ['เหรียญเงิน 100 เหรียญ', 'แผนที่เก่า 1 แผ่น'],
      codex_notes: character.codex_notes || [],
      creator: character.creator || 'user'
    };
    this.characters.push(newChar);
    this.saveGlobalData();
    return newChar;
  }

  // ==========================================
  // FOLDER-BASED SAVE SLOT SYSTEM (100% ISOLATED DIRECTORIES)
  // ==========================================
  getSlotDir(slotId) {
    return path.join(SAVES_DIR, slotId);
  }

  getSaveSlots(worldId, characterId) {
    const slots = [];
    if (!fs.existsSync(SAVES_DIR)) return slots;

    const folders = fs.readdirSync(SAVES_DIR, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    for (const folder of folders) {
      try {
        const slot = this.readSlotFromFolder(folder);
        if (slot) {
          let match = true;
          if (worldId) match = match && slot.world_id === worldId;
          if (characterId) match = match && slot.character_id === characterId;
          if (match) slots.push(slot);
        }
      } catch (err) {
        console.warn(`Skipping invalid slot folder ${folder}:`, err.message);
      }
    }

    return slots.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
  }

  getSaveSlotById(slotId) {
    return this.readSlotFromFolder(slotId);
  }

  readSlotFromFolder(slotId) {
    const slotPath = this.getSlotDir(slotId);
    if (!fs.existsSync(slotPath)) return null;

    try {
      const metadata = JSON.parse(fs.readFileSync(path.join(slotPath, 'metadata.json'), 'utf8'));
      const state = fs.existsSync(path.join(slotPath, 'state.json')) ? JSON.parse(fs.readFileSync(path.join(slotPath, 'state.json'), 'utf8')) : {};
      const history = fs.existsSync(path.join(slotPath, 'history.json')) ? JSON.parse(fs.readFileSync(path.join(slotPath, 'history.json'), 'utf8')) : [];
      const inventory = fs.existsSync(path.join(slotPath, 'inventory.json')) ? JSON.parse(fs.readFileSync(path.join(slotPath, 'inventory.json'), 'utf8')) : [];
      const codex = fs.existsSync(path.join(slotPath, 'codex.json')) ? JSON.parse(fs.readFileSync(path.join(slotPath, 'codex.json'), 'utf8')) : { notes: [], discovered_npcs: [] };
      const preset = fs.existsSync(path.join(slotPath, 'preset.json')) ? JSON.parse(fs.readFileSync(path.join(slotPath, 'preset.json'), 'utf8')) : {};
      const snapshots = fs.existsSync(path.join(slotPath, 'snapshots.json')) ? JSON.parse(fs.readFileSync(path.join(slotPath, 'snapshots.json'), 'utf8')) : [];

      const defaultScene = { day: 1, time: "08:30", location: "จุดเริ่มต้น" };
      const loadedState = state.dynamic_state || { relationship_value: 0, relationship_status: 'เป็นกลาง', current_emotion: 'ปกติ' };
      if (!loadedState.scene) loadedState.scene = defaultScene;

      return {
        ...metadata,
        dynamic_state: loadedState,
        inventory: inventory,
        codex_notes: codex.notes || [],
        discovered_npcs: codex.discovered_npcs || [],
        style_preset: preset,
        rolling_summary: state.rolling_summary || '',
        history: history,
        snapshots: snapshots
      };
    } catch (err) {
      console.error(`Error reading slot from folder ${slotId}:`, err);
      return null;
    }
  }

  createSaveSlot(worldId, characterId, slotName) {
    const character = this.getCharacterById(characterId);
    const world = this.getWorldById(worldId);
    if (!character) throw new Error('Character not found');

    const slotId = 'slot_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
    const slotFolder = this.getSlotDir(slotId);
    fs.mkdirSync(slotFolder, { recursive: true });

    const initialHistory = [];
    if (character.opening_prologue && character.opening_prologue.trim()) {
      initialHistory.push({
        id: 'msg_prologue_' + Date.now(),
        role: 'assistant',
        is_prologue: true,
        content: `📍 **[ วันที่ 1 | เวลา 08:30 น. | สถานที่: ${world ? world.name : 'จุดเริ่มต้น'} ]**\n\n` + character.opening_prologue.trim(),
        scene: { day: 1, time: "08:30", location: world ? world.name : "จุดเริ่มต้น" },
        timestamp: new Date().toISOString()
      });
    }

    const metadata = {
      id: slotId,
      world_id: worldId,
      character_id: characterId,
      slot_name: slotName || `การเดินทาง ${new Date().toLocaleDateString('th-TH')}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const initialDynamicState = JSON.parse(JSON.stringify(character.dynamic_state || { relationship_value: 0, relationship_status: 'เป็นกลาง', current_emotion: 'ปกติ' }));
    if (!initialDynamicState.scene) {
      initialDynamicState.scene = { day: 1, time: "08:30", location: world ? world.name : "จุดเริ่มต้น" };
    }

    const state = {
      dynamic_state: initialDynamicState,
      rolling_summary: ''
    };

    const inventory = JSON.parse(JSON.stringify(character.initial_inventory || []));
    const codex = {
      notes: JSON.parse(JSON.stringify(character.codex_notes || [])),
      discovered_npcs: []
    };

    const preset = {
      preset_name: 'ดราม่าเข้มข้น (Drama)',
      tone_directive: 'เข้มข้น ดราม่า สมจริง มีมิติทางจิตวิทยาและอารมณ์ที่จับต้องได้',
      prose_style: 'สำนวนภาษาไทยสละสลวย บรรยายฉากและประสาทสัมผัสคมชัด บทสนทนามีน้ำหนัก',
      pacing: 'จังหวะการเล่าเป็นธรรมชาติ ไม่เร่งรีบ ให้เวลากับความเงียบและอารมณ์ตกค้าง',
      pronoun_pov: 'บุคคลที่ 2 (คุณ) สำหรับผู้เล่น และบุคคลที่ 3 สำหรับตัวละคร',
      max_response_tokens: 500
    };

    fs.writeFileSync(path.join(slotFolder, 'metadata.json'), JSON.stringify(metadata, null, 2), 'utf8');
    fs.writeFileSync(path.join(slotFolder, 'state.json'), JSON.stringify(state, null, 2), 'utf8');
    fs.writeFileSync(path.join(slotFolder, 'history.json'), JSON.stringify(initialHistory, null, 2), 'utf8');
    fs.writeFileSync(path.join(slotFolder, 'inventory.json'), JSON.stringify(inventory, null, 2), 'utf8');
    fs.writeFileSync(path.join(slotFolder, 'codex.json'), JSON.stringify(codex, null, 2), 'utf8');
    fs.writeFileSync(path.join(slotFolder, 'preset.json'), JSON.stringify(preset, null, 2), 'utf8');
    fs.writeFileSync(path.join(slotFolder, 'snapshots.json'), JSON.stringify([], null, 2), 'utf8');

    return this.readSlotFromFolder(slotId);
  }

  updateSaveSlot(slotId, updates) {
    const slotFolder = this.getSlotDir(slotId);
    if (!fs.existsSync(slotFolder)) return null;

    const current = this.readSlotFromFolder(slotId);
    if (!current) return null;

    const merged = { ...current, ...updates, updated_at: new Date().toISOString() };

    const metadata = {
      id: merged.id,
      world_id: merged.world_id,
      character_id: merged.character_id,
      slot_name: merged.slot_name,
      created_at: merged.created_at,
      updated_at: merged.updated_at
    };

    const state = {
      dynamic_state: merged.dynamic_state,
      rolling_summary: merged.rolling_summary || ''
    };

    const codex = {
      notes: merged.codex_notes || [],
      discovered_npcs: merged.discovered_npcs || []
    };

    fs.writeFileSync(path.join(slotFolder, 'metadata.json'), JSON.stringify(metadata, null, 2), 'utf8');
    fs.writeFileSync(path.join(slotFolder, 'state.json'), JSON.stringify(state, null, 2), 'utf8');
    fs.writeFileSync(path.join(slotFolder, 'history.json'), JSON.stringify(merged.history || [], null, 2), 'utf8');
    fs.writeFileSync(path.join(slotFolder, 'inventory.json'), JSON.stringify(merged.inventory || [], null, 2), 'utf8');
    fs.writeFileSync(path.join(slotFolder, 'codex.json'), JSON.stringify(codex, null, 2), 'utf8');
    if (merged.style_preset) {
      fs.writeFileSync(path.join(slotFolder, 'preset.json'), JSON.stringify(merged.style_preset, null, 2), 'utf8');
    }
    if (updates.snapshots !== undefined) {
      fs.writeFileSync(path.join(slotFolder, 'snapshots.json'), JSON.stringify(updates.snapshots, null, 2), 'utf8');
    }

    return merged;
  }

  deleteSaveSlot(slotId) {
    const slotFolder = this.getSlotDir(slotId);
    if (fs.existsSync(slotFolder)) {
      fs.rmSync(slotFolder, { recursive: true, force: true });
      return true;
    }
    return false;
  }

  // ==========================================
  // DYNAMIC NPC REMEMBER / CODEX REGISTRATION
  // ==========================================
  rememberNPC(slotId, npcData) {
    const slot = this.getSaveSlotById(slotId);
    if (!slot) throw new Error('Slot not found');

    if (!slot.discovered_npcs) slot.discovered_npcs = [];

    const existingIndex = slot.discovered_npcs.findIndex(n => n.name.toLowerCase() === npcData.name.toLowerCase());
    const newNPC = {
      id: 'npc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 3),
      name: npcData.name,
      role: npcData.role || 'ตัวละครที่พบในการเดินทาง',
      brief_desc: npcData.brief_desc || '',
      personality_tags: npcData.personality_tags || ['เพิ่งพบเจอ'],
      avatar: npcData.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop',
      relationship_value: 0,
      relationship_status: 'คนแปลกหน้าที่น่าสนใจ',
      discovered_at: new Date().toISOString()
    };

    if (existingIndex >= 0) {
      slot.discovered_npcs[existingIndex] = { ...slot.discovered_npcs[existingIndex], ...newNPC };
    } else {
      slot.discovered_npcs.push(newNPC);
    }

    // Also add to codex notes for quick lookup
    if (!slot.codex_notes) slot.codex_notes = [];
    slot.codex_notes.push({
      id: 'codex_npc_' + Date.now(),
      title: `[ตัวละครที่พบ] ${newNPC.name}`,
      content: `${newNPC.role} — ${newNPC.brief_desc}`,
      unlocked: true,
      hint: 'บันทึกจากการพบเจอในการเดินทาง'
    });

    this.updateSaveSlot(slotId, slot);
    return newNPC;
  }

  // ==========================================
  // SNAPSHOT & ROLLBACK ENGINE
  // ==========================================
  pushSnapshot(slotId) {
    const slotPath = this.getSlotDir(slotId);
    if (!fs.existsSync(slotPath)) return;

    const current = this.readSlotFromFolder(slotId);
    if (!current) return;

    const snapshots = current.snapshots || [];
    const snapshot = {
      timestamp: new Date().toISOString(),
      dynamic_state: JSON.parse(JSON.stringify(current.dynamic_state)),
      inventory: JSON.parse(JSON.stringify(current.inventory)),
      codex_notes: JSON.parse(JSON.stringify(current.codex_notes)),
      discovered_npcs: JSON.parse(JSON.stringify(current.discovered_npcs || [])),
      rolling_summary: current.rolling_summary,
      history_length: current.history.length
    };

    snapshots.push(snapshot);
    if (snapshots.length > 20) {
      snapshots.shift();
    }
    fs.writeFileSync(path.join(slotPath, 'snapshots.json'), JSON.stringify(snapshots, null, 2), 'utf8');
  }

  rollbackSnapshot(slotId) {
    const slotPath = this.getSlotDir(slotId);
    if (!fs.existsSync(slotPath)) return null;

    const slot = this.readSlotFromFolder(slotId);
    if (!slot || !slot.snapshots || slot.snapshots.length === 0) {
      return null;
    }

    const lastSnapshot = slot.snapshots.pop();
    slot.dynamic_state = lastSnapshot.dynamic_state;
    slot.inventory = lastSnapshot.inventory;
    slot.codex_notes = lastSnapshot.codex_notes;
    slot.discovered_npcs = lastSnapshot.discovered_npcs || [];
    slot.rolling_summary = lastSnapshot.rolling_summary;
    slot.history = slot.history.slice(0, lastSnapshot.history_length);

    fs.writeFileSync(path.join(slotPath, 'snapshots.json'), JSON.stringify(slot.snapshots, null, 2), 'utf8');
    this.updateSaveSlot(slotId, slot);
    return slot;
  }

  // ==========================================
  // SETTINGS
  // ==========================================
  getSettings() {
    return this.settings;
  }

  updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    this.saveGlobalData();
    return this.settings;
  }
}

const db = new Database();
module.exports = db;
