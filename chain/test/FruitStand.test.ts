import { expect } from "chai";
import { ethers, waffle } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { MockProvider } from "ethereum-waffle";
import {
  FruitStand,
  FruitStand__factory,
  MELON,
  OptimizedFruitStand,
  OptimizedFruitStand__factory,
  OptimizedMELON,
  OptimizedWATER,
  WATER,
} from "../typechain";
import { BigNumber } from "ethers";

describe("FruitStand", function () {
  let owner: SignerWithAddress;
  let addr1: SignerWithAddress;
  let addr2: SignerWithAddress;
  let addrs: SignerWithAddress[];
  let provider: MockProvider;
  let fruitStand: FruitStand;
  let FruitStand: FruitStand__factory;
  let optimizedFruitStand: OptimizedFruitStand;
  let OptimizedFruitStand: OptimizedFruitStand__factory;
  let water: WATER;
  let melon: MELON;
  let optimizedWater: OptimizedWATER;
  let optimizedMelon: OptimizedMELON;
  let gasPrice: BigNumber;

  beforeEach(async function () {
    [owner, addr1, addr2, ...addrs] = await ethers.getSigners();
    provider = waffle.provider;
    gasPrice = await provider.getGasPrice();
    FruitStand = await ethers.getContractFactory("FruitStand");
    OptimizedFruitStand = await ethers.getContractFactory(
      "OptimizedFruitStand"
    );
    const initialSupply = ethers.utils.parseEther("1000000.0");
    let WATER = await ethers.getContractFactory("WATER");
    let MELON = await ethers.getContractFactory("MELON");
    water = await WATER.deploy(initialSupply);
    melon = await MELON.deploy(initialSupply);
    let OptimizedWATER = await ethers.getContractFactory("OptimizedWATER");
    let OptimizedMELON = await ethers.getContractFactory("OptimizedMELON");
    optimizedWater = await OptimizedWATER.deploy(initialSupply);
    optimizedMelon = await OptimizedMELON.deploy(initialSupply);
  });

  it("Should have less gas cost to deploy after optimized", async function () {
    const optimizedGasCost = (
      await (
        await OptimizedFruitStand.connect(addr2).deploy(
          water.address,
          melon.address
        )
      ).deployTransaction.wait()
    ).gasUsed;

    const gasCost = (
      await (
        await FruitStand.connect(addr1).deploy(water.address, melon.address)
      ).deployTransaction.wait()
    ).gasUsed;
    expect(optimizedGasCost.lt(gasCost)).eq(true);
  });

  it("Stake optimized", async () => {
    optimizedFruitStand = await OptimizedFruitStand.deploy(
      optimizedWater.address,
      optimizedMelon.address
    );
    await optimizedMelon.transfer(optimizedFruitStand.address, 100000, {
      from: owner.address,
    });
    await optimizedFruitStand.stake(10);
    await provider.send("hardhat_mine", ["0xa"]);
    const optimizedGasCost = (
      await (await optimizedFruitStand.stake(10)).wait()
    ).gasUsed;

    fruitStand = await FruitStand.deploy(water.address, melon.address);
    await melon.transfer(fruitStand.address, 100000, { from: owner.address });
    await fruitStand.stake(10);
    await provider.send("hardhat_mine", ["0xa"]);
    const gasCost = (await (await fruitStand.stake(10)).wait()).gasUsed;

    expect(optimizedGasCost.lt(gasCost)).eq(true);
  });
});
