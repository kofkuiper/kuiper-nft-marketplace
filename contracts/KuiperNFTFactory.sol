// SPDX-License-Identifier: MIT
// Author: kofkuiper
pragma solidity ^0.8.4;

import "./KuiperNFT.sol";

/* Kuiper NFT Factory
    Create new Kuiper NFT collection
*/
contract KuiperNFTFactory {
    // owner address => nft list
    mapping(address => address[]) private nfts;

    mapping(address => bool) private kuiperNFT;

    event CreatedNFTCollection(
        address creator,
        address nft,
        string name,
        string symbol
    );

    function createNFTCollection(
        string memory _name,
        string memory _symbol,
        uint256 _royaltyFee,
        address _royaltyRecipient
    ) external {
        KuiperNFT nft = new KuiperNFT(
            _name,
            _symbol,
            msg.sender,
            _royaltyFee,
            _royaltyRecipient
        );
        nfts[msg.sender].push(address(nft));
        kuiperNFT[address(nft)] = true;
        emit CreatedNFTCollection(msg.sender, address(nft), _name, _symbol);
    }

    function getOwnCollections() external view returns (address[] memory) {
        return nfts[msg.sender];
    }

    function isKuiperNFT(address _nft) external view returns (bool) {
        return kuiperNFT[_nft];
    }
}
