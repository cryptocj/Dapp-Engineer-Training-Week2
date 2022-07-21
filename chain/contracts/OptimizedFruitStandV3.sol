//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "hardhat/console.sol";

contract OptimizedWATERV3 is ERC20 {
    constructor(uint256 initialSupply) ERC20("WaterToken", "WATER") {
        _mint(msg.sender, initialSupply);
    }
}

contract OptimizedMELONV3 is ERC20 {
    constructor(uint256 initialSupply) ERC20("MelonToken", "MELON") {
        _mint(msg.sender, initialSupply);
    }
}

contract OptimizedFruitStandV3 {
    struct UserStake {
        uint256 startBlock;
        uint256 stakeAmount;
    }

    ERC20 immutable water;
    ERC20 immutable melon;
    mapping(address => UserStake) userStakes;

    mapping(uint256 => uint256) fibNumbers;

    constructor(address _water, address _melon) {
        water = ERC20(_water);
        melon = ERC20(_melon);
    }

    function stake(uint256 _amount) external {
        if (userStakes[msg.sender].startBlock != 0) {
            // Pay out current stake
            payout(msg.sender, userStakes[msg.sender]);
        }

        UserStake memory newStake = UserStake({
            startBlock: block.number,
            stakeAmount: _amount
        });

        userStakes[msg.sender] = newStake;
    }

    function unstake() external {
        require(userStakes[msg.sender].startBlock != 0, "User have not staked");
        payout(msg.sender, userStakes[msg.sender]);
        userStakes[msg.sender] = UserStake({startBlock: 0, stakeAmount: 0});
    }

    function payout(address user, UserStake memory stake)
        internal
        returns (uint256 errCode)
    {
        uint256 blockDelta = block.number - stake.startBlock;
        if (blockDelta > 300) {
            blockDelta = 300;
        }

        uint256 multiplier = 0;
        // multiplier = fib(blockDelta);
        if (fibNumbers[blockDelta] > 0) {
            multiplier = fibNumbers[blockDelta];
        } else {
            multiplier = fib(blockDelta);
            fibNumbers[blockDelta] = multiplier;
        }
        uint256 rewardAmount = multiplier * stake.stakeAmount;
        melon.transfer(user, rewardAmount);
        return 0;
    }

    function fib(uint256 n) private pure returns (uint256 a) {
        if (n == 0) {
            return 0;
        }
        uint256 h = n / 2;
        uint256 mask = 1;
        // find highest set bit in n
        while (mask <= h) {
            mask <<= 1;
        }
        mask >>= 1;
        a = 1;
        uint256 b = 1;
        uint256 c;
        while (mask > 0) {
            c = a * a + b * b;
            if (n & mask > 0) {
                b = b * (b + 2 * a);
                a = c;
            } else {
                a = a * (2 * b - a);
                b = c;
            }
            mask >>= 1;
        }
        return a;
    }
}
