import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { MockProvider } from "ethereum-waffle";
import { BigNumber } from "ethers";
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
  let gasPrice: BigNumber;
  beforeEach(async function () {
    [owner, addr1, addr2, ...addrs] = await ethers.getSigners();
    provider = waffle.provider;
    ChequeBank = await ethers.getContractFactory("ChequeBank");
    chequeBank = await ChequeBank.deploy();
    gasPrice = await provider.getGasPrice();
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

  describe("redeem", function () {
    let chequeInfo: any;
    let depositAmount: BigNumber;
    let contractAddress: string;
    this.beforeEach(async () => {
      chequeInfo = {
        amount: ethers.utils.parseEther("0.1"),
        chequeId: ethers.utils.hexZeroPad(
          ethers.utils.toUtf8Bytes("11111111"),
          32
        ),
        validFrom: 0,
        validThru: 0,
        payer: owner.address,
        payee: addr1.address,
      };

      depositAmount = ethers.utils.parseEther("1.0");
      await chequeBank.deposit({ value: depositAmount });
      contractAddress = chequeBank.address;
    });
    it("Should redeem successfully by offline signature", async function () {
      const messageHash = ethers.utils.keccak256(
        ethers.utils.solidityPack(
          [
            "bytes32",
            "bytes20",
            "bytes20",
            "uint256",
            "bytes20",
            "uint32",
            "uint32",
          ],
          [
            chequeInfo.chequeId,
            ethers.utils.arrayify(chequeInfo.payer),
            ethers.utils.arrayify(chequeInfo.payee),
            chequeInfo.amount,
            ethers.utils.arrayify(contractAddress),
            chequeInfo.validFrom,
            chequeInfo.validThru,
          ]
        )
      );

      let messageHashBytes = ethers.utils.arrayify(messageHash);
      let flatSig = await owner.signMessage(messageHashBytes);
      let txFee = BigNumber.from(0);
      let balanceDelta = await balanceChanged(addr1, async () => {
        let tx = await chequeBank.connect(addr1).redeem({
          chequeInfo: chequeInfo,
          sig: flatSig,
        });
        let receipt = await tx.wait();
        txFee = receipt.gasUsed.mul(receipt.effectiveGasPrice);
      });
      let balanceAfter = await chequeBank.balanceOf();
      expect(ethers.utils.parseEther("0.9")).equal(balanceAfter);
      expect(txFee.add(balanceDelta)).equal(chequeInfo.amount);
    });

    it("Should redeem failed if payee mismatched", async function () {
      await expect(
        chequeBank.redeem({
          chequeInfo: chequeInfo,
          sig: ethers.utils.hexZeroPad(ethers.utils.toUtf8Bytes("test"), 32),
        })
      ).revertedWith("mismatched payee");
    });
  });
});
