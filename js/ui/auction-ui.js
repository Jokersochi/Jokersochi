/**
 * Модуль для управления UI аукциона.
 * Создает модальное окно, обрабатывает события и отправляет действия пользователя.
 */

import { getText } from '../localization.js';

export class AuctionUI {
    /**
     * @param {NetworkManager} networkManager - Экземпляр менеджера сети.
     */
    constructor(networkManager) {
        this.network = networkManager;
        this.modal = null;
        this.init();
    }

    init() {
        this.createModal();
        this.network.on('auction_started', (data) => this.show(data));
        this.network.on('auction_bid_placed', (data) => this.updateBid(data));
        this.network.on('auction_player_passed', (data) => this.updatePass(data));
        this.network.on('auction_time_update', (data) => this.updateTime(data));
        this.network.on('auction_ended', (data) => this.hide(data));
        this.network.on('auction_error', (data) => this.showError(data.message));
    }

    createModal() {
        const modalHTML = `
            <div class="modal-overlay" id="auction-modal-overlay">
                <div class="modal auction-modal">
                    <div class="modal-header">
                        <h3 class="modal-title">${getText('AUCTION.TITLE')}</h3>
                    </div>
                    <div class="modal-content">
                        <div class="auction-item-info">
                            <div id="auction-item-color" class="property-color-indicator" style="width: 20px; height: 40px;"></div>
                            <h4 id="auction-item-name"></h4>
                        </div>
                        <div class="auction-timer">
                            ${getText('AUCTION.TIME_LEFT')}: <span id="auction-time">30</span>s
                        </div>
                        <div class="auction-bid-info">
                            <p>${getText('AUCTION.CURRENT_BID')}: <span id="auction-current-bid">0</span>₽</p>
                            <p>${getText('AUCTION.LEADER')}: <span id="auction-leader-name">${getText('AUCTION.NO_BIDS')}</span></p>
                        </div>
                        <div class="auction-participants">
                            <h5>${getText('AUCTION.PARTICIPANTS')}</h5>
                            <ul id="auction-participant-list"></ul>
                        </div>
                        <div class="auction-actions">
                            <input type="number" id="auction-bid-input" class="form-control" placeholder="${getText('AUCTION.YOUR_BID')}">
                            <button id="auction-bid-btn" class="btn primary">${getText('AUCTION.BID')}</button>
                            <button id="auction-pass-btn" class="btn secondary">${getText('AUCTION.PASS')}</button>
                        </div>
                        <p id="auction-error-msg" class="error-text" style="min-height: 1.2em;"></p>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        this.modal = document.getElementById('auction-modal-overlay');

        document.getElementById('auction-bid-btn').addEventListener('click', () => {
            const amountInput = document.getElementById('auction-bid-input');
            const amount = parseInt(amountInput.value, 10);
            if (!isNaN(amount) && amount > 0) {
                this.network.sendAuctionBid(amount);
                amountInput.value = '';
            }
        });

        document.getElementById('auction-pass-btn').addEventListener('click', () => {
            this.network.sendAuctionPass();
        });
    }

    show(data) {
        const { cell, players } = data;
        document.getElementById('auction-item-name').textContent = cell.name;
        const colorIndicator = document.getElementById('auction-item-color');
        colorIndicator.style.backgroundColor = cell.color || 'transparent';

        document.getElementById('auction-current-bid').textContent = '0';
        document.getElementById('auction-leader-name').textContent = getText('AUCTION.NO_BIDS');
        
        const participantList = document.getElementById('auction-participant-list');
        participantList.innerHTML = '';
        players.forEach(player => {
            const li = document.createElement('li');
            li.id = `auction-player-${player.id}`;
            li.textContent = player.name;
            participantList.appendChild(li);
        });

        this.modal.classList.add('active');
    }

    updateBid(data) {
        document.getElementById('auction-current-bid').textContent = data.amount;
        document.getElementById('auction-leader-name').textContent = data.player.name;
        document.getElementById('auction-bid-input').placeholder = `${getText('AUCTION.MIN_BID_IS')} ${data.amount + CONFIG.AUCTION.BID_INCREMENT}`;
        this.showError('');
    }

    updatePass(data) {
        const playerElement = document.getElementById(`auction-player-${data.playerId}`);
        if (playerElement) {
            playerElement.classList.add('passed');
        }
    }

    updateTime(data) {
        document.getElementById('auction-time').textContent = data.timeLeft;
    }

    hide(data) {
        // Здесь можно будет показать красивое уведомление о результате
        this.modal.classList.remove('active');
    }

    showError(message) {
        const errorElement = document.getElementById('auction-error-msg');
        errorElement.textContent = message;
        if (message) {
            setTimeout(() => {
                errorElement.textContent = '';
            }, 3000);
        }
    }
}