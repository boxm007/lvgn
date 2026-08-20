/**
 * Long Voyage - Modern AI Roleplay Memory Engine (UPGRADED)
 * ============================================================
 * Original: 9-Tier Memory Architecture, Hybrid Vector/Semantic RAG,
 *           Recency Decay, Fact Triplet Extraction, Contradiction Resolution.
 *
 * UPGRADE ADDITIONS:
 * - [P0] Entity Alias Resolution (canonical name mapping)
 * - [P0] Progressive Fact Injection (relevance-scored fact retrieval)
 * - [P1] Temporal Metadata (game_day, game_time, game_location)
 * - [P1] Provenance Tracking (source_turn_ids, created_by)
 * - [P1] Soft-Delete (status='DELETED' instead of hard remove)
 * - [P1] Summary Versioning (keeps last 5 rolling summary versions)
 * - [P2] Retrieval Debug Logging (score breakdown per memory)
 * - [P2] Relationship Facts Sync (auto-create relationship triplets)
 * - [P2] Memory Importance Decay (gradual decay for old low-importance)
 */

const fs = require('fs');
const path = require('path');

class MemoryEngine {
  constructor(dataDir) {
    this.dataDir = dataDir || path.join(__dirname, '..', 'data');
    this.weights = {
      similarity: 0.50,
      recency: 0.25,
      importance: 0.25
    };
    this.decayLambda = 0.08; // Exponential decay rate per turn distance
  }

  getSlotDir(slotId) {
    return path.join(this.dataDir, 'saves', slotId);
  }

  /**
   * Helper to ensure memory and facts files exist for a slot
   */
  ensureSlotMemoryStore(slotId) {
    const slotDir = this.getSlotDir(slotId);
    if (!fs.existsSync(slotDir)) {
      fs.mkdirSync(slotDir, { recursive: true });
    }

    const memPath = path.join(slotDir, 'memories.json');
    const factsPath = path.join(slotDir, 'facts.json');

    if (!fs.existsSync(memPath)) {
      fs.writeFileSync(memPath, JSON.stringify([], null, 2), 'utf8');
    }
    if (!fs.existsSync(factsPath)) {
      fs.writeFileSync(factsPath, JSON.stringify([], null, 2), 'utf8');
    }
  }

  // ==========================================
  // ENTITY ALIAS RESOLUTION [P0]
  // ==========================================

  /**
   * Read entity aliases for a slot
   * Format: { "เรน อากิยามะ": ["Ren", "เรน", "เด็กหนุ่มผมเงิน"], ... }
   */
  getAliases(slotId) {
    const aliasPath = path.join(this.getSlotDir(slotId), 'entity_aliases.json');
    try {
      if (fs.existsSync(aliasPath)) {
        return JSON.parse(fs.readFileSync(aliasPath, 'utf8'));
      }
    } catch (e) {
      console.error(`[MemoryEngine] Failed to read aliases for ${slotId}:`, e);
    }
    return {};
  }

  /**
   * Save entity aliases for a slot
   */
  saveAliases(slotId, aliases) {
    this.ensureSlotMemoryStore(slotId);
    const aliasPath = path.join(this.getSlotDir(slotId), 'entity_aliases.json');
    fs.writeFileSync(aliasPath, JSON.stringify(aliases, null, 2), 'utf8');
  }

  /**
   * Register a new alias for a canonical entity name
   */
  registerAlias(slotId, canonicalName, alias) {
    if (!canonicalName || !alias) return;
    const aliases = this.getAliases(slotId);
    const canon = canonicalName.trim();
    const al = alias.trim();
    if (!aliases[canon]) {
      aliases[canon] = [];
    }
    // Don't add duplicate aliases (case-insensitive check)
    const existing = aliases[canon].map(a => a.toLowerCase());
    if (!existing.includes(al.toLowerCase()) && al.toLowerCase() !== canon.toLowerCase()) {
      aliases[canon].push(al);
      this.saveAliases(slotId, aliases);
      console.log(`[MemoryEngine] Alias registered: "${al}" → canonical "${canon}"`);
    }
  }

  /**
   * Resolve an entity name to its canonical form using aliases
   * Returns canonical name if found, otherwise returns original name
   */
  resolveEntity(slotId, name) {
    if (!name) return name;
    const nameNorm = name.trim().toLowerCase();
    const aliases = this.getAliases(slotId);

    // Check if it's already a canonical name
    for (const canon of Object.keys(aliases)) {
      if (canon.toLowerCase() === nameNorm) return canon;
    }

    // Check if it matches any alias
    for (const [canon, aliasList] of Object.entries(aliases)) {
      for (const al of aliasList) {
        if (al.toLowerCase() === nameNorm) return canon;
      }
    }

    return name.trim(); // Return original if no match
  }

  /**
   * Expand entity filter with all known aliases for better retrieval
   */
  expandEntityFilter(slotId, entityFilter) {
    if (!entityFilter || !entityFilter.length) return entityFilter;
    const aliases = this.getAliases(slotId);
    const expanded = new Set(entityFilter.map(e => e.toLowerCase()));

    for (const entity of entityFilter) {
      const resolved = this.resolveEntity(slotId, entity);
      expanded.add(resolved.toLowerCase());

      // Add all aliases of the resolved canonical name
      const canonAliases = aliases[resolved] || [];
      for (const al of canonAliases) {
        expanded.add(al.toLowerCase());
      }
    }

    return Array.from(expanded);
  }

  // ==========================================
  // CORE MEMORY READ/WRITE
  // ==========================================

  /**
   * Read all episodic memories for a slot
   */
  getMemories(slotId) {
    this.ensureSlotMemoryStore(slotId);
    const memPath = path.join(this.getSlotDir(slotId), 'memories.json');
    try {
      return JSON.parse(fs.readFileSync(memPath, 'utf8'));
    } catch (e) {
      console.error(`[MemoryEngine] Failed to read memories for ${slotId}:`, e);
      return [];
    }
  }

  /**
   * Save all episodic memories for a slot
   */
  saveMemories(slotId, memories) {
    this.ensureSlotMemoryStore(slotId);
    const memPath = path.join(this.getSlotDir(slotId), 'memories.json');
    fs.writeFileSync(memPath, JSON.stringify(memories, null, 2), 'utf8');
  }

  /**
   * Read all facts (triplets) for a slot
   */
  getFacts(slotId) {
    this.ensureSlotMemoryStore(slotId);
    const factsPath = path.join(this.getSlotDir(slotId), 'facts.json');
    try {
      return JSON.parse(fs.readFileSync(factsPath, 'utf8'));
    } catch (e) {
      console.error(`[MemoryEngine] Failed to read facts for ${slotId}:`, e);
      return [];
    }
  }

  /**
   * Save all facts for a slot
   */
  saveFacts(slotId, facts) {
    this.ensureSlotMemoryStore(slotId);
    const factsPath = path.join(this.getSlotDir(slotId), 'facts.json');
    fs.writeFileSync(factsPath, JSON.stringify(facts, null, 2), 'utf8');
  }

  // ==========================================
  // TOKENIZER & SIMILARITY
  // ==========================================

  /**
   * Thai + English text tokenizer for hybrid keyword & n-gram matching
   */
  tokenize(text) {
    if (!text || typeof text !== 'string') return [];
    const clean = text.toLowerCase();
    
    // Extract English words and numbers
    const words = clean.match(/[a-zA-Z0-9_]+/g) || [];
    
    // Thai character bi-grams & tri-grams for robust semantic overlap without external dictionary
    const thaiChars = clean.replace(/[a-zA-Z0-9_\s\.,\?!;:\"'()\[\]\{\}\*#\-]/g, '');
    const ngrams = [];
    if (thaiChars.length > 0) {
      // 2-grams
      for (let i = 0; i < thaiChars.length - 1; i++) {
        ngrams.push(thaiChars.substring(i, i + 2));
      }
      // 3-grams
      for (let i = 0; i < thaiChars.length - 2; i++) {
        ngrams.push(thaiChars.substring(i, i + 3));
      }
    }

    return [...words, ...ngrams];
  }

  /**
   * Compute Cosine Similarity between two token sets
   */
  computeSimilarity(queryTokens, docTokens) {
    if (!queryTokens.length || !docTokens.length) return 0;

    const queryFreq = {};
    const docFreq = {};

    queryTokens.forEach(t => queryFreq[t] = (queryFreq[t] || 0) + 1);
    docTokens.forEach(t => docFreq[t] = (docFreq[t] || 0) + 1);

    let dotProduct = 0;
    let queryMag = 0;
    let docMag = 0;

    for (const token in queryFreq) {
      queryMag += queryFreq[token] * queryFreq[token];
      if (docFreq[token]) {
        dotProduct += queryFreq[token] * docFreq[token];
      }
    }

    for (const token in docFreq) {
      docMag += docFreq[token] * docFreq[token];
    }

    if (queryMag === 0 || docMag === 0) return 0;
    return dotProduct / (Math.sqrt(queryMag) * Math.sqrt(docMag));
  }

  /**
   * Calculate Composite Retrieval Score according to Section 9.1:
   * S_retrieval = w1 * S_cosine + w2 * S_recency + w3 * S_importance
   */
  calculateCompositeScore(similarity, turnDistance, importanceRating = 5) {
    // S_recency = e^(-lambda * delta_turn)
    const sRecency = Math.exp(-this.decayLambda * Math.max(0, turnDistance));
    
    // Normalized importance: 1-10 -> 0.1 - 1.0
    const sImportance = Math.min(Math.max(importanceRating, 1), 10) / 10.0;
    
    const sCosine = Math.min(Math.max(similarity, 0), 1.0);

    const totalScore = (this.weights.similarity * sCosine) +
                       (this.weights.recency * sRecency) +
                       (this.weights.importance * sImportance);

    return {
      totalScore,
      sCosine,
      sRecency,
      sImportance
    };
  }

  // ==========================================
  // HYBRID RAG RETRIEVAL [UPGRADED with Debug Logging P2 + Alias Expansion P0]
  // ==========================================

  /**
   * Hybrid RAG Retrieval: Search relevant episodic memories for incoming user turn
   * UPGRADED: Debug info + entity alias expansion
   */
  searchRelevantMemories(slotId, queryText, turnOrOptions = 0, maybeOptions = {}) {
    let currentTurnNumber = 0;
    let options = {};
    if (typeof turnOrOptions === 'object') {
      options = turnOrOptions;
      currentTurnNumber = options.currentTurn || 0;
    } else {
      currentTurnNumber = turnOrOptions || 0;
      options = maybeOptions || {};
    }
    const { topK = 4, minThreshold = 0.20, entityFilter = [] } = options;
    const memories = this.getMemories(slotId).filter(m => m.status === 'ACTIVE');

    if (!memories.length) return [];

    // [P0] Expand entity filter with aliases
    const expandedFilter = this.expandEntityFilter(slotId, entityFilter);

    const queryTokens = this.tokenize(queryText);
    const scoredMemories = [];

    for (const mem of memories) {
      const memTokens = this.tokenize(`${mem.content} ${mem.entities ? mem.entities.join(' ') : ''}`);
      const similarity = this.computeSimilarity(queryTokens, memTokens);
      
      const turnDistance = Math.max(0, (currentTurnNumber || memories.length) - (mem.turn_number || 0));
      const scoreObj = this.calculateCompositeScore(similarity, turnDistance, mem.importance || 5);

      // Boost score if explicit entity match is detected (using expanded aliases)
      let entityBonus = 0;
      if (expandedFilter.length && mem.entities) {
        const matches = expandedFilter.filter(e => mem.entities.some(me => me.toLowerCase().includes(e.toLowerCase())));
        if (matches.length > 0) entityBonus = 0.15 * matches.length;
      }

      const finalScore = scoreObj.totalScore + entityBonus;

      if (finalScore >= minThreshold || similarity > 0.35) {
        // [P2] Debug logging — attach scoring breakdown
        const debugInfo = {
          similarity: Math.round(similarity * 1000) / 1000,
          recency: Math.round(scoreObj.sRecency * 1000) / 1000,
          importance: Math.round(scoreObj.sImportance * 1000) / 1000,
          entityBonus: Math.round(entityBonus * 1000) / 1000,
          totalScore: Math.round(finalScore * 1000) / 1000,
          turnDistance,
          reason: `sim=${(similarity * 100).toFixed(1)}% rec=${(scoreObj.sRecency * 100).toFixed(1)}% imp=${mem.importance || 5}/10` +
                  (entityBonus > 0 ? ` +entity(${entityBonus.toFixed(2)})` : '')
        };

        scoredMemories.push({
          ...mem,
          score: finalScore,
          similarity,
          recencyScore: scoreObj.sRecency,
          importanceScore: scoreObj.sImportance,
          debug: debugInfo
        });
      }
    }

    // Sort descending by total score
    scoredMemories.sort((a, b) => b.score - a.score);

    const results = scoredMemories.slice(0, topK);
    if (results.length > 0) {
      console.log(`[MemoryEngine] Retrieved ${results.length} memories for query "${queryText.substring(0, 50)}..." → scores: [${results.map(r => r.debug.totalScore).join(', ')}]`);
    }

    return results;
  }

  // ==========================================
  // EPISODIC MEMORY MANAGEMENT [UPGRADED with Temporal + Provenance P1]
  // ==========================================

  /**
   * Add a new episodic memory item
   * UPGRADED: game_day, game_time, game_location, source_turn_ids, created_by
   */
  addEpisodicMemory(slotId, memoryItem) {
    const memories = this.getMemories(slotId);
    const newMemory = {
      memory_id: `mem_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      turn_number: memoryItem.turn_number || memories.length + 1,
      content: memoryItem.content,
      importance: memoryItem.importance || 5,
      emotional_valence: memoryItem.emotional_valence || 'neutral',
      entities: memoryItem.entities || [],
      location: memoryItem.location || '',
      status: 'ACTIVE',
      timestamp: new Date().toISOString(),
      // [P1] Temporal metadata
      game_day: memoryItem.game_day || null,
      game_time: memoryItem.game_time || null,
      game_location: memoryItem.game_location || '',
      // [P1] Provenance
      source_turn_ids: memoryItem.source_turn_ids || [],
      created_by: memoryItem.created_by || 'ai_extractor'
    };

    memories.push(newMemory);
    this.saveMemories(slotId, memories);
    return newMemory;
  }

  /**
   * Retrieve active facts (Semantic Memory & Relationships)
   */
  getActiveFacts(slotId, filterSubject = null) {
    const facts = this.getFacts(slotId);
    let active = facts.filter(f => f.status === 'ACTIVE');
    if (filterSubject) {
      // [P0] Resolve entity alias before filtering
      const resolved = this.resolveEntity(slotId, filterSubject);
      const cleanSub = resolved.toLowerCase();
      active = active.filter(f => f.subject && f.subject.toLowerCase().includes(cleanSub));
    }
    return active;
  }

  // ==========================================
  // PROGRESSIVE FACT INJECTION [P1]
  // ==========================================

  /**
   * Get relevant facts scored by query relevance + always include high-confidence canonical facts
   * Replaces dumping ALL active facts into prompt
   */
  getRelevantFacts(slotId, queryText, options = {}) {
    const { topK = 10, alwaysIncludeHighConfidence = true, minConfidence = 0.9 } = options;
    const allActive = this.getActiveFacts(slotId);

    if (allActive.length <= topK) return allActive; // If few facts, return all

    const queryTokens = this.tokenize(queryText);
    const scored = [];
    const highConfidence = [];

    for (const fact of allActive) {
      // Always include high-confidence canonical facts
      if (alwaysIncludeHighConfidence && fact.confidence >= minConfidence) {
        highConfidence.push(fact);
        continue;
      }

      const factText = `${fact.subject} ${fact.predicate} ${fact.object}`;
      const factTokens = this.tokenize(factText);
      const similarity = this.computeSimilarity(queryTokens, factTokens);

      scored.push({ ...fact, _relevanceScore: similarity });
    }

    // Sort by relevance
    scored.sort((a, b) => b._relevanceScore - a._relevanceScore);

    // Combine: high-confidence + top relevant (deduped)
    const highConfIds = new Set(highConfidence.map(f => f.id));
    const topRelevant = scored.filter(f => !highConfIds.has(f.id)).slice(0, topK - highConfidence.length);

    const result = [...highConfidence, ...topRelevant];
    // Clean internal score
    result.forEach(f => delete f._relevanceScore);

    console.log(`[MemoryEngine] Progressive facts: ${highConfidence.length} canonical + ${topRelevant.length} relevant out of ${allActive.length} total active`);
    return result;
  }

  // ==========================================
  // FACT RECONCILIATION [UPGRADED with Alias Resolution P0 + Provenance P1]
  // ==========================================

  /**
   * Fact Triplet Engine: Add or reconcile new fact with contradiction detection
   * UPGRADED: Entity alias resolution + temporal metadata + provenance
   */
  reconcileFact(slotId, newFactData) {
    const facts = this.getFacts(slotId);
    const { subject, predicate, object, confidence = 0.9, turn_number = 0 } = newFactData;

    if (!subject || !predicate || !object) return null;

    // [P0] Resolve entity alias for subject before matching
    const resolvedSubject = this.resolveEntity(slotId, subject);

    const subNorm = resolvedSubject.trim().toLowerCase();
    const predNorm = predicate.trim().toLowerCase();
    const objNorm = object.trim().toLowerCase();

    // Check for exact duplicate
    const exactMatch = facts.find(f => 
      f.status === 'ACTIVE' &&
      f.subject.toLowerCase() === subNorm &&
      f.predicate.toLowerCase() === predNorm &&
      f.object.toLowerCase() === objNorm
    );

    if (exactMatch) {
      // Just update confidence and timestamp
      exactMatch.confidence = Math.max(exactMatch.confidence, confidence);
      exactMatch.timestamp = new Date().toISOString();
      this.saveFacts(slotId, facts);
      return exactMatch;
    }

    // Check for potential contradiction on the same (subject + predicate)
    const conflictingFacts = facts.filter(f =>
      f.status === 'ACTIVE' &&
      f.subject.toLowerCase() === subNorm &&
      f.predicate.toLowerCase() === predNorm
    );

    const newId = `fact_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    let supersededId = null;

    if (conflictingFacts.length > 0) {
      for (const oldFact of conflictingFacts) {
        oldFact.status = 'SUPERSEDED';
        oldFact.superseded_by = newId;
        oldFact.superseded_at = new Date().toISOString();
        supersededId = oldFact.id;
        console.log(`[MemoryEngine] Fact ${oldFact.id} superseded by ${newId} (${oldFact.subject} - ${oldFact.predicate}: "${oldFact.object}" -> "${object}")`);
      }
    }

    const createdFact = {
      id: newId,
      subject: resolvedSubject.trim(),  // Use resolved canonical name
      predicate: predicate.trim(),
      object: object.trim(),
      confidence: confidence,
      turn_number: turn_number,
      status: 'ACTIVE',
      supersedes: supersededId,
      timestamp: new Date().toISOString(),
      // [P1] Temporal metadata
      game_day: newFactData.game_day || null,
      game_time: newFactData.game_time || null,
      game_location: newFactData.game_location || '',
      // [P1] Provenance
      source_turn_ids: newFactData.source_turn_ids || [],
      created_by: newFactData.created_by || 'ai_extractor'
    };

    facts.push(createdFact);
    this.saveFacts(slotId, facts);
    return createdFact;
  }

  // ==========================================
  // SOFT-DELETE [P1] — Archive instead of hard-delete
  // ==========================================

  /**
   * Soft-delete a memory — sets status to DELETED instead of removing
   */
  deleteMemory(slotId, memoryId) {
    const memories = this.getMemories(slotId);
    const target = memories.find(m => m.memory_id === memoryId);
    if (target) {
      target.status = 'DELETED';
      target.deleted_at = new Date().toISOString();
      this.saveMemories(slotId, memories);
      console.log(`[MemoryEngine] Memory ${memoryId} soft-deleted`);
    }
    return true;
  }

  /**
   * Soft-delete a fact — sets status to DELETED instead of removing
   */
  deleteFact(slotId, factId) {
    const facts = this.getFacts(slotId);
    const target = facts.find(f => f.id === factId);
    if (target) {
      target.status = 'DELETED';
      target.deleted_at = new Date().toISOString();
      this.saveFacts(slotId, facts);
      console.log(`[MemoryEngine] Fact ${factId} soft-deleted`);
    }
    return true;
  }

  // ==========================================
  // SUMMARY VERSIONING [P1]
  // ==========================================

  /**
   * Read summary history for a slot (stored in state.json)
   */
  getSummaryHistory(slotId) {
    const statePath = path.join(this.getSlotDir(slotId), 'state.json');
    try {
      if (fs.existsSync(statePath)) {
        const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
        return state.summary_history || [];
      }
    } catch (e) {
      console.error(`[MemoryEngine] Failed to read summary history for ${slotId}:`, e);
    }
    return [];
  }

  /**
   * Push current summary to version history before overwriting (keeps last 5)
   */
  pushSummaryVersion(slotId, currentSummary) {
    if (!currentSummary) return;
    const statePath = path.join(this.getSlotDir(slotId), 'state.json');
    try {
      let state = {};
      if (fs.existsSync(statePath)) {
        state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
      }
      if (!state.summary_history) state.summary_history = [];
      state.summary_history.push({
        summary: currentSummary,
        archived_at: new Date().toISOString()
      });
      // Keep only last 5 versions
      if (state.summary_history.length > 5) {
        state.summary_history = state.summary_history.slice(-5);
      }
      fs.writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf8');
      console.log(`[MemoryEngine] Summary version archived (${state.summary_history.length}/5 slots used)`);
    } catch (e) {
      console.error(`[MemoryEngine] Failed to push summary version:`, e);
    }
  }

  // ==========================================
  // MEMORY IMPORTANCE DECAY [P2]
  // ==========================================

  /**
   * Apply gradual importance decay to old, low-importance memories
   * - importance < 5 and age > 20 turns: reduce by 0.5 (min 1)
   * - importance < 3 and age > 40 turns: reduce by 1.0 (min 1)
   */
  applyImportanceDecay(slotId, currentTurn) {
    const memories = this.getMemories(slotId);
    let decayCount = 0;

    for (const mem of memories) {
      if (mem.status !== 'ACTIVE') continue;
      const age = Math.max(0, currentTurn - (mem.turn_number || 0));

      if (mem.importance < 3 && age > 40) {
        mem.importance = Math.max(1, mem.importance - 1.0);
        decayCount++;
      } else if (mem.importance < 5 && age > 20) {
        mem.importance = Math.max(1, mem.importance - 0.5);
        decayCount++;
      }
    }

    if (decayCount > 0) {
      this.saveMemories(slotId, memories);
      console.log(`[MemoryEngine] Importance decay applied to ${decayCount} memories`);
    }
  }

  // ==========================================
  // RELATIONSHIP FACTS SYNC [P2]
  // ==========================================

  /**
   * Sync relationship state as a fact triplet when relationship changes
   */
  syncRelationshipFact(slotId, npcName, relationshipStatus, relationshipValue, turnNumber, scene = {}) {
    if (!npcName || !relationshipStatus) return;

    this.reconcileFact(slotId, {
      subject: npcName,
      predicate: 'relationship_with_player',
      object: `${relationshipStatus} (ค่า: ${relationshipValue})`,
      confidence: 0.95,
      turn_number: turnNumber,
      game_day: scene.day || null,
      game_time: scene.time || null,
      game_location: scene.location || '',
      source_turn_ids: [],
      created_by: 'system_relationship_sync'
    });
  }

  // ==========================================
  // TOKEN BUDGETING & PRIORITY PYRAMID CONTEXT ASSEMBLER
  // ==========================================

  /**
   * Token Budgeting & Priority Pyramid Context Assembler (Section 7.1 & 7.2)
   */
  assemblePriorityContext({
    maxContextTokens = 8192,
    generationReserveTokens = 1500,
    systemPrompt = '',
    characterCore = '',
    worldScenario = '',
    dialogueExamples = '',
    lorebookInjections = [],
    retrievedMemories = [],
    activeFacts = [],
    recentHistory = [],
    authorsNote = '',
    userInput = '',
    postHistoryInstructions = ''
  }) {
    // 1. Calculate fixed budget
    const maxAvailable = maxContextTokens - generationReserveTokens;

    // Approximate token count (1 token ~= 3.2 Thai/Eng characters)
    const estimateTokens = (str) => Math.ceil((str || '').length / 3.2);

    const fixedOverhead = estimateTokens(systemPrompt) +
                          estimateTokens(characterCore) +
                          estimateTokens(worldScenario) +
                          estimateTokens(userInput) +
                          estimateTokens(postHistoryInstructions);

    let remainingTokens = Math.max(500, maxAvailable - fixedOverhead);

    // 2. Lorebook Budget: up to 25% of available
    const loreBudget = Math.floor(remainingTokens * 0.25);
    let loreText = '';
    let loreTokens = 0;
    for (const entry of lorebookInjections) {
      const entryStr = `[ความรู้โลก / ลอเร่: ${entry.title}]\n${entry.content}\n\n`;
      const cost = estimateTokens(entryStr);
      if (loreTokens + cost <= loreBudget) {
        loreText += entryStr;
        loreTokens += cost;
      }
    }
    remainingTokens -= loreTokens;

    // 3. Memory & Facts Budget: up to 25% of remaining
    const memoryBudget = Math.floor(remainingTokens * 0.25);
    let memoryText = '';
    let memTokens = 0;

    if (activeFacts.length > 0) {
      const factsHeader = `📌 [ข้อเท็จจริงสำคัญที่ต้องยึดถือ (Active Canon Facts)]:\n` +
        activeFacts.map(f => `• ${f.subject} ${f.predicate} ${f.object}`).join('\n') + '\n\n';
      const cost = estimateTokens(factsHeader);
      if (memTokens + cost <= memoryBudget) {
        memoryText += factsHeader;
        memTokens += cost;
      }
    }

    if (retrievedMemories.length > 0) {
      const memsHeader = `🧠 [ความทรงจำที่นึกขึ้นได้จากเหตุการณ์ในอดีต (Retrieved Episodic Memories)]:\n` +
        retrievedMemories.map(m => `• (เทิร์นที่ ${m.turn_number}) ${m.content}`).join('\n') + '\n\n';
      const cost = estimateTokens(memsHeader);
      if (memTokens + cost <= memoryBudget) {
        memoryText += memsHeader;
        memTokens += cost;
      }
    }
    remainingTokens -= memTokens;

    // 4. Few-Shot Examples Budget
    let examplesText = '';
    if (dialogueExamples) {
      const cost = estimateTokens(dialogueExamples);
      if (cost <= remainingTokens * 0.15) {
        examplesText = `${dialogueExamples}\n\n`;
        remainingTokens -= cost;
      }
    }

    // 5. Chat History Buffer: Consume remaining for sliding window
    const historyBlocks = [];
    for (let i = recentHistory.length - 1; i >= 0; i--) {
      const turn = recentHistory[i];
      const prefix = turn.role === 'user' ? 'ผู้เล่น (Player):' : 'ผู้เล่าเรื่อง/ตัวละคร:';
      const turnStr = `${prefix} ${turn.content}\n\n`;
      const cost = estimateTokens(turnStr);
      if (remainingTokens - cost > 100) {
        historyBlocks.unshift(turnStr);
        remainingTokens -= cost;
      } else {
        break;
      }
    }

    return {
      systemPrompt,
      characterCore,
      worldScenario,
      loreText,
      memoryText,
      examplesText,
      historyText: historyBlocks.join(''),
      authorsNote,
      userInput,
      postHistoryInstructions,
      estimatedTotalTokens: maxAvailable - remainingTokens
    };
  }
}

module.exports = MemoryEngine;
