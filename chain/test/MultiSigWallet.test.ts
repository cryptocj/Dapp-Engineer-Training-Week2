import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { MockProvider } from "ethereum-waffle";
import { artifacts, ethers, waffle } from "hardhat";
import { MultiSigWallet } from "../typechain";

describe("MultiSigWallet", function () {
  let multiSigWallet: MultiSigWallet;
  let owner: SignerWithAddress;
  let addr1: SignerWithAddress;
  let addr2: SignerWithAddress;
  let addrs: SignerWithAddress[];
  let provider: MockProvider;

  beforeEach(async function () {
    const MultiSigWallet = await ethers.getContractFactory("MultiSigWallet");
    [owner, addr1, addr2, ...addrs] = await ethers.getSigners();
    multiSigWallet = await MultiSigWallet.deploy(
      [owner.address, addr1.address, addr2.address],
      2
    );
    provider = waffle.provider;
  });

  it("Should have correct approvers and quorum", async function () {
    const approvers = await multiSigWallet.getApprovers();
    expect(approvers.length).equal(3);
    expect(approvers[0]).equal(owner.address);
    expect(approvers[1]).equal(addr1.address);
    expect(approvers[2]).equal(addr2.address);
    const quorum = await multiSigWallet.quorum();
    expect(quorum).equal(2);
  });

  it("Should create transfer", async function () {
    await multiSigWallet.createTransfer(1, addrs[0].address);
    const transfers = await multiSigWallet.getTransfers();
    expect(transfers.length === 1);
    expect(transfers[0].id).equal(0);
    expect(transfers[0].amount).equal(1);
    expect(transfers[0].to).equal(addrs[0].address);
    expect(transfers[0].approvals).equal(0);
    expect(transfers[0].sent).equal(false);
  });

  it("Should not create transfer if sender is not approved", async function () {
    await expect(
      multiSigWallet.connect(addrs[0]).createTransfer(1, addrs[0].address)
    ).to.be.revertedWith("only approver allowed");
  });

  it("Should increment approvals", async function () {
    await multiSigWallet.createTransfer(1, addrs[0].address);
    await multiSigWallet.approveTransfer(0);
    const transfers = await multiSigWallet.getTransfers();
    expect(transfers[0].approvals).equal(1);
    expect(transfers[0].sent).equal(false);

    const balance = await provider.getBalance(multiSigWallet.address);
    expect(balance).equal(0);
  });

  it("Should not send transfer if quorum reached but not enough balance", async () => {
    await multiSigWallet.createTransfer(
      ethers.utils.parseEther("1.0"),
      addrs[0].address
    );
    await multiSigWallet.approveTransfer(0);
    await expect(multiSigWallet.connect(addr1).approveTransfer(0)).revertedWith(
      "function call failed to execute"
    );
  });

  it("Should send transfer if quorum reached", async () => {
    let ethAmount = ethers.utils.parseEther("10.0");
    await owner.sendTransaction({
      to: multiSigWallet.address,
      value: ethAmount,
    });
    const contractBalanceBefore = await provider.getBalance(
      multiSigWallet.address
    );
    expect(contractBalanceBefore).equal(ethAmount);

    const accountBalanceBefore = await provider.getBalance(addrs[0].address);

    await multiSigWallet.createTransfer(
      ethers.utils.parseEther("1.0"),
      addrs[0].address
    );
    await multiSigWallet.approveTransfer(0);
    await multiSigWallet.connect(addr1).approveTransfer(0);
    const contractBalanceAfter = await provider.getBalance(
      multiSigWallet.address
    );

    const transfers = await multiSigWallet.getTransfers();
    expect(transfers[0].approvals).equal(2);
    expect(transfers[0].sent).equal(true);
    expect(contractBalanceAfter).equal(ethers.utils.parseEther("9.0"));
    const accountBalanceAfter = await provider.getBalance(addrs[0].address);

    expect(accountBalanceBefore.add(ethers.utils.parseEther("1.0"))).equal(
      accountBalanceAfter
    );
  });

  it("Should not approve transfer if sender is not approved", async () => {
    await multiSigWallet.createTransfer(
      ethers.utils.parseEther("1.0"),
      addrs[0].address
    );
    await expect(
      multiSigWallet.connect(addrs[0]).approveTransfer(0)
    ).revertedWith("only approver allowed");
  });

  it("Should not approve transfer if transfer is already sent", async () => {
    let ethAmount = ethers.utils.parseEther("10.0");
    await owner.sendTransaction({
      to: multiSigWallet.address,
      value: ethAmount,
    });
    await multiSigWallet.createTransfer(
      ethers.utils.parseEther("1.0"),
      addrs[0].address
    );
    await multiSigWallet.approveTransfer(0);
    await multiSigWallet.connect(addr1).approveTransfer(0);

    await expect(multiSigWallet.connect(addr2).approveTransfer(0)).revertedWith(
      "transfer has already been sent"
    );
  });

  it("Should not approve transfer twice", async () => {
    let ethAmount = ethers.utils.parseEther("10.0");
    await owner.sendTransaction({
      to: multiSigWallet.address,
      value: ethAmount,
    });
    await multiSigWallet.createTransfer(
      ethers.utils.parseEther("1.0"),
      addrs[0].address
    );
    await multiSigWallet.approveTransfer(0);
    await expect(multiSigWallet.approveTransfer(0)).revertedWith(
      "cannot approve transfer twice"
    );
  });
});
