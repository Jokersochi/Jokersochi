export type CellType = 'brand' | 'event' | 'infrastructure' | 'special' | 'auction' | 'contract';

export interface BoardCell {
  id: string;
  label: string;
  type: CellType;
  brandSlug?: string;
  action?: string;
}

export const boardTrack: BoardCell[] = [
  { id: 'corner-startup-hub', label: 'Startup Hub', type: 'special', action: 'startupGrant' },
  { id: 'brand-tech-apple', label: 'Tech Giant', type: 'brand', brandSlug: 'tech-giant-apple' },
  { id: 'event-pr-burst', label: 'PR Burst', type: 'event', action: 'prBoost' },
  { id: 'brand-commerce-amazon', label: 'Global Marketplace', type: 'brand', brandSlug: 'commerce-amazon' },
  { id: 'auction-1', label: 'Silent Auction', type: 'auction', action: 'startAuction' },
  { id: 'brand-tech-google', label: 'Search Titan', type: 'brand', brandSlug: 'tech-giant-google' },
  { id: 'infrastructure-cloud', label: 'Quantum Cloud', type: 'infrastructure', action: 'infrastructureBonus' },
  { id: 'brand-commerce-alibaba', label: 'Mega Commerce', type: 'brand', brandSlug: 'commerce-alibaba' },
  { id: 'event-regulation', label: 'Regulatory Review', type: 'event', action: 'regulationCheck' },
  { id: 'brand-auto-tesla', label: 'EV Pioneer', type: 'brand', brandSlug: 'auto-tesla' },
  { id: 'special-stock-market', label: 'Stock Exchange', type: 'special', action: 'stockRoll' },
  { id: 'brand-auto-toyota', label: 'Mobility Leader', type: 'brand', brandSlug: 'auto-toyota' },
  { id: 'contract-trade', label: 'Deal Floor', type: 'contract', action: 'openDealEditor' },
  { id: 'brand-auto-volkswagen', label: 'Precision Motors', type: 'brand', brandSlug: 'auto-volkswagen' },
  { id: 'event-innovation', label: 'Innovation Card', type: 'event', action: 'drawInnovation' },
  { id: 'brand-finance-jpmorgan', label: 'Capital Bank', type: 'brand', brandSlug: 'finance-jpmorgan' },
  { id: 'auction-2', label: 'Insider Whisper', type: 'auction', action: 'startAuction' },
  { id: 'brand-finance-visa', label: 'Payments Hub', type: 'brand', brandSlug: 'finance-visa' },
  { id: 'infrastructure-data-center', label: 'Edge Data Mesh', type: 'infrastructure', action: 'edgeBonus' },
  { id: 'brand-finance-mastercard', label: 'Card Network', type: 'brand', brandSlug: 'finance-mastercard' },
  { id: 'corner-global-stage', label: 'Global Stage', type: 'special', action: 'globalShowcase' },
  { id: 'brand-media-disney', label: 'Storyverse', type: 'brand', brandSlug: 'media-disney' },
  { id: 'event-crackdown', label: 'Insider Crackdown', type: 'event', action: 'insiderCrackdown' },
  { id: 'brand-media-netflix', label: 'Streaming Pulse', type: 'brand', brandSlug: 'media-netflix' },
  { id: 'contract-alliance', label: 'Alliance Bay', type: 'contract', action: 'allianceProposal' },
  { id: 'brand-food-coca-cola', label: 'Sparkling Drinks', type: 'brand', brandSlug: 'food-coca-cola' },
  { id: 'event-reputation', label: 'Reputation Audit', type: 'event', action: 'reputationAudit' },
  { id: 'brand-food-pepsico', label: 'Snack World', type: 'brand', brandSlug: 'food-pepsico' },
  { id: 'auction-3', label: 'Strategic Auction', type: 'auction', action: 'startAuction' },
  { id: 'brand-pharma-pfizer', label: 'Health Innovator', type: 'brand', brandSlug: 'pharma-pfizer' },
  { id: 'special-regulator', label: 'Regulator Office', type: 'special', action: 'complianceCheck' },
  { id: 'brand-pharma-novartis', label: 'Life Sciences', type: 'brand', brandSlug: 'pharma-novartis' },
  { id: 'infrastructure-logistics', label: 'Smart Logistics', type: 'infrastructure', action: 'logisticsBoost' },
  { id: 'brand-logistics-ups', label: 'Global Logistics', type: 'brand', brandSlug: 'logistics-ups' },
  { id: 'event-fairplay', label: 'Fair Play Boost', type: 'event', action: 'fairPlayBoost' },
  { id: 'brand-logistics-fedex', label: 'Express Freight', type: 'brand', brandSlug: 'logistics-fedex' },
  { id: 'auction-4', label: 'Alliance Auction', type: 'auction', action: 'startAuction' },
  { id: 'brand-energy-shell', label: 'Energy Grid', type: 'brand', brandSlug: 'energy-shell' },
  { id: 'corner-stock-market', label: 'Stock Market', type: 'special', action: 'stockRoll' },
  { id: 'brand-energy-bp', label: 'Fuel Matrix', type: 'brand', brandSlug: 'energy-bp' },
  { id: 'event-drive-counter', label: 'Drive Counter Surge', type: 'event', action: 'driveSurge' },
  { id: 'brand-hospitality-marriott', label: 'Hospitality Group', type: 'brand', brandSlug: 'hospitality-marriott' },
  { id: 'contract-fast', label: 'Rapid Deal Desk', type: 'contract', action: 'fastDeals' },
  { id: 'brand-hospitality-airbnb', label: 'Stay Network', type: 'brand', brandSlug: 'hospitality-airbnb' },
  { id: 'event-seasons', label: 'Seasonal Spotlight', type: 'event', action: 'seasonalBonus' },
  { id: 'brand-gaming-nintendo', label: 'Gaming Heritage', type: 'brand', brandSlug: 'gaming-nintendo' },
  { id: 'auction-blitz', label: 'Blitz Auction', type: 'auction', action: 'startBlitzAuction' },
  { id: 'brand-gaming-sony', label: 'Playverse', type: 'brand', brandSlug: 'gaming-sony' }
];
