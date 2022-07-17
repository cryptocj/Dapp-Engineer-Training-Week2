import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumber } from "ethers";
import { waffle } from "hardhat";

export async function balanceChanged(
  account: SignerWithAddress,
  f: () => Promise<void>
): Promise<BigNumber> {
  let provider = waffle.provider;
  let accountBalanceBefore = await provider.getBalance(account.address);
  await f();
  let accountBalanceAfter = await provider.getBalance(account.address);
  return accountBalanceAfter.sub(accountBalanceBefore);
}
