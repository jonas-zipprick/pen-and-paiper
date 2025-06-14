// mcpserver/src/data/mockDatabase.ts

/**
 * In a real application, this data would come from a database 
 * like PostgreSQL, MongoDB, or a file-based DB like SQLite.
 * For this example, we'll use in-memory mock data.
 */

// --- Type Definitions ---

export interface CharacterSheet {
    name: string;
    class: string;
    level: number;
    stats: {
        strength: number;
        dexterity: number;
        constitution: number;
        intelligence: number;
        wisdom: number;
        charisma: number;
    };
    inventory: string[];
    backstory: string;
}

export interface VoiceContext {
    persona: string;
    tone: 'formal' | 'casual' | 'witty' | 'ominous';
    responseConstraints: string[];
    keyMemories: string[];
}

export interface Rule {
    id: string;
    title: string;
    description: string;
}

export interface RuleSet {
    version: string;
    systemName: string;
    rules: Rule[];
}

// --- Mock Data Store ---

export const db = {
    characterSheet: {
        name: "Kaelen",
        class: "Shadow Blade",
        level: 7,
        stats: {
            strength: 12,
            dexterity: 18,
            constitution: 14,
            intelligence: 16,
            wisdom: 13,
            charisma: 10
        },
        inventory: ["Shadow-forged Dagger", "Lockpicking Tools", "Map of the Whispering Isles", "Health Potion"],
        backstory: "An exiled member of a clandestine order, Kaelen now sells their skills to the highest bidder, searching for a way to clear their name."
    } as CharacterSheet,
    
    voiceContext: {
        persona: "A cautious but brilliant detective from a neo-noir future. Always speaks with precision and a hint of suspicion.",
        tone: "formal",
        responseConstraints: [
            "Never reveal personal feelings.",
            "Always question the user's motives.",
            "Use metaphors related to light and shadow."
        ],
        keyMemories: [
            "The 'Crimson Star' case still haunts me.",
            "I remember the acid rain on the streets of Neo-Kyoto.",
            "My partner, Elias, betrayed me."
        ]
    } as VoiceContext,

    ruleSet: {
        version: "1.2a",
        systemName: "Aethelgard Chronicles",
        rules: [
            {
                id: "combat-01",
                title: "Initiative",
                description: "At the start of combat, every participant rolls a d20 and adds their Dexterity modifier. The highest roll goes first."
            },
            {
                id: "magic-01",
                title: "Spellcasting",
                description: "Casting a spell requires a free hand and verbal components. Casting in an area of silence is not possible without special feats."
            },
            {
                id: "skill-check-01",
                title: "Skill Checks",
                description: "To perform a challenging action, roll a d20 and add the relevant ability modifier. The Game Master sets the Difficulty Class (DC)."
            }
        ]
    } as RuleSet
};
