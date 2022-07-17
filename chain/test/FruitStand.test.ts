import { expect } from "chai";
import { ethers, waffle } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { MockProvider } from "ethereum-waffle";
import {
  FruitStand,
  FruitStand__factory,
  MELON,
  OptimizedFruitStand,
  OptimizedFruitStandV2,
  OptimizedFruitStandV2__factory,
  OptimizedFruitStand__factory,
  OptimizedMELON,
  OptimizedMELONV2,
  OptimizedWATER,
  OptimizedWATERV2,
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
  let optimizedFruitStandV2: OptimizedFruitStandV2;
  let OptimizedFruitStandV2: OptimizedFruitStandV2__factory;
  let water: WATER;
  let melon: MELON;
  let optimizedWater: OptimizedWATER;
  let optimizedMelon: OptimizedMELON;
  let optimizedWaterV2: OptimizedWATERV2;
  let optimizedMelonV2: OptimizedMELONV2;
  let gasPrice: BigNumber;

  beforeEach(async function () {
    [owner, addr1, addr2, ...addrs] = await ethers.getSigners();
    provider = waffle.provider;
    gasPrice = await provider.getGasPrice();
    FruitStand = await ethers.getContractFactory("FruitStand");
    OptimizedFruitStand = await ethers.getContractFactory(
      "OptimizedFruitStand"
    );
    OptimizedFruitStandV2 = await ethers.getContractFactory(
      "OptimizedFruitStandV2"
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
    let OptimizedWATERV2 = await ethers.getContractFactory("OptimizedWATERV2");
    let OptimizedMELONV2 = await ethers.getContractFactory("OptimizedMELONV2");
    optimizedWaterV2 = await OptimizedWATERV2.deploy(initialSupply);
    optimizedMelonV2 = await OptimizedMELONV2.deploy(initialSupply);

    optimizedFruitStandV2 = await OptimizedFruitStandV2.deploy(
      optimizedWaterV2.address,
      optimizedMelonV2.address
    );

    optimizedFruitStand = await OptimizedFruitStand.deploy(
      optimizedWater.address,
      optimizedMelon.address
    );

    fruitStand = await FruitStand.deploy(water.address, melon.address);

    await optimizedMelonV2.transfer(
      optimizedFruitStandV2.address,
      100000000000,
      {
        from: owner.address,
      }
    );

    await optimizedMelon.transfer(optimizedFruitStand.address, 100000000000, {
      from: owner.address,
    });

    await melon.transfer(fruitStand.address, 100000000000, {
      from: owner.address,
    });
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
    await optimizedMelon.transfer(optimizedFruitStand.address, 100000000000, {
      from: owner.address,
    });
    await optimizedFruitStand.stake(10);
    await provider.send("hardhat_mine", ["0x10"]);
    const optimizedGasCost = (
      await (await optimizedFruitStand.stake(10)).wait()
    ).gasUsed;

    fruitStand = await FruitStand.deploy(water.address, melon.address);
    await melon.transfer(fruitStand.address, 100000000000, {
      from: owner.address,
    });
    await fruitStand.stake(10);
    await provider.send("hardhat_mine", ["0x10"]);
    const gasCost = (await (await fruitStand.stake(10)).wait()).gasUsed;
    console.log(gasCost, optimizedGasCost);
    expect(optimizedGasCost.lt(gasCost)).eq(true);
  });

  it("V2 use mapping to store the fib result in advance", async function () {
    let optimizedGasCostV2 = (
      await optimizedFruitStandV2.deployTransaction.wait()
    ).gasUsed;

    let optimizedGasCost = (await optimizedFruitStand.deployTransaction.wait())
      .gasUsed;

    let gasCost = (await fruitStand.deployTransaction.wait()).gasUsed;

    console.log(
      gasCost.toString(),
      optimizedGasCost.toString(),
      optimizedGasCostV2.toString()
    );

    await optimizedFruitStandV2.stake(10);
    await provider.send("hardhat_mine", ["0x10"]);
    optimizedGasCostV2 = (await (await optimizedFruitStandV2.stake(10)).wait())
      .gasUsed;

    await optimizedFruitStand.stake(10);
    await provider.send("hardhat_mine", ["0x10"]);
    optimizedGasCost = (await (await optimizedFruitStand.stake(10)).wait())
      .gasUsed;

    await fruitStand.stake(10);
    await provider.send("hardhat_mine", ["0x10"]);
    gasCost = (await (await fruitStand.stake(10)).wait()).gasUsed;

    console.log(
      gasCost.toString(),
      optimizedGasCost.toString(),
      optimizedGasCostV2.toString()
    );
  });
});
