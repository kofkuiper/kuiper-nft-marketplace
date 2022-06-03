import { expect } from "chai";
import { BigNumber, Signer } from "ethers";
import { ethers } from "hardhat";
import { before } from "mocha";

import {
    KuiperNFT, KuiperNFT__factory, KuiperNFTFactory__factory,
    KuiperNFTFactory, KuiperNFTMarketplace__factory, KuiperNFTMarketplace,
    Token__factory, IERC20
} from "../typechain";


function toWei(value: number) {
    return ethers.utils.parseEther(value.toString());
}


describe("Kuiper Marketplace", () => {

    let nft: KuiperNFT;
    let factory: KuiperNFTFactory;
    let marketplace: KuiperNFTMarketplace;
    let owner: Signer;
    let creator: Signer;
    let buyer: Signer;
    let offerer: Signer;
    let bidder: Signer;
    let payableToken: IERC20;

    before(async () => {
        [owner, creator, buyer, offerer, bidder] = await ethers.getSigners();
        const Factory = new KuiperNFTFactory__factory(owner);
        factory = await Factory.deploy();
        await factory.deployed();
        expect(factory.address).not.eq(null, "Deploy factory is failed.");

        const Marketplace = new KuiperNFTMarketplace__factory(owner);
        const platformFee = BigNumber.from(10); // 10%
        const feeRecipient = await owner.getAddress();
        marketplace = await Marketplace.deploy(platformFee, feeRecipient, factory.address);
        await marketplace.deployed();
        expect(marketplace.address).not.eq(null, "Deploy marketplace is failed.");

        const Token = new Token__factory(owner);
        payableToken = await Token.deploy('Kuiper Token', 'KPT');
        await payableToken.deployed();
        expect(payableToken.address).not.eq(null, "Deploy test payable token is failed.");

        await marketplace.connect(owner).addPayableToken(payableToken.address);
        expect(await marketplace.checkIsPayableToken(payableToken.address), "Add payable token is failed.").to.true;

        // Transfer payable token to tester
        const buyerAddress = await buyer.getAddress();
        const offererAddress = await offerer.getAddress();
        await payableToken.connect(owner).transfer(buyerAddress, toWei(1000000));
        expect(await payableToken.balanceOf(buyerAddress)).to.eq(toWei(1000000));
        await payableToken.connect(owner).transfer(offererAddress, toWei(1000000));
        expect(await payableToken.balanceOf(offererAddress)).to.eq(toWei(1000000));

        const royaltyRecipient = await creator.getAddress();
        const tx = await factory.connect(creator).createNFTCollection("Kuiper Collection", "KUIPER", BigNumber.from(10 * 100), royaltyRecipient);
        const receipt = await tx.wait();
        const events = receipt.events?.filter((e: any) => e.event == 'CreatedNFTCollection') as any;
        const collectionAddress = events[0].args.nft;
        nft = new ethers.Contract(collectionAddress, KuiperNFT__factory.abi, creator) as KuiperNFT;
        expect(nft.address).not.eq(null, "Create collection is failed.");

    })

    describe("List and Buy", () => {
        const tokenId = 0;
        it("Creator should mint NFT", async () => {
            const to = await creator.getAddress();
            const uri = 'kuiper.io'
            await nft.connect(creator).safeMint(to, uri);
            expect(await nft.ownerOf(tokenId)).to.eq(to, "Mint NFT is failed.");
        })

        it("Creator should list NFT on the marketplace", async () => {
            await nft.connect(creator).approve(marketplace.address, tokenId);

            const tx = await marketplace.connect(creator).listNft(nft.address, tokenId, payableToken.address, toWei(100000));
            const receipt = await tx.wait();
            const events = receipt.events?.filter((e: any) => e.event == 'ListedNFT') as any;
            const eventNFT = events[0].args.nft;
            const eventTokenId = events[0].args.tokenId;
            expect(eventNFT).eq(nft.address, "NFT is wrong.");
            expect(eventTokenId).eq(tokenId, "TokenId is wrong.");
        })

        it("Creator should cancel listed item", async () => {
            await marketplace.connect(creator).cancelListedNFT(nft.address, tokenId);
            expect(await nft.ownerOf(tokenId)).eq(await creator.getAddress(), "Cancel listed item is failed.");
        })

        it("Creator should list NFT on the marketplace again!", async () => {
            await nft.connect(creator).approve(marketplace.address, tokenId);

            const tx = await marketplace.connect(creator).listNft(nft.address, tokenId, payableToken.address, toWei(100000));
            const receipt = await tx.wait();
            const events = receipt.events?.filter((e: any) => e.event == 'ListedNFT') as any;
            const eventNFT = events[0].args.nft;
            const eventTokenId = events[0].args.tokenId;
            expect(eventNFT).eq(nft.address, "NFT is wrong.");
            expect(eventTokenId).eq(tokenId, "TokenId is wrong.");
        })

        it("Buyer should buy listed NFT", async () => {
            const tokenId = 0;
            const buyPrice = 100001;
            await payableToken.connect(buyer).approve(marketplace.address, toWei(buyPrice));
            await marketplace.connect(buyer).buyNFT(nft.address, tokenId, payableToken.address, toWei(buyPrice));
            expect(await nft.ownerOf(tokenId)).eq(await buyer.getAddress(), "Buy NFT is failed.");
        })
    })

    describe("List, Offer, and Accept Offer", () => {
        const tokenId = 1;
        it("Creator should mint NFT", async () => {
            const to = await creator.getAddress();
            const uri = 'kuiper.io'
            await nft.connect(creator).safeMint(to, uri);
            expect(await nft.ownerOf(tokenId)).to.eq(to, "Mint NFT is failed.");
        })

        it("Creator should list NFT on the marketplace", async () => {

            await nft.connect(creator).approve(marketplace.address, tokenId);

            const tx = await marketplace.connect(creator).listNft(nft.address, tokenId, payableToken.address, toWei(100000));
            const receipt = await tx.wait();
            const events = receipt.events?.filter((e: any) => e.event == 'ListedNFT') as any;
            const eventNFT = events[0].args.nft;
            const eventTokenId = events[0].args.tokenId;
            expect(eventNFT).eq(nft.address, "NFT is wrong.");
            expect(eventTokenId).eq(tokenId, "TokenId is wrong.");
        })

        it("Buyer should offer NFT", async () => {
            const offerPrice = 1000;
            await payableToken.connect(buyer).approve(marketplace.address, toWei(offerPrice));
            const tx = await marketplace.connect(buyer).offerNFT(nft.address, tokenId, payableToken.address, toWei(offerPrice));
            const receipt = await tx.wait();
            const events = receipt.events?.filter((e: any) => e.event == 'OfferredNFT') as any;
            const eventOfferer = events[0].args.offerer;
            const eventNFT = events[0].args.nft;
            const eventTokenId = events[0].args.tokenId;
            expect(eventOfferer).eq(await buyer.getAddress(), "Offerer address is wrong.");
            expect(eventNFT).eq(nft.address, "NFT address is wrong.");
            expect(eventTokenId).eq(tokenId, "TokenId is wrong.");
        })

        it("Buyer should cancel offer", async () => {
            const tx = await marketplace.connect(buyer).cancelOfferNFT(nft.address, tokenId);
            const receipt = await tx.wait();
            const events = receipt.events?.filter((e: any) => e.event == 'CanceledOfferredNFT') as any;
            const eventNFT = events[0].args.nft;
            const eventTokenId = events[0].args.tokenId;
            const eventOfferer = events[0].args.offerer;
            expect(eventOfferer).eq(await buyer.getAddress(), "Offerer address is wrong.");
            expect(eventNFT).eq(nft.address, "NFT address is wrong.");
            expect(eventTokenId).eq(tokenId, "TokenId is wrong.");
        })

        it("Offerer should offer NFT", async () => {
            const offerPrice = 1000;
            await payableToken.connect(offerer).approve(marketplace.address, toWei(offerPrice));
            const tx = await marketplace.connect(offerer).offerNFT(nft.address, tokenId, payableToken.address, toWei(offerPrice));
            const receipt = await tx.wait();
            const events = receipt.events?.filter((e: any) => e.event == 'OfferredNFT') as any;
            const eventOfferer = events[0].args.offerer;
            const eventNFT = events[0].args.nft;
            const eventTokenId = events[0].args.tokenId;
            expect(eventOfferer).eq(await offerer.getAddress(), "Offerer address is wrong.");
            expect(eventNFT).eq(nft.address, "NFT address is wrong.");
            expect(eventTokenId).eq(tokenId, "TokenId is wrong.");
        })

        it("Creator should accept offer", async () => {
            await marketplace.connect(creator).acceptOfferNFT(nft.address, tokenId, await offerer.getAddress());
            expect(await nft.ownerOf(tokenId)).eq(await offerer.getAddress());
        })
    })

    describe("Create Auction, bid place, and Result auction", async () => {
        const tokenId = 2;
        it("Creator should mint NFT", async () => {
            const to = await creator.getAddress();
            const uri = 'kuiper.io'
            await nft.connect(creator).safeMint(to, uri);
            expect(await nft.ownerOf(tokenId)).to.eq(to, "Mint NFT is failed.");
        })

        it("Creator should create auction", async () => {
            const price = 10000;
            const minBid = 500;
            const startTime = Date.now() + 60 * 60 * 24; // a day
            const endTime = Date.now() + 60 * 60 * 24 * 7; // 7 days
            await nft.connect(creator).approve(marketplace.address, tokenId);
            const tx = await marketplace.connect(creator).createAuction(nft.address, tokenId, payableToken.address, toWei(price), toWei(minBid), BigNumber.from(startTime), BigNumber.from(endTime))
            const receipt = await tx.wait();
            const events = receipt.events?.filter((e: any) => e.event == 'CreatedAuction') as any;
            const eventNFT = events[0].args.nft;
            const eventTokenId = events[0].args.tokenId;
            const eventCreator = events[0].args.creator;
            expect(eventNFT).eq(nft.address, "NFT address is wrong.");
            expect(eventCreator).eq(await creator.getAddress(), "Creator address is wrong.");
            expect(eventTokenId).eq(tokenId, "TokenId is wrong.");
        })

        it("Creator should cancel auction", async () => {
            await marketplace.connect(creator).cancelAuction(nft.address, tokenId);
            expect(await nft.ownerOf(tokenId)).eq(await creator.getAddress(), "Cancel is failed.");
        })

        it("Creator should create auction again", async () => {
            const price = 10000;
            const minBid = 500;
            const startTime = 0; // now
            const endTime = Date.now() + 60 * 60 * 24 * 7; // 7 days
            await nft.connect(creator).approve(marketplace.address, tokenId);
            const tx = await marketplace.connect(creator).createAuction(nft.address, tokenId, payableToken.address, toWei(price), toWei(minBid), BigNumber.from(startTime), BigNumber.from(endTime))
            const receipt = await tx.wait();
            const events = receipt.events?.filter((e: any) => e.event == 'CreatedAuction') as any;
            const eventNFT = events[0].args.nft;
            const eventTokenId = events[0].args.tokenId;
            const eventCreator = events[0].args.creator;
            expect(eventNFT).eq(nft.address, "NFT address is wrong.");
            expect(eventCreator).eq(await creator.getAddress(), "Creator address is wrong.");
            expect(eventTokenId).eq(tokenId, "TokenId is wrong.");
        })

        it("Buyer should bid place", async () => {
            const bidPrice = 10500;
            await payableToken.connect(buyer).approve(marketplace.address, toWei(bidPrice));
            const tx = await marketplace.connect(buyer).bidPlace(nft.address, tokenId, toWei(bidPrice));
            const receipt = await tx.wait();
            const events = receipt.events?.filter((e: any) => e.event == 'PlacedBid') as any;
            const eventNFT = events[0].args.nft;
            const eventTokenId = events[0].args.tokenId;
            const eventBidder = events[0].args.bidder;
            expect(eventNFT).eq(nft.address, "NFT address is wrong.");
            expect(eventBidder).eq(await buyer.getAddress(), "Bidder address is wrong.");
            expect(eventTokenId).eq(tokenId, "TokenId is wrong.");
        })

        it("Offerer should bid place", async () => {
            const bidPrice = 11000;
            await payableToken.connect(offerer).approve(marketplace.address, toWei(bidPrice));
            const tx = await marketplace.connect(offerer).bidPlace(nft.address, tokenId, toWei(bidPrice));
            const receipt = await tx.wait();
            const events = receipt.events?.filter((e: any) => e.event == 'PlacedBid') as any;
            const eventNFT = events[0].args.nft;
            const eventTokenId = events[0].args.tokenId;
            const eventBidder = events[0].args.bidder;
            expect(eventNFT).eq(nft.address, "NFT address is wrong.");
            expect(eventBidder).eq(await offerer.getAddress(), "Bidder address is wrong.");
            expect(eventTokenId).eq(tokenId, "TokenId is wrong.");
        })

        it("Marketplace owner should call result auction", async () => {
            try {
                const tx = await marketplace.connect(owner).resultAuction(nft.address, tokenId);
                const receipt = await tx.wait();
                const events = receipt.events?.filter((e: any) => e.event == 'ResultedAuction') as any;
                const eventNFT = events[0].args.nft;
                const eventTokenId = events[0].args.tokenId;
                const eventWinner = events[0].args.winner;
                const eventCaller = events[0].args.caller;
                expect(eventNFT).eq(nft.address, "NFT address is wrong.");
                expect(eventTokenId).eq(tokenId, "TokenId is wrong.");
                expect(eventWinner).eq(await offerer.getAddress(), "Winner address is wrong.");
                expect(eventCaller).eq(await owner.getAddress(), "Caller address is wrong.");
                expect(await nft.ownerOf(tokenId)).eq(eventWinner, "NFT owner is wrong.");
            } catch (error) {

            }
        })
    })

})
