import { BRAND_DEFINITIONS } from './brands';

export type BoardCellType =
  | 'brand'
  | 'infrastructure'
  | 'event'
  | 'special'
  | 'auction'
  | 'contract';

export interface BoardCell {
  id: string;
  label: string;
  type: BoardCellType;
  brandSlug?: string;
  industry?: string;
  action?: string;
}

const findBrandLabel = (slug: string): string => {
  const brand = BRAND_DEFINITIONS.find((b) => b.slug === slug);
  return brand ? brand.genericName : slug;
};

export const BOARD_TRACK: BoardCell[] = [
  { id: 'corner-startup-hub', label: 'Startup Hub', type: 'special', action: 'startupGrant' },
  { id: 'brand-tech-apple', label: findBrandLabel('tech-giant-apple'), type: 'brand', brandSlug: 'tech-giant-apple' },
  { id: 'event-pr-burst', label: 'PR Burst', type: 'event', action: 'prBoost' },
  { id: 'brand-commerce-amazon', label: findBrandLabel('commerce-amazon'), type: 'brand', brandSlug: 'commerce-amazon' },
  { id: 'auction-1', label: 'Silent Auction', type: 'auction', action: 'startAuction' },
  { id: 'brand-tech-google', label: findBrandLabel('tech-giant-google'), type: 'brand', brandSlug: 'tech-giant-google' },
  { id: 'infrastructure-cloud', label: 'Quantum Cloud', type: 'infrastructure', action: 'infrastructureBonus' },
  { id: 'brand-commerce-alibaba', label: findBrandLabel('commerce-alibaba'), type: 'brand', brandSlug: 'commerce-alibaba' },
  { id: 'event-regulation', label: 'Regulatory Review', type: 'event', action: 'regulationCheck' },
  { id: 'brand-auto-tesla', label: findBrandLabel('auto-tesla'), type: 'brand', brandSlug: 'auto-tesla' },
  { id: 'special-stock-market', label: 'Stock Exchange', type: 'special', action: 'stockRoll' },
  { id: 'brand-auto-toyota', label: findBrandLabel('auto-toyota'), type: 'brand', brandSlug: 'auto-toyota' },
  { id: 'contract-trade', label: 'Deal Floor', type: 'contract', action: 'openDealEditor' },
  { id: 'brand-auto-volkswagen', label: findBrandLabel('auto-volkswagen'), type: 'brand', brandSlug: 'auto-volkswagen' },
  { id: 'event-innovation', label: 'Innovation Card', type: 'event', action: 'drawInnovation' },
  { id: 'brand-finance-jpmorgan', label: findBrandLabel('finance-jpmorgan'), type: 'brand', brandSlug: 'finance-jpmorgan' },
  { id: 'auction-2', label: 'Insider Whisper', type: 'auction', action: 'startAuction' },
  { id: 'brand-finance-visa', label: findBrandLabel('finance-visa'), type: 'brand', brandSlug: 'finance-visa' },
  { id: 'infrastructure-data-center', label: 'Edge Data Mesh', type: 'infrastructure', action: 'edgeBonus' },
  { id: 'brand-finance-mastercard', label: findBrandLabel('finance-mastercard'), type: 'brand', brandSlug: 'finance-mastercard' },
  { id: 'corner-global-stage', label: 'Global Stage', type: 'special', action: 'globalShowcase' },
  { id: 'brand-media-disney', label: findBrandLabel('media-disney'), type: 'brand', brandSlug: 'media-disney' },
  { id: 'event-crackdown', label: 'Insider Crackdown', type: 'event', action: 'insiderCrackdown' },
  { id: 'brand-media-netflix', label: findBrandLabel('media-netflix'), type: 'brand', brandSlug: 'media-netflix' },
  { id: 'contract-alliance', label: 'Alliance Bay', type: 'contract', action: 'allianceProposal' },
  { id: 'brand-food-coca-cola', label: findBrandLabel('food-coca-cola'), type: 'brand', brandSlug: 'food-coca-cola' },
  { id: 'event-reputation', label: 'Reputation Audit', type: 'event', action: 'reputationAudit' },
  { id: 'brand-food-pepsico', label: findBrandLabel('food-pepsico'), type: 'brand', brandSlug: 'food-pepsico' },
  { id: 'auction-3', label: 'Strategic Auction', type: 'auction', action: 'startAuction' },
  { id: 'brand-pharma-pfizer', label: findBrandLabel('pharma-pfizer'), type: 'brand', brandSlug: 'pharma-pfizer' },
  { id: 'special-regulator', label: 'Regulator Office', type: 'special', action: 'complianceCheck' },
  { id: 'brand-pharma-novartis', label: findBrandLabel('pharma-novartis'), type: 'brand', brandSlug: 'pharma-novartis' },
  { id: 'infrastructure-logistics', label: 'Smart Logistics', type: 'infrastructure', action: 'logisticsBoost' },
  { id: 'brand-logistics-ups', label: findBrandLabel('logistics-ups'), type: 'brand', brandSlug: 'logistics-ups' },
  { id: 'event-fairplay', label: 'Fair Play Boost', type: 'event', action: 'fairPlayBoost' },
  { id: 'brand-logistics-fedex', label: findBrandLabel('logistics-fedex'), type: 'brand', brandSlug: 'logistics-fedex' },
  { id: 'auction-4', label: 'Alliance Auction', type: 'auction', action: 'startAuction' },
  { id: 'brand-energy-shell', label: findBrandLabel('energy-shell'), type: 'brand', brandSlug: 'energy-shell' },
  { id: 'corner-stock-market', label: 'Stock Market', type: 'special', action: 'stockRoll' },
  { id: 'brand-energy-bp', label: findBrandLabel('energy-bp'), type: 'brand', brandSlug: 'energy-bp' },
  { id: 'event-drive-counter', label: 'Drive Counter Surge', type: 'event', action: 'driveSurge' },
  { id: 'brand-hospitality-marriott', label: findBrandLabel('hospitality-marriott'), type: 'brand', brandSlug: 'hospitality-marriott' },
  { id: 'contract-fast', label: 'Rapid Deal Desk', type: 'contract', action: 'fastDeals' },
  { id: 'brand-hospitality-airbnb', label: findBrandLabel('hospitality-airbnb'), type: 'brand', brandSlug: 'hospitality-airbnb' },
  { id: 'event-seasons', label: 'Seasonal Spotlight', type: 'event', action: 'seasonalBonus' },
  { id: 'brand-gaming-nintendo', label: findBrandLabel('gaming-nintendo'), type: 'brand', brandSlug: 'gaming-nintendo' },
  { id: 'auction-blitz', label: 'Blitz Auction', type: 'auction', action: 'startBlitzAuction' },
  { id: 'brand-gaming-sony', label: findBrandLabel('gaming-sony'), type: 'brand', brandSlug: 'gaming-sony' },
];

export const BOARD_LENGTH = BOARD_TRACK.length;
