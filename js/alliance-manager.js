import { generateId } from './utils.js';
import eventBus from './event-bus.js';
import { getText } from './localization.js';

class AllianceManager {
    constructor() {
        this.alliances = [];
        this.init();
    }

    init() {
        eventBus.on('createAllianceRequest', data => this.createAlliance(data));
        // Listen for player bankruptcy to check alliance conditions
        eventBus.on('playerBankrupt', data => this.onPlayerBankrupt(data.player));
        eventBus.on('gameStarted', () => this.reset());
    }

    reset() {
        this.alliances = [];
    }

    createAlliance({ players, conditions = {} }) {
        const alliance = {
            id: generateId(),
            players: players.map(p => p.id), // Store player IDs
            playerObjects: players, // Store full objects for easy access to names, etc.
            conditions,
            createdAt: Date.now(),
            benefits: {
                rentSharing: 0.1,
                tradeDiscount: 0.05,
                mutualSupport: true
            }
        };

        this.alliances.push(alliance);

        eventBus.emit('allianceFormed', alliance);
        eventBus.emit('chatMessage', {
            sender: 'system',
            message: getText('MESSAGES.ALLIANCE_FORMED', {
                players: players.map(p => p.name).join(', ')
            })
        });

        return alliance;
    }

    onPlayerBankrupt(bankruptPlayer) {
        // Find all alliances the bankrupt player was a part of and break them.
        const affectedAlliances = this.alliances.filter(alliance =>
            alliance.players.includes(bankruptPlayer.id)
        );

        affectedAlliances.forEach(alliance => this.breakAlliance(alliance));
    }

    breakAlliance(alliance) {
        this.alliances = this.alliances.filter(a => a.id !== alliance.id);

        eventBus.emit('allianceBroken', alliance);
        eventBus.emit('chatMessage', {
            sender: 'system',
            message: getText('MESSAGES.ALLIANCE_BROKEN', {
                players: alliance.playerObjects.map(p => p.name).join(', ')
            })
        });
    }
}

export default AllianceManager;