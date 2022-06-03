import { BigNumber } from 'ethers';
import { ethers } from 'hardhat';
import { KuiperNFTFactory__factory, KuiperNFTMarketplace__factory } from '../typechain';


async function main() {

  const signers = await ethers.getSigners();
  const KuiNFTFactory = new KuiperNFTFactory__factory(signers[0]);
  const kuiperNFTFactory = await KuiNFTFactory.deploy();
  await kuiperNFTFactory.deployed();
  console.log('KuiperNFTFactory deployed to: ', kuiperNFTFactory.address);

  const KuiperNFTMarketplace = new KuiperNFTMarketplace__factory(signers[0]);
  const platformFee = BigNumber.from(10); // 10%
  const feeRecipient = signers[0].address;
  const kuiperNFTMarketplace =  await KuiperNFTMarketplace.deploy(platformFee, feeRecipient, kuiperNFTFactory.address);
  await kuiperNFTMarketplace.deployed();
  console.log('KuiperNFTMarketplace deployed to: ', kuiperNFTMarketplace.address);
  
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;

})