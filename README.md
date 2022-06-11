# :full_moon: Kuiper Marketplace 
---
NFT marketplace Smart Contract.

---

## :rocket: Features
* :hammer: Create a new ERC721 collection.
    - :fuelpump: Support setting royalty fees.
* :star: Sell (list item) NFT on the marketplace.
* :star2: Offer listed items on the marketplace.
* :sparkles: Accept an offer on the marketplace.
* :boom: Create an auction on the marketplace.
* :fire: Bid place to auction.
* :european_castle: (Marketplace owner) Support set and update payable token, platform fee.

## Deploy Kuiper Marketplace Smart Contract

1. Install packages.
```bash
npm install
```

2. Compile Smart Contract
```bash
npx hardhat compile
```

3. Deploy Smart Contarct
```bash
npx hardhat run scripts/deploy.ts --network <network>
```
4. Test Smart Contract
```bash
npx hardhat test test/kuiper.ts --network <network>
```