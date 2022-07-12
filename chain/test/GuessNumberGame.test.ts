import { expect } from "chai";
import { ethers, waffle } from "hardhat";
import { BigNumber, utils } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { MockProvider } from "ethereum-waffle";
import { GuessNumberGame } from "../typechain";
import internal from "stream";

describe("GuessNumberGame", function () {
  let owner: SignerWithAddress;
  let addr1: SignerWithAddress;
  let addr2: SignerWithAddress;
  let addrs: SignerWithAddress[];
  let provider: MockProvider;
  let betAmount: BigNumber;
  let guessNumberGame: GuessNumberGame;
  let randomNonce: string;
  let randomNum: number;
  let nonceHash: string;
  let nonceNumHash: string;
  let playerNumber: number;

  beforeEach(async function () {
    [owner, addr1, addr2, ...addrs] = await ethers.getSigners();
    provider = waffle.provider;
    betAmount = ethers.utils.parseEther("1.0");
    const GuessNumberGame = await ethers.getContractFactory("GuessNumberGame");
    randomNonce = "HELLO";
    randomNum = 689;
    playerNumber = 2;
    nonceHash = utils.keccak256(utils.toUtf8Bytes(randomNonce));
    nonceNumHash = utils.keccak256(
      utils.toUtf8Bytes(`${randomNonce}${randomNum}`)
    );
    guessNumberGame = await GuessNumberGame.deploy(
      nonceHash,
      nonceNumHash,
      playerNumber,
      {
        value: betAmount,
      }
    );
  });

  it("Should have the correct initial supply", async function () {
    expect(await guessNumberGame.betAmount()).equal(betAmount);
    expect(await guessNumberGame.host()).equal(owner.address);
  });

  describe("guess", function () {
    it("Should not call guess with invalid number", async function () {
      [2 ** 16 - 1, 1000, 1001].forEach(async function (value) {
        await expect(guessNumberGame.guess(value)).revertedWith(
          "The number should be in range of [0, 1000)"
        );
      });
    });

    it("Should not guess by the host", async () => {
      await expect(guessNumberGame.guess(1)).revertedWith("Host can not guess");
    });

    it("Should not use mismatched bet amount to guess", async () => {
      await expect(
        guessNumberGame.connect(addr1).guess(1, { value: 1 })
      ).revertedWith("The bet amount is not the same as the host set");
    });

    it("Should guess successfully", async () => {
      guessNumberGame.connect(addr1).guess(1, { value: betAmount });
      const guessedNumber = await guessNumberGame.guessedNumbers(addr1.address);
      expect(guessedNumber).equal(1);
    });

    it("Should not guess twice by the same player", async () => {
      guessNumberGame.connect(addr1).guess(1, { value: betAmount });
      await expect(
        guessNumberGame.connect(addr1).guess(2, { value: betAmount })
      ).revertedWith("Can not guess twice");
    });

    it("Should not guess twice by the same number", async () => {
      guessNumberGame.connect(addr1).guess(1, { value: betAmount });
      await expect(
        guessNumberGame.connect(addr2).guess(1, { value: betAmount })
      ).revertedWith("Can not use this number to guess twice");
    });

    it("Should not exceed player number", async () => {
      await guessNumberGame.connect(addr1).guess(1, { value: betAmount });
      await guessNumberGame.connect(addr2).guess(2, { value: betAmount });
      await expect(
        guessNumberGame.connect(addrs[0]).guess(3, { value: betAmount })
      ).revertedWith("No more seats left");
    });

    it("Should not guess after the game concluded", async () => {
      await guessNumberGame.connect(addr1).guess(1, { value: betAmount });
      await guessNumberGame.connect(addr2).guess(2, { value: betAmount });
      await guessNumberGame.reveal(
        utils.formatBytes32String(randomNonce),
        randomNum
      );

      await expect(
        guessNumberGame.connect(addrs[0]).guess(3, { value: betAmount })
      ).revertedWith("The game was ended");
    });
  });

  describe("reveal", async () => {
    it("should failed if use a invalid nonce", async () => {
      await guessNumberGame.connect(addr1).guess(1, { value: betAmount });
      await guessNumberGame.connect(addr2).guess(2, { value: betAmount });
      await expect(
        guessNumberGame.reveal(utils.formatBytes32String("GUESS"), randomNum)
      ).revertedWith("invalid nonce");
    });

    it("should failed if use a invalid number", async () => {
      await guessNumberGame.connect(addr1).guess(1, { value: betAmount });
      await guessNumberGame.connect(addr2).guess(2, { value: betAmount });
      await expect(
        guessNumberGame.reveal(utils.formatBytes32String(randomNonce), 222)
      ).revertedWith("invalid number");
    });

    it("Should not call reveal with invalid number", async function () {
      [2 ** 16 - 1, 1000, 1001].forEach(async function (value) {
        await expect(
          guessNumberGame.reveal(
            utils.formatBytes32String(randomNonce),
            randomNum
          )
        ).revertedWith("The number should be in range of [0, 1000)");
      });
    });

    it("Should not reveal before get enough players", async () => {
      await expect(
        guessNumberGame.reveal(
          utils.formatBytes32String(randomNonce),
          randomNum
        )
      ).revertedWith("joined players are not enough");
    });

    it("Should not reveal after the game concluded", async () => {
      await guessNumberGame.connect(addr1).guess(1, { value: betAmount });
      await guessNumberGame.connect(addr2).guess(2, { value: betAmount });
      await guessNumberGame.reveal(
        utils.formatBytes32String(randomNonce),
        randomNum
      );

      await expect(
        guessNumberGame.reveal(
          utils.formatBytes32String(randomNonce),
          randomNum
        )
      ).revertedWith("The game was ended");
    });
  });
});
