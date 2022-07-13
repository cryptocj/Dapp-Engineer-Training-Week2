//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";

contract GuessNumberGame {
    address public host;

    bytes32 public nonceHash;
    bytes32 public nonceNumHash;

    uint256 public playerNumber;
    bool public concluded;
    uint256 public betAmount;

    struct Player {
        address addr;
        uint16 guessedNumber;
    }
    mapping(address => uint16) public guessedNumbers;
    mapping(int16 => Player[]) public playersByDelta;

    Player[] public players;

    constructor(
        bytes32 _nonceHash,
        bytes32 _nonceNumHash,
        uint256 _playerNumber
    ) payable {
        host = msg.sender;
        betAmount = msg.value;
        playerNumber = _playerNumber;
        concluded = false;
        nonceHash = _nonceHash;
        nonceNumHash = _nonceNumHash;
    }

    function guess(uint16 number) external payable {
        require(!concluded, "The game was ended");
        // the number should be [0, 1000)
        if (number < 0 || number >= 1000) {
            revert("The number should be in range of [0, 1000)");
        }

        require(players.length < playerNumber, "No more seats left");

        require(msg.sender != host, "Host can not guess");
        require(
            msg.value == betAmount,
            "The bet amount is not the same as the host set"
        );
        for (uint256 i = 0; i < players.length; i++) {
            if (players[i].addr == msg.sender) {
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

        require(
            players.length == playerNumber,
            "joined players are not enough"
        );
        // check keccak256(nonce) == nonceHash
        require(calNonceHash(nonce) == nonceHash, "invalid nonce");

        // check keccak256(nonce+number) == nonceNumberHash
        require(
            calNonceNumHash(nonce, number) == nonceNumHash,
            "invalid number"
        );

        // the number should be [0, 1000), otherwise
        if (number < 0 || number >= 1000) {
            sendReward(players);
        }

        conclude(number);

        // check who has the closet guessing
        concluded = true;
    }

    function conclude(uint16 number) private {
        Player[] memory wonPlayers = getWonPlayers(number);
        sendReward(wonPlayers);
    }

    function sendReward(Player[] memory wonPlayers) private {
        require(wonPlayers.length > 0, "none player won");

        uint256 totalAmount = betAmount * (1 + playerNumber);
        uint256 rewardAmount = totalAmount / wonPlayers.length;
        uint256 leftAmount = totalAmount - rewardAmount * wonPlayers.length;

        if (leftAmount > 0) {
            payable(wonPlayers[0].addr).transfer(leftAmount); // give more reward to the first player if possible because first one has more risk.
        }

        for (uint8 i = 0; i < wonPlayers.length; i++) {
            payable(wonPlayers[i].addr).transfer(rewardAmount);
        }
    }

    function getWonPlayers(uint16 number) private returns (Player[] memory) {
        int16 minDelta = 9999;
        int16 delta = 0;
        for (uint8 i = 0; i < playerNumber; i++) {
            if (players[i].guessedNumber > number) {
                delta = int16(players[i].guessedNumber - number);
            } else {
                delta = int16(number - players[i].guessedNumber);
            }

            if (delta < minDelta) {
                minDelta = delta;
            }
            playersByDelta[delta].push(players[i]);
        }
        return playersByDelta[minDelta];
    }

    function calNonceHash(bytes32 nonce) public pure returns (bytes32) {
        string memory s = bytes32ToString(nonce);
        return keccak256(abi.encodePacked(s));
    }

    function calNonceNumHash(bytes32 nonce, uint16 number)
        public
        pure
        returns (bytes32)
    {
        string memory s = concatBytes32AndUint16(nonce, number);
        return keccak256(abi.encodePacked(s));
    }

    function concatBytes32AndUint16(bytes32 _b, uint16 _u)
        public
        pure
        returns (string memory)
    {
        string memory _sb = bytes32ToString(_b);
        string memory _su = uint16ToString(_u);
        return string(abi.encodePacked(_sb, _su));
    }

    function bytes32ToString(bytes32 _bytes32)
        public
        pure
        returns (string memory)
    {
        uint8 i = 0;
        while (i < 32 && _bytes32[i] != 0) {
            i++;
        }
        bytes memory bytesArray = new bytes(i);
        for (i = 0; i < 32 && _bytes32[i] != 0; i++) {
            bytesArray[i] = _bytes32[i];
        }
        return string(bytesArray);
    }

    function uint16ToString(uint16 value) public pure returns (string memory) {
        // Inspired by OraclizeAPI's implementation - MIT licence
        // https://github.com/oraclize/ethereum-api/blob/b42146b063c7d6ee1358846c198246239e9360e8/oraclizeAPI_0.4.25.sol
        if (value == 0) {
            return "0";
        }
        uint16 temp = value;
        uint16 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint16(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }
}
