import { CONFIG } from './config.js';
import { randomChoice } from './random.js';
import eventBus from './event-bus.js';
import { getText } from './localization.js';

class EventManager {
    constructor() {
        this.weather = { type: 'sunny', duration: 0, effects: {} };
        this.economicEvent = null;
        this.culturalEvent = null;

        this.weatherChangeTurnInterval = 5;
        this.economicEventTurnInterval = 10;
        this.culturalEventTurnInterval = 15;

        this.init();
    }

    init() {
        eventBus.on('turnEnded', (data) => this.onTurnEnd(data.turnNumber));
        eventBus.on('gameStarted', () => this.reset());
    }

    reset() {
        this.weather = { type: 'sunny', duration: 0, effects: {} };
        this.economicEvent = null;
        this.culturalEvent = null;
        eventBus.emit('weatherChanged', this.weather);
        eventBus.emit('economicEventChanged', this.economicEvent);
        eventBus.emit('culturalEventChanged', this.culturalEvent);
    }

    onTurnEnd(turnNumber) {
        // Update weather
        if (turnNumber > 0 && turnNumber % this.weatherChangeTurnInterval === 0) {
            this.changeWeather();
        }

        // Update economic events
        if (this.economicEvent && --this.economicEvent.duration <= 0) {
            this.economicEvent = null;
            eventBus.emit('economicEventChanged', this.economicEvent);
            eventBus.emit('chatMessage', { sender: 'system', message: getText('MESSAGES.ECONOMIC_EVENT_END') });
        } else if (!this.economicEvent && turnNumber > 0 && turnNumber % this.economicEventTurnInterval === 0) {
            this.triggerEconomicEvent();
        }

        // Update cultural events
        if (this.culturalEvent && --this.culturalEvent.duration <= 0) {
            this.culturalEvent = null;
            eventBus.emit('culturalEventChanged', this.culturalEvent);
            eventBus.emit('chatMessage', { sender: 'system', message: getText('MESSAGES.CULTURAL_EVENT_END') });
        } else if (!this.culturalEvent && turnNumber > 0 && turnNumber % this.culturalEventTurnInterval === 0) {
            this.triggerCulturalEvent();
        }
    }

    changeWeather() {
        const newWeather = randomChoice(CONFIG.WEATHER);
        this.weather = { ...newWeather };

        eventBus.emit('weatherChanged', this.weather);
        eventBus.emit('chatMessage', {
            sender: 'system',
            message: getText('MESSAGES.WEATHER_CHANGE', {
                weather: getText(`WEATHER.${newWeather.type.toUpperCase()}`)
            })
        });
    }

    triggerEconomicEvent() {
        const event = randomChoice(CONFIG.ECONOMIC_EVENTS);
        this.economicEvent = { ...event, active: true };

        eventBus.emit('economicEventChanged', this.economicEvent);
        eventBus.emit('chatMessage', {
            sender: 'system',
            message: getText('MESSAGES.ECONOMIC_EVENT', {
                event: getText(`ECONOMIC_EVENTS.${event.type.toUpperCase()}`)
            })
        });
    }

    triggerCulturalEvent() {
        const event = randomChoice(CONFIG.CULTURAL_EVENTS);
        this.culturalEvent = { ...event, active: true };

        eventBus.emit('culturalEventChanged', this.culturalEvent);
        eventBus.emit('chatMessage', {
            sender: 'system',
            message: getText('MESSAGES.CULTURAL_EVENT', {
                event: getText(`CULTURAL_EVENTS.${event.type.toUpperCase()}`)
            })
        });
    }
}

export default EventManager;