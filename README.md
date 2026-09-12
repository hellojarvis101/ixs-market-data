# ixs-market-data

Public mirror for IX Swap (IXS) market data used by the IXS Market Watch.

## Data flow

MEXC + DexScreener → Cloudflare Worker → GitHub Actions → `data/ixs-data.json`

The repository refreshes the latest snapshot every 15 minutes. The mirror includes the Worker timestamp and integrity metadata so downstream monitoring can reject stale or incomplete data.

## Primary data file

`data/ixs-data.json`

Underlying sources currently include MEXC IXS/USDT and the exact Uniswap V4/V2 IXS pools surfaced through DexScreener. CoinGecko and CoinMarketCap remain independent cross-checks in the separate market-watch analysis.
