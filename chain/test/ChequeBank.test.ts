import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { MockProvider } from "ethereum-waffle";
import { ethers, waffle } from "hardhat";
import { ChequeBank, ChequeBank__factory } from "../typechain";
import { balanceChanged } from "./BalanceHelper";

describe("ChequeBank", function () {
  let owner: SignerWithAddress;
  let addr1: SignerWithAddress;
  let addr2: SignerWithAddress;
  let addrs: SignerWithAddress[];
  let provider: MockProvider;
  let chequeBank: ChequeBank;
  let ChequeBank: ChequeBank__factory;
  beforeEach(async function () {
    [owner, addr1, addr2, ...addrs] = await ethers.getSigners();
    provider = waffle.provider;
    ChequeBank = await ethers.getContractFactory("ChequeBank");
    chequeBank = await ChequeBank.deploy();
  });
  it("Should deposit successfully and change balance", async function () {
    const depositAmount = ethers.utils.parseEther("1.0");
    let balance = await chequeBank.balanceOf();
    expect(balance).equal(0);
    await chequeBank.deposit({ value: depositAmount });
    balance = await chequeBank.balanceOf();
    expect(balance).equal(depositAmount);
  });

  it("Should deposit 0 successfully without changing balance", async function () {
    const depositAmount = 0;
    await chequeBank.deposit({
      value: depositAmount,
    });
    let balance = await chequeBank.balanceOf();
    expect(balance).equal(0);
  });

  it("Should withdraw successfully and change balance", async function () {
    const depositAmount = ethers.utils.parseEther("1.0");
    await chequeBank.deposit({ value: depositAmount });
    await chequeBank.withdraw(depositAmount);
    let balance = await chequeBank.balanceOf();
    expect(balance).equal(0);
  });

  it("Should withdraw failed if not enough balance", async function () {
    const depositAmount = ethers.utils.parseEther("1.0");
    await chequeBank.deposit({ value: depositAmount });
    await expect(chequeBank.withdraw(depositAmount.mul(2))).revertedWith(
      "not enough balance to withdraw"
    );
  });

  it("Should withdrawTo successfully and change balance", async function () {
    const depositAmount = ethers.utils.parseEther("1.0");
    await chequeBank.deposit({ value: depositAmount });
    let balanceDelta = await balanceChanged(addr1, async () => {
      await chequeBank.withdrawTo(depositAmount, addr1.address);
    });
    expect(balanceDelta).equal(depositAmount);
  });
});
