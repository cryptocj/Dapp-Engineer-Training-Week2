# Week2 assignment
The game logic is in chain directory, can ignore web3app first.

## Coding part
The contract file path is `chain/contracts/GuessNumberGame.sol`.

The test file path is `chain/test/GuessNumberGame.test.ts`.

My nodejs version is `v16.15.1`

Install the dependencies first
```shell
yarn install
```

And run the test by
```shell
npx hardhat test 
```

## Writing part
- Explain the reason of having both nonceHash and nonceNumHash in the smart contract. Can any of these two be omitted and why?
  
  Can not omit.
  1. for sure only the host know the secret number
  2. also the host can approve the secret number is stored before the reveal
  3. the storage can be read by RPC method `ethers.provider.getStorageAt` no matter it's public or private

- Try to find out any security loopholes in the above design and propose an improved solution.
  loopholes
  1. if the host uses another wallet to join this game, the last player can not win
  2. the host always lose money
  Improved solution:
  1. it's better to generate a true random secret number nobody could know it before the reveal, such as https://docs.chain.link/docs/chainlink-vrf/
  2. there is no host, everyone could be a player

# Week3 assignment

## Task 1: Smart Contract Optimization

can run the tests by
```shell
npx hardhat test --grep "FruitStand"
```

There are three optimized version in:
- `contracts/OptimizedFruitStand.sol`
- `contracts/OptimizedFruitStandV2.sol`
- `contracts/OptimizedFruitStandV3.sol`

### same parts
1. All have this optimization:
```solidity
    ERC20 immutable water;
    ERC20 immutable melon;
```

2. and this:
`uint8 errCode` -> `uint256 errCode`

3. and the new implementation of `fib`.

### different parts
The different is mainly on the `payout` function:

- the first version only includes new fib function
- the second version uses mapping to store all the fib values in advance
- the third version uses cache to store the fib values (I like this one)

## Task 2: Smart Contract Development: Ethereum e-Cheque

can run the tests by
```shell
npx hardhat test --grep "ChequeBank"
```

the path is `contracts/ChequeBank.sol`

This one is a little bit complex but interesting, 
I added a lot of test cases should split into shore files for simplicity,
I think I still need time to discuss about the requirements and check if the test case is enough.

