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
