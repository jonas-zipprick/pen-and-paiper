// mcpserver/src/routes/api.ts

import { Router } from 'express';
import { db } from '../data/mockDatabase';

// Create a new router instance
const router = Router();

/**
 * @api {get} /api/character-sheet Get Character Sheet
 * @apiName GetCharacterSheet
 * @apiGroup MCP
 *
 * @apiSuccess {Object} character The character's full data sheet.
 */
router.get('/character-sheet', (req, res) => {
    console.log(`[${new Date().toISOString()}] GET /api/character-sheet - Request received.`);
    res.status(200).json(db.characterSheet);
});

/**
 * @api {get} /api/voice-context Get Voice Context
 * @apiName GetVoiceContext
 * @apiGroup MCP
 *
 * @apiSuccess {Object} voiceContext The LLM's voice and persona guidelines.
 */
router.get('/voice-context', (req, res) => {
    console.log(`[${new Date().toISOString()}] GET /api/voice-context - Request received.`);
    res.status(200).json(db.voiceContext);
});

/**
 * @api {get} /api/ruleset Get Ruleset
 * @apiName GetRuleset
 * @apiGroup MCP
 *
 * @apiSuccess {Object} ruleSet The game or system rules.
 */
router.get('/ruleset', (req, res) => {
    console.log(`[${new Date().toISOString()}] GET /api/ruleset - Request received.`);
    res.status(200).json(db.ruleSet);
});

export default router;
