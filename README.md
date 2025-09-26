# Russian Monopoly Prototype

This repository contains a prototype for an online board game inspired by Monopoly with Russian cultural themes. The demo showcases browser-based gameplay with multi-language support, auctions, random events and the ability to build residences and upgrade properties.

## Project structure

- `index.html` – demo page.
- `css/styles.css` – basic styles.
- `js/data.js` – placeholder data for board tiles, chance and treasury cards, random events and players.
- `js/game.js` – main game logic (movement, buying property, auctions, paying rent, building residences and upgrades).

## Features

- Multi-language interface (English/Russian).
- Buying properties and paying rent with the ability to build residences that double rent when owning all properties of the same color.
- Auctions triggered when a player declines to purchase a property.
- Random economic and weather events influencing rent and movement.
- Chance and treasury cards with Russian cultural references.
- Upgrades that increase rent in addition to building residences once a color set is owned.

## Running

Open `index.html` in a modern browser. Use the **Roll Dice** button to move player tokens. When eligible, use **Build Residence** or **Upgrade** to invest in owned property. The log panel displays game actions.

This is only a starting point for a more complex multiplayer game with Russian-specific mechanics, events and customizations.
