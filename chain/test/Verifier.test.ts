import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { MockProvider } from "ethereum-waffle";
import { ethers, waffle } from "hardhat";

describe("Verifier", function () {
  let owner: SignerWithAddress;
  let addr1: SignerWithAddress;
  let addr2: SignerWithAddress;
  let addrs: SignerWithAddress[];
  let provider: MockProvider;

  beforeEach(async function () {
    [owner, addr1, addr2, ...addrs] = await ethers.getSigners();
    provider = waffle.provider;
  });

  it("Should verify message", async function () {
    const Verifier = await ethers.getContractFactory("Verifier");
    const verifier = await Verifier.deploy();
    let messageHash = ethers.utils.id("Hello World");
    let messageHashBytes = ethers.utils.arrayify(messageHash);
    let flatSig = await owner.signMessage(messageHashBytes);
    // Call the verifyHash function
    let recovered = await verifier.verifyHash({
      message: messageHash,
      sig: flatSig,
    });
    expect(recovered).equal(owner.address);
  });
});
