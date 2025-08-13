import { CONFIG } from './config.js';
import eventBus from './event-bus.js';
import { getText } from './localization.js';

class AuctionManager {
    constructor() {
        this.auction = null;
        this.timer = null;

        this.init();
    }

    init() {
        eventBus.on('startAuctionRequest', data => this.startAuction(data));
        eventBus.on('makeBidRequest', data => this.makeBid(data));
        eventBus.on('passAuctionRequest', data => this.pass(data.playerId));
        eventBus.on('gameEnded', () => this.endAuction(true)); // Force end on game over
    }

    startAuction({ cell, players }) {
        if (this.auction) return; // Only one auction at a time

        this.auction = {
            cell,
            players, // Full player objects
            participants: players.map(p => p.id), // IDs of players who can bid
            currentBid: 0,
            currentBidder: null,
            timeLeft: CONFIG.AUCTION.TIME_LIMIT,
        };

        eventBus.emit('auctionStarted', this.auction);
        eventBus.emit('chatMessage', {
            sender: 'system',
            message: getText('MESSAGES.AUCTION_START', { property: cell.name })
        });

        this.timer = setInterval(() => this.updateTimer(), 1000);
    }

    makeBid({ playerId, amount }) {
        if (!this.auction) return false;
        if (!this.auction.participants.includes(playerId)) return false;

        const player = this.auction.players.find(p => p.id === playerId);
        if (!player || !player.hasMoney(amount) || amount <= this.auction.currentBid) {
            eventBus.emit('auctionError', { playerId, message: 'Invalid bid' });
            return false;
        }

        this.auction.currentBid = amount;
        this.auction.currentBidder = player;
        this.auction.timeLeft = CONFIG.AUCTION.EXTENSION_TIME; // Extend time on new bid

        eventBus.emit('auctionBidPlaced', { auction: this.auction, player, amount });
        return true;
    }

    pass(playerId) {
        if (!this.auction) return;
        
        this.auction.participants = this.auction.participants.filter(id => id !== playerId);
        eventBus.emit('auctionPlayerPassed', { auction: this.auction, playerId });

        if (this.auction.participants.length <= 1) {
            this.endAuction();
        }
    }

    updateTimer() {
        if (!this.auction) return;

        this.auction.timeLeft--;
        eventBus.emit('auctionTimeUpdate', { timeLeft: this.auction.timeLeft });

        if (this.auction.timeLeft <= 0) {
            this.endAuction();
        }
    }

    endAuction(force = false) {
        if (!this.auction) return;

        clearInterval(this.timer);
        this.timer = null;

        const { currentBidder: winner, currentBid: price, cell } = this.auction;

        eventBus.emit('auctionEnded', { winner, cell, price });

        this.auction = null;
    }
}

export default AuctionManager;