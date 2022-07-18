//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

contract ChequeBank {
    struct ChequeInfo {
        uint256 amount;
        bytes32 chequeId;
        uint32 validFrom;
        uint32 validThru;
        address payee;
        address payer;
    }

    struct SignOverInfo {
        uint8 counter;
        bytes32 chequeId;
        address oldPayee;
        address newPayee;
    }

    struct Cheque {
        ChequeInfo chequeInfo;
        bytes sig;
    }

    struct SignOver {
        SignOverInfo signOverInfo;
        bytes sig;
    }

    mapping(address => uint256) _balances;
    mapping(bytes32 => address) _revokedCheques;

    modifier hasEnoughBalance(uint256 amount) {
        require(
            amount <= _balances[msg.sender],
            "not enough balance to withdraw"
        );
        _;
    }

    function deposit() external payable {
        if (msg.value > 0) {
            _balances[msg.sender] += msg.value;
        }
    }

    function withdraw(uint256 amount) external hasEnoughBalance(amount) {
        _balances[msg.sender] -= amount;
        payable(msg.sender).transfer(amount);
    }

    function withdrawTo(uint256 amount, address payable recipient)
        external
        hasEnoughBalance(amount)
    {
        _balances[msg.sender] -= amount;
        recipient.transfer(amount);
    }

    function balanceOf() external view returns (uint256) {
        return _balances[msg.sender];
    }

    function redeem(Cheque memory chequeData) external {
        require(chequeData.chequeInfo.payee == msg.sender, "mismatched payee");

        require(
            _revokedCheques[chequeData.chequeInfo.chequeId] !=
                chequeData.chequeInfo.payer,
            "this cheque was revoked"
        );

        require(
            verifyHash(chequeData) == chequeData.chequeInfo.payer,
            "mismatched payer"
        );

        require(
            chequeData.chequeInfo.amount <=
                _balances[chequeData.chequeInfo.payer],
            "not enough balance to redeem"
        );

        _balances[chequeData.chequeInfo.payer] -= chequeData.chequeInfo.amount;

        payable(chequeData.chequeInfo.payee).transfer(
            chequeData.chequeInfo.amount
        );
    }

    function revoke(bytes32 chequeId) external {
        _revokedCheques[chequeId] = msg.sender;
    }

    function notifySignOver(SignOver memory signOverData) external {}

    function redeemSignOver(
        Cheque memory chequeData,
        SignOver[] memory signOverData
    ) external {}

    function isChequeValid(
        address payee,
        Cheque memory chequeData,
        SignOver[] memory signOverData
    ) public view returns (bool) {}

    function verifyHash(Cheque memory chequeData)
        private
        view
        returns (address signer)
    {
        bytes32 message = keccak256(
            abi.encodePacked(
                chequeData.chequeInfo.chequeId,
                chequeData.chequeInfo.payer,
                chequeData.chequeInfo.payee,
                chequeData.chequeInfo.amount,
                this,
                chequeData.chequeInfo.validFrom,
                chequeData.chequeInfo.validThru
            )
        );

        bytes32 messageDigest = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", message)
        );
        uint8 v;
        bytes32 r;
        bytes32 s;
        (v, r, s) = splitSignature(chequeData.sig);

        return ecrecover(messageDigest, v, r, s);
    }

    function splitSignature(bytes memory sig)
        public
        pure
        returns (
            uint8,
            bytes32,
            bytes32
        )
    {
        require(sig.length == 65);
        bytes32 r;
        bytes32 s;
        uint8 v;
        assembly {
            // first 32 bytes, after the length prefix
            r := mload(add(sig, 32))
            // second 32 bytes
            s := mload(add(sig, 64))
            // final byte (first byte of the next 32 bytes)
            v := byte(0, mload(add(sig, 96)))
        }
        return (v, r, s);
    }
}
