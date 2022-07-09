import { ethers } from "hardhat";

async function deployMultiSigWallet() {
  const MultiSigWallet = await ethers.getContractFactory("MultiSigWallet");
  const [owner, addr1, addr2, ...addrs] = await ethers.getSigners();
  const multiSigWallet = await MultiSigWallet.deploy(
    [owner.address, addr1.address, addr2.address],
    2
  );
  await multiSigWallet.deployed();
  console.log("MultiSigWallet deployed to:", multiSigWallet.address);
}

async function deployClassToken() {
  const initialSupply = ethers.utils.parseEther("10000.0");
  const ClassToken = await ethers.getContractFactory("ClassToken");
  const token = await ClassToken.deploy(initialSupply);
  await token.deployed();

  console.log("ClassToken deployed to:", token.address);
}

async function main() {
  deployMultiSigWallet();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
