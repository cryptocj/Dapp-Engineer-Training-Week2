//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";

contract GuessNumberGame {
    address public host;

    bytes32 public _nonceHash;
    bytes32 public _nonceNumHash;

    uint256 public _playerNumber;
    bool public concluded;
    uint256 public betAmount;

    struct Player {
        address to;
        uint16 guessedNumber;
    }
    mapping(address => uint16) public guessedNumbers;
    Player[] public players;

    constructor(
        bytes32 nonceHash,
        bytes32 nonceNumHash,
        uint256 playerNumber
    ) payable {
        host = msg.sender;
        betAmount = msg.value;
        _playerNumber = playerNumber;
        concluded = false;
        _nonceHash = nonceHash;
        _nonceNumHash = nonceNumHash;
    }

    function guess(uint16 number) external payable {
        require(!concluded, "The game was ended");
        // the number should be [0, 1000)
        if (number < 0 || number >= 1000) {
            revert("The number should be in range of [0, 1000)");
        }

        require(players.length < _playerNumber, "No more seats left");

        require(msg.sender != host, "Host can not guess");
        require(
            msg.value == betAmount,
            "The bet amount is not the same as the host set"
        );
        for (uint256 i = 0; i < players.length; i++) {
            if (players[i].to == msg.sender) {
                revert("Can not guess twice");
            }

            if (players[i].guessedNumber == number) {
                revert("Can not use this number to guess twice");
            }
        }

        guessedNumbers[msg.sender] = number;
        players.push(Player(msg.sender, number));
    }

    function reveal(bytes32 nonce, uint16 number) external {
        require(!concluded, "The game was ended");
        // the number should be [0, 1000)
        if (number < 0 || number >= 1000) {
            revert("The number should be in range of [0, 1000)");
        }

        require(players.length == _playerNumber, "joined players are enough");
        // check keccak256(nonce) == nonceHash
        require(keccak256(abi.encode(nonce)) == _nonceHash, "invalid nonce");

        console.logBytes(abi.encodePacked(nonce, number));
        // check keccak256(nonce+number) == nonceNumberHash
        require(
            keccak256(abi.encodePacked(nonce, number)) == _nonceNumHash,
            "invalid number"
        );

        // check who has the closet guessing
        concluded = true;
    }
}
