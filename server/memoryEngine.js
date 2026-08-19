/**
 * Long Voyage - Modern AI Roleplay Memory Engine
 * Implements 9-Tier Memory Architecture, Hybrid Vector/Semantic RAG,
 * Recency Decay, Fact Triplet Extraction, and Contradiction Resolution.
 * Based on: "AI Roleplay System Architecture" Reference Document
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

  /**
   * Hybrid RAG Retrieval: Search relevant episodic memories for incoming user turn
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

    const queryTokens = this.tokenize(queryText);
    const scoredMemories = [];

    for (const mem of memories) {
      const memTokens = this.tokenize(`${mem.content} ${mem.entities ? mem.entities.join(' ') : ''}`);
      const similarity = this.computeSimilarity(queryTokens, memTokens);
      
      const turnDistance = Math.max(0, (currentTurnNumber || memories.length) - (mem.turn_number || 0));
      const scoreObj = this.calculateCompositeScore(similarity, turnDistance, mem.importance || 5);

      // Boost score if explicit entity match is detected
      let entityBonus = 0;
      if (entityFilter.length && mem.entities) {
        const matches = entityFilter.filter(e => mem.entities.some(me => me.toLowerCase().includes(e.toLowerCase())));
        if (matches.length > 0) entityBonus = 0.15 * matches.length;
      }

      const finalScore = scoreObj.totalScore + entityBonus;

      if (finalScore >= minThreshold || similarity > 0.35) {
        scoredMemories.push({
          ...mem,
          score: finalScore,
          similarity,
          recencyScore: scoreObj.sRecency,
          importanceScore: scoreObj.sImportance
        });
      }
    }

    // Sort descending by total score
    scoredMemories.sort((a, b) => b.score - a.score);
    return scoredMemories.slice(0, topK);
  }

  /**
   * Add a new episodic memory item
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
      timestamp: new Date().toISOString()
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
      const cleanSub = filterSubject.toLowerCase();
      active = active.filter(f => f.subject && f.subject.toLowerCase().includes(cleanSub));
    }
    return active;
  }

  /**
   * Fact Triplet Engine: Add or reconcile new fact with contradiction detection
   * Implements Section 8.2 (Memory Reconciliation & Contradiction Resolution)
   */
  reconcileFact(slotId, newFactData) {
    const facts = this.getFacts(slotId);
    const { subject, predicate, object, confidence = 0.9, turn_number = 0 } = newFactData;

    if (!subject || !predicate || !object) return null;

    const subNorm = subject.trim().toLowerCase();
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
    // E.g. Subject: "Ren", Predicate: "will_ability", Old: "Unawakened", New: "Wind Manipulation"
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
      subject: subject.trim(),
      predicate: predicate.trim(),
      object: object.trim(),
      confidence: confidence,
      turn_number: turn_number,
      status: 'ACTIVE',
      supersedes: supersededId,
      timestamp: new Date().toISOString()
    };

    facts.push(createdFact);
    this.saveFacts(slotId, facts);
    return createdFact;
  }

  /**
   * Delete or archive a memory
   */
  deleteMemory(slotId, memoryId) {
    const memories = this.getMemories(slotId);
    const updated = memories.filter(m => m.memory_id !== memoryId);
    this.saveMemories(slotId, updated);
    return true;
  }

  /**
   * Delete or archive a fact
   */
  deleteFact(slotId, factId) {
    const facts = this.getFacts(slotId);
    const updated = facts.filter(f => f.id !== factId);
    this.saveFacts(slotId, updated);
    return true;
  }

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
