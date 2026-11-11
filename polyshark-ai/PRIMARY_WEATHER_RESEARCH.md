# Primary weather research (NOAA NWS)

Source: https://www.weather.gov/documentation/services-web-api
This independent GitHub workflow reads a small NOAA NWS hourly forecast sample
for one New York City reference point. It stores a seven-day GitHub Actions
artifact named polyshark-primary-weather-research. It never changes paper
portfolio state or the Polymarket market ledger.

The pilot city does NOT imply any match to Polymarket settlement rules. The
provider's probability of precipitation is not a general YES probability.
Outputs are strictly RESEARCH_ONLY, NO_TRADE, paper_only=true, with no event
probability. The watchlist is bounded to five points.

This provides only one forecast origin. ECMWF Open Data (CC BY 4.0) may supply
a second independent model source later. Before using either to generate a
specific yes/no event forecast, verify time, location, exact contract conditions,
independence, licensing, attribution, and out-of-sample calibration.

No automatic transition to paper execution or real orders is permitted.
