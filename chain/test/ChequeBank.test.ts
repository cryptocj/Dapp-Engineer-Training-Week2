import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { MockProvider } from "ethereum-waffle";
import { BigNumber, BigNumberish } from "ethers";
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
  let chequeAmount: BigNumber;
  let depositAmount: BigNumber;

  beforeEach(async function () {
    [owner, addr1, addr2, ...addrs] = await ethers.getSigners();
    provider = waffle.provider;
    ChequeBank = await ethers.getContractFactory("ChequeBank");
    chequeBank = await ChequeBank.deploy();
    gasPrice = await provider.getGasPrice();
    chequeAmount = ethers.utils.parseEther("0.1");
    depositAmount = ethers.utils.parseEther("1.0");
  });

  it("Should deposit successfully and change balance", async function () {
    let balance = await chequeBank.balanceOf();
    expect(balance).equal(0);
    await expect(chequeBank.deposit({ value: depositAmount }))
      .to.emit(chequeBank, "Deposit")
      .withArgs(owner.address, depositAmount);
    balance = await chequeBank.balanceOf();
    expect(balance).equal(depositAmount);
  });

  it("Should deposit 0 successfully without changing balance", async function () {
    await chequeBank.deposit({
      value: 0,
    });

    let balance = await chequeBank.balanceOf();
    expect(balance).equal(0);
  });

  it("Should withdraw successfully and change balance", async function () {
    await chequeBank.deposit({ value: depositAmount });
    await expect(chequeBank.withdraw(depositAmount))
      .to.emit(chequeBank, "Withdraw")
      .withArgs(owner.address, depositAmount);
    let balance = await chequeBank.balanceOf();
    expect(balance).equal(0);
  });

  it("Should withdraw failed if not enough balance", async function () {
    await chequeBank.deposit({ value: depositAmount });
    await expect(chequeBank.withdraw(depositAmount.mul(2))).revertedWith(
      "not enough balance to withdraw"
    );
  });

  it("Should not emit Withdraw event if the amount equal to 0", async function () {
    await expect(chequeBank.withdraw(0)).to.not.emit(chequeBank, "Withdraw");
  });

  it("Should withdrawTo successfully and change balance", async function () {
    await chequeBank.deposit({ value: depositAmount });
    let balanceDelta = await balanceChanged(addr1, async () => {
      await expect(chequeBank.withdrawTo(depositAmount, addr1.address))
        .to.emit(chequeBank, "WithdrawTo")
        .withArgs(owner.address, addr1.address, depositAmount);
    });
    expect(balanceDelta).equal(depositAmount);
  });

  describe("redeem", function () {
    interface ChequeInfo {
      amount: BigNumber;
      chequeId: string;
      validFrom: BigNumberish;
      validThru: BigNumberish;
      payer: string;
      payee: string;
    }
    let chequeInfo: ChequeInfo;
    let depositAmount: BigNumber;
    let contractAddress: string;
    let chequeInfoSig: string;

    async function signChequeInfo(
      chequeInfo: ChequeInfo,
      contractAddress: string
    ): Promise<string> {
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
      let sig = await owner.signMessage(messageHashBytes);
      return sig;
    }
    this.beforeEach(async () => {
      depositAmount = ethers.utils.parseEther("1.0");
      await chequeBank.deposit({ value: depositAmount });
      contractAddress = chequeBank.address;
      chequeInfo = {
        amount: chequeAmount,
        chequeId: ethers.utils.hexZeroPad(
          ethers.utils.toUtf8Bytes("11111111"),
          32
        ),
        validFrom: 0,
        validThru: 0,
        payer: owner.address,
        payee: addr1.address,
      };
      chequeInfoSig = await signChequeInfo(chequeInfo, contractAddress);
    });

    it("Should redeem successfully by offline signature", async function () {
      let txFee = BigNumber.from(0);
      let balanceDelta = await balanceChanged(addr1, async () => {
        let tx = await chequeBank.connect(addr1).redeem({
          chequeInfo: chequeInfo,
          sig: chequeInfoSig,
        });
        let receipt = await tx.wait();
        txFee = receipt.gasUsed.mul(receipt.effectiveGasPrice);
      });
      let balanceAfter = await chequeBank.balanceOf();
      expect(ethers.utils.parseEther("0.9")).equal(balanceAfter);
      expect(txFee.add(balanceDelta)).equal(chequeInfo.amount);
    });

    it("Should emit Redeem event after redeem successfully", async () => {
      await expect(
        chequeBank.connect(addr1).redeem({
          chequeInfo: chequeInfo,
          sig: chequeInfoSig,
        })
      )
        .to.emit(chequeBank, "Redeem")
        .withArgs(
          chequeInfo.chequeId,
          chequeInfo.payer,
          chequeInfo.payee,
          chequeInfo.amount
        );
    });

    it("Should not redeem twice", async function () {
      await chequeBank.connect(addr1).redeem({
        chequeInfo: chequeInfo,
        sig: chequeInfoSig,
      });

      await expect(
        chequeBank.connect(addr1).redeem({
          chequeInfo: chequeInfo,
          sig: chequeInfoSig,
        })
      ).revertedWith("this cheque was withdrawn");
    });

    it("Should redeem failed if payee mismatched", async function () {
      await expect(
        chequeBank.redeem({
          chequeInfo: chequeInfo,
          sig: chequeInfoSig,
        })
      ).revertedWith("mismatched payee");
    });

    it("Should redeem failed if wrong signature", async function () {
      await expect(
        chequeBank.connect(addr1).redeem({
          chequeInfo: chequeInfo,
          sig: ethers.utils.hexZeroPad(ethers.utils.toUtf8Bytes("test"), 32),
        })
      ).reverted;
    });

    it("Should redeem failed if payer mismatched", async function () {
      chequeInfo.payer = addr2.address;
      chequeInfoSig = await signChequeInfo(chequeInfo, contractAddress);
      await expect(
        chequeBank.connect(addr1).redeem({
          chequeInfo: chequeInfo,
          sig: chequeInfoSig,
        })
      ).revertedWith("mismatched payer");
    });

    it("Should redeem failed if balance is not enough", async function () {
      chequeInfo.amount = ethers.utils.parseEther("1.1");
      chequeInfoSig = await signChequeInfo(chequeInfo, contractAddress);
      await expect(
        chequeBank.connect(addr1).redeem({
          chequeInfo: chequeInfo,
          sig: chequeInfoSig,
        })
      ).revertedWith("not enough balance to redeem");
    });

    it("Should redeem failed if revoked", async () => {
      await expect(chequeBank.revoke(chequeInfo.chequeId))
        .to.emit(chequeBank, "Revoke")
        .withArgs(owner.address, chequeInfo.chequeId);

      await expect(
        chequeBank.connect(addr1).redeem({
          chequeInfo: chequeInfo,
          sig: chequeInfoSig,
        })
      ).revertedWith("this cheque was revoked");
    });

    // TODO
    it("Should expired", async () => {});

    describe("notifySignOver", async () => {
      interface SignOverInfo {
        counter: BigNumberish;
        chequeId: string;
        oldPayee: string;
        newPayee: string;
      }
      interface SignOver {
        signOverInfo: SignOverInfo;
        sig: string;
      }
      let signOverInfo: SignOverInfo;
      let signOverInfoSig: string;
      let signOverMagicNumber: string;

      async function getSigOfSignChequeInfo(
        signOverInfo: SignOverInfo,
        signer: SignerWithAddress
      ): Promise<string> {
        signOverMagicNumber = "0xFFFFDEAD";
        const messageHash = ethers.utils.keccak256(
          ethers.utils.solidityPack(
            ["bytes4", "uint8", "bytes32", "bytes20", "bytes20"],
            [
              ethers.utils.arrayify(signOverMagicNumber),
              signOverInfo.counter,
              signOverInfo.chequeId,
              ethers.utils.arrayify(signOverInfo.oldPayee),
              ethers.utils.arrayify(signOverInfo.newPayee),
            ]
          )
        );
        let messageHashBytes = ethers.utils.arrayify(messageHash);
        let sig = await signer.signMessage(messageHashBytes);
        return sig;
      }
      this.beforeEach(async () => {
        signOverInfo = {
          counter: 1,
          chequeId: ethers.utils.hexZeroPad(
            ethers.utils.toUtf8Bytes("11111111"),
            32
          ),
          oldPayee: addr1.address,
          newPayee: addr2.address,
        };
        signOverInfoSig = await getSigOfSignChequeInfo(signOverInfo, addr1);
      });

      it("Should success", async function () {
        await chequeBank.notifySignOver({
          signOverInfo: signOverInfo,
          sig: signOverInfoSig,
        });

        let counter = await chequeBank.signOverCounter(signOverInfo.chequeId);
        expect(counter).equal(1);
      });

      it("Should success 6 times with incremental counter", async function () {
        for (let index = 1; index <= 6; index++) {
          signOverInfo.counter = index;
          signOverInfoSig = await getSigOfSignChequeInfo(signOverInfo, addr1);
          await chequeBank.notifySignOver({
            signOverInfo: signOverInfo,
            sig: signOverInfoSig,
          });

          let counter = await chequeBank.signOverCounter(signOverInfo.chequeId);
          expect(counter).equal(index);
        }
      });

      it("Should failed if payee mismatched", async () => {
        signOverInfo.oldPayee = owner.address;
        signOverInfoSig = await getSigOfSignChequeInfo(signOverInfo, addr1);
        await expect(
          chequeBank.notifySignOver({
            signOverInfo: signOverInfo,
            sig: signOverInfoSig,
          })
        ).revertedWith("mismatched old payee");
      });

      it("Should failed if counter is not in the range [1,6]", async function () {
        [0, 7].forEach(async function (value) {
          signOverInfo.counter = value;
          signOverInfoSig = await getSigOfSignChequeInfo(signOverInfo, addr1);
          await expect(
            chequeBank.notifySignOver({
              signOverInfo: signOverInfo,
              sig: signOverInfoSig,
            })
          ).revertedWith("counter should be [1, 6]");
        });
      });

      it("Should failed if counter is not incremental", async function () {
        await chequeBank.notifySignOver({
          signOverInfo: signOverInfo,
          sig: signOverInfoSig,
        });

        signOverInfo.counter = 3;
        signOverInfoSig = await getSigOfSignChequeInfo(signOverInfo, addr1);
        await expect(
          chequeBank.connect(addr2).notifySignOver({
            signOverInfo: signOverInfo,
            sig: signOverInfoSig,
          })
        ).revertedWith("counter should be incremental");
      });

      it("Should redeem successfully after sign over", async () => {
        await chequeBank.notifySignOver({
          signOverInfo: signOverInfo,
          sig: signOverInfoSig,
        });

        await chequeBank.connect(addr2).redeem({
          chequeInfo: chequeInfo,
          sig: chequeInfoSig,
        });

        let balanceAfter = await chequeBank.balanceOf();
        expect(ethers.utils.parseEther("0.9")).equal(balanceAfter);
      });

      // Question 4: Can a signed-over payee revoke the cheque?
      it("Should redeem failed if revoked by the signed-over payee", async () => {
        await chequeBank.notifySignOver({
          signOverInfo: signOverInfo,
          sig: signOverInfoSig,
        });

        await chequeBank.connect(addr2).revoke(chequeInfo.chequeId);
        await expect(
          chequeBank.connect(addr2).redeem({
            chequeInfo: chequeInfo,
            sig: chequeInfoSig,
          })
        ).revertedWith("this cheque was revoked");
      });

      describe("redeemSignOver", async () => {
        it("Should redeemSignOver successfully", async () => {
          await chequeBank.connect(addr2).redeemSignOver(
            {
              chequeInfo: chequeInfo,
              sig: chequeInfoSig,
            },
            [
              {
                signOverInfo: signOverInfo,
                sig: signOverInfoSig,
              },
            ]
          );

          let balanceAfter = await chequeBank.balanceOf();
          expect(ethers.utils.parseEther("0.9")).equal(balanceAfter);
        });

        it("Should redeemSignOver successfully with multiple sign over", async () => {
          let signOvers = new Array<SignOver>();
          let newSignOverInfo;
          let newSig;

          chequeInfo.payee = addrs[0].address;
          chequeInfoSig = await signChequeInfo(chequeInfo, contractAddress);

          for (let index = 1; index <= 3; index++) {
            newSignOverInfo = { ...signOverInfo };
            newSignOverInfo.counter = index;
            newSignOverInfo.oldPayee = addrs[index - 1].address;
            newSignOverInfo.newPayee = addrs[index].address;
            newSig = await getSigOfSignChequeInfo(
              newSignOverInfo,
              addrs[index - 1]
            );
            signOvers.push({ signOverInfo: newSignOverInfo, sig: newSig });
          }

          let txFee = BigNumber.from(0);

          let balanceDelta = await balanceChanged(addrs[3], async () => {
            let tx = await chequeBank.connect(addrs[3]).redeemSignOver(
              {
                chequeInfo: chequeInfo,
                sig: chequeInfoSig,
              },
              signOvers
            );
            let receipt = await tx.wait();
            txFee = receipt.gasUsed.mul(receipt.effectiveGasPrice);
          });
          expect(txFee.add(balanceDelta)).equal(chequeInfo.amount);
        });
      });

      describe("isChequeValid", async () => {
        it("Should be valid with sign over", async () => {
          let isValid = await chequeBank.connect(addr2).isChequeValid(
            addr2.address,
            {
              chequeInfo: chequeInfo,
              sig: chequeInfoSig,
            },
            [
              {
                signOverInfo: signOverInfo,
                sig: signOverInfoSig,
              },
            ]
          );
          expect(isValid).equal(true);
        });

        it("Should be valid with empty sign over", async () => {
          let isValid = await chequeBank.connect(addr1).isChequeValid(
            addr1.address,
            {
              chequeInfo: chequeInfo,
              sig: chequeInfoSig,
            },
            []
          );
          expect(isValid).equal(true);
        });
      });
    });
  });
});
