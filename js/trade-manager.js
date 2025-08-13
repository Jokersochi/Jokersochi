import { generateId } from './utils.js';
import eventBus from './event-bus.js';
import { getText } from './localization.js';

class TradeManager {
    constructor() {
        this.tradeOffers = [];
        this.tradeHistory = [];
        this.offerTimeout = 5 * 60 * 1000; // 5 minutes

        this.init();
    }

    init() {
        eventBus.on('createTradeOfferRequest', data => this.createTradeOffer(data));
        eventBus.on('acceptTradeOfferRequest', data => this.acceptTradeOffer(data.tradeId));
        eventBus.on('rejectTradeOfferRequest', data => this.rejectTradeOffer(data.tradeId));
        eventBus.on('gameStarted', () => this.reset());

        // Check for expired offers periodically
        setInterval(() => this.checkExpiredOffers(), 10000);
    }

    reset() {
        this.tradeOffers = [];
        this.tradeHistory = [];
    }

    createTradeOffer({ from, to, offer, request }) {
        const tradeOffer = {
            id: generateId(),
            from, // player object
            to,   // player object
            offer, // { money: 100, properties: [pos1, pos2] }
            request,
            createdAt: Date.now(),
            expiresAt: Date.now() + this.offerTimeout,
            status: 'pending'
        };

        this.tradeOffers.push(tradeOffer);

        eventBus.emit('tradeOfferCreated', tradeOffer);
        eventBus.emit('chatMessage', {
            sender: 'system',
            message: getText('MESSAGES.TRADE_OFFER', { from: from.name, to: to.name })
        });

        return tradeOffer;
    }

    acceptTradeOffer(tradeId) {
        const offerIndex = this.tradeOffers.findIndex(o => o.id === tradeId);
        if (offerIndex === -1) return false;

        const offer = this.tradeOffers[offerIndex];
        if (offer.status !== 'pending') return false;

        // The Game module will listen for this and execute the trade
        eventBus.emit('tradeCompleted', offer);

        offer.status = 'accepted';
        this.tradeHistory.push(offer);
        this.tradeOffers.splice(offerIndex, 1);

        return true;
    }

    rejectTradeOffer(tradeId) {
        const offerIndex = this.tradeOffers.findIndex(o => o.id === tradeId);
        if (offerIndex === -1) return false;

        const offer = this.tradeOffers[offerIndex];
        if (offer.status !== 'pending') return false;

        offer.status = 'rejected';
        this.tradeHistory.push(offer);
        this.tradeOffers.splice(offerIndex, 1);

        eventBus.emit('tradeRejected', offer);

        return true;
    }

    checkExpiredOffers() {
        const now = Date.now();
        this.tradeOffers = this.tradeOffers.filter(offer => {
            if (offer.expiresAt < now) {
                eventBus.emit('tradeExpired', offer);
                return false; // remove from active offers
            }
            return true;
        });
    }
}

export default TradeManager;