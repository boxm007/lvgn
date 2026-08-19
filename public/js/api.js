/**
 * LONG VOYAGE — API CLIENT MODULE (2.0.0)
 * Modern AI Roleplay Engine Architecture
 */

const API = {
  baseURL: '',

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    const config = {
      ...options,
      headers
    };

    if (config.body && typeof config.body === 'object') {
      config.body = JSON.stringify(config.body);
    }

    const res = await fetch(url, config);
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || `HTTP error ${res.status}`);
    }

    return data;
  },

  // Worlds
  getWorlds() {
    return this.request('/api/worlds');
  },
  createWorld(payload) {
    return this.request('/api/worlds', { method: 'POST', body: payload });
  },
  createAdvancedWorld(world, characters) {
    return this.request('/api/worlds/advanced', {
      method: 'POST',
      body: { world, characters }
    });
  },
  getWorldLorebook(worldId) {
    return this.request(`/api/lorebook/${worldId}`);
  },

  // Worldbook & AI Utilities
  analyzeWorldbook(content) {
    return this.request('/api/worldbook/analyze', {
      method: 'POST',
      body: { content }
    });
  },
  generateAIPrologue(payload) {
    return this.request('/api/ai/generate-prologue', {
      method: 'POST',
      body: payload
    });
  },

  // Characters
  getCharacters(worldId) {
    return this.request(`/api/characters?world_id=${worldId || ''}`);
  },
  createCharacter(payload) {
    return this.request('/api/characters', { method: 'POST', body: payload });
  },
  updateCharacter(characterId, payload) {
    return this.request(`/api/characters/${characterId}`, {
      method: 'PUT',
      body: payload
    });
  },

  // Save Slots (Folder-Based Isolated Saves)
  getSlots(worldId, characterId) {
    return this.request(`/api/slots?world_id=${worldId || ''}&character_id=${characterId || ''}`);
  },
  getSlot(slotId) {
    return this.request(`/api/slots/${slotId}`);
  },
  createSlot(payload) {
    return this.request('/api/slots', { method: 'POST', body: payload });
  },
  deleteSlot(slotId) {
    return this.request(`/api/slots/${slotId}`, { method: 'DELETE' });
  },
  updateSlotAvatar(slotId, avatar, characterId = null) {
    return this.request(`/api/slots/${slotId}/character/avatar`, {
      method: 'PUT',
      body: { avatar, character_id: characterId }
    });
  },

  // Memory & Facts Management
  getSlotMemories(slotId) {
    return this.request(`/api/slots/${slotId}/memories`);
  },
  deleteMemory(slotId, memId) {
    return this.request(`/api/slots/${slotId}/memories/${memId}`, {
      method: 'DELETE'
    });
  },
  addFact(slotId, fact) {
    return this.request(`/api/slots/${slotId}/facts`, {
      method: 'POST',
      body: fact
    });
  },
  deleteFact(slotId, factId) {
    return this.request(`/api/slots/${slotId}/facts/${factId}`, {
      method: 'DELETE'
    });
  },

  // Dynamic NPC Discovery
  rememberNPC(slotId, npc) {
    return this.request(`/api/slots/${slotId}/npc/remember`, {
      method: 'POST',
      body: { npc }
    });
  },

  // Turn Pipeline
  sendTurn(slotId, playerInput, customRoll) {
    return this.request(`/api/slots/${slotId}/turn`, {
      method: 'POST',
      body: { playerInput, customRoll }
    });
  },

  // Regenerate
  regenerate(slotId, customInstructions) {
    return this.request(`/api/slots/${slotId}/regenerate`, {
      method: 'POST',
      body: { customInstructions }
    });
  },

  // Undo
  undoTurn(slotId) {
    return this.request(`/api/slots/${slotId}/undo`, { method: 'POST' });
  },

  // Style Preset
  updatePreset(slotId, style_preset) {
    return this.request(`/api/slots/${slotId}/preset`, {
      method: 'PUT',
      body: { style_preset }
    });
  },

  // Inventory
  updateInventory(slotId, inventory) {
    return this.request(`/api/slots/${slotId}/inventory`, {
      method: 'PUT',
      body: { inventory }
    });
  },

  // Settings & Verification
  getSettings() {
    return this.request('/api/settings');
  },
  saveSettings(settings) {
    return this.request('/api/settings', {
      method: 'POST',
      body: settings
    });
  },
  verifySettings(payload) {
    return this.request('/api/settings/verify', {
      method: 'POST',
      body: payload
    });
  }
};
