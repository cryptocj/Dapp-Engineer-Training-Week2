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
    mapping(bytes32 => address) _withdrawnCheques;
    mapping(bytes32 => SignOverInfo) _signOverInfos;

    event Deposit(address indexed from, uint256 value);
    event Withdraw(address indexed to, uint256 value);
    event WithdrawTo(address indexed from, address indexed to, uint256 value);
    event Redeem(
        bytes32 indexed chequeId,
        address indexed payer,
        address indexed payee,
        uint256 amount
    );
    event Revoke(address indexed payer, bytes32 indexed chequeId);
    event NotifySignOver(
        bytes32 indexed chequeId,
        uint256 counter,
        address oldPayee,
        address indexed newPayee
    );

    modifier hasEnoughBalance(uint256 amount) {
        require(
            amount <= _balances[msg.sender],
            "not enough balance to withdraw"
        );
        _;
    }

    modifier redeemCheck(Cheque memory chequeData) {
        if (
            _revokedCheques[chequeData.chequeInfo.chequeId] ==
            chequeData.chequeInfo.payer ||
            (_revokedCheques[chequeData.chequeInfo.chequeId] ==
                _signOverInfos[chequeData.chequeInfo.chequeId].newPayee &&
                _signOverInfos[chequeData.chequeInfo.chequeId].newPayee !=
                address(0))
        ) revert("this cheque was revoked");

        require(
            _withdrawnCheques[chequeData.chequeInfo.chequeId] !=
                chequeData.chequeInfo.payee,
            "this cheque was withdrawn"
        );

        require(
            _verifyCheque(chequeData) == chequeData.chequeInfo.payer,
            "mismatched payer"
        );

        require(
            chequeData.chequeInfo.amount <=
                _balances[chequeData.chequeInfo.payer],
            "not enough balance to redeem"
        );

        if (
            chequeData.chequeInfo.validFrom > 0 &&
            chequeData.chequeInfo.validFrom > block.number
        ) {
            revert(
                "cheque is not valid because of the block number is achieved"
            );
        }

        if (
            chequeData.chequeInfo.validThru > 0 &&
            chequeData.chequeInfo.validThru <= block.number
        ) {
            revert("cheque is expired");
        }
        _;
    }

    function _signOverCheck(SignOver memory signOverData) private view {
        require(
            _verifySignOver(signOverData) == signOverData.signOverInfo.oldPayee,
            "mismatched old payee"
        );

        require(
            signOverData.signOverInfo.counter >= 1 &&
                signOverData.signOverInfo.counter <= 6,
            "counter should be [1, 6]"
        );

        if (_signOverInfos[signOverData.signOverInfo.chequeId].counter > 0) {
            if (
                signOverData.signOverInfo.counter -
                    _signOverInfos[signOverData.signOverInfo.chequeId]
                        .counter !=
                1
            ) {
                revert("counter should be incremental");
            }
        }
    }

    function deposit() external payable {
        if (msg.value > 0) {
            _balances[msg.sender] += msg.value;
            emit Deposit(msg.sender, msg.value);
        }
    }

    function withdraw(uint256 amount) external hasEnoughBalance(amount) {
        if (amount > 0) {
            _balances[msg.sender] -= amount;
            payable(msg.sender).transfer(amount);
            emit Withdraw(msg.sender, amount);
        }
    }

    function withdrawTo(uint256 amount, address payable recipient)
        external
        hasEnoughBalance(amount)
    {
        if (amount > 0) {
            _balances[msg.sender] -= amount;
            recipient.transfer(amount);
            emit WithdrawTo(msg.sender, recipient, amount);
        }
    }

    function balanceOf() external view returns (uint256) {
        return _balances[msg.sender];
    }

    function redeem(Cheque memory chequeData) external redeemCheck(chequeData) {
        if (
            _signOverInfos[chequeData.chequeInfo.chequeId].newPayee !=
            msg.sender
        ) {
            require(
                chequeData.chequeInfo.payee == msg.sender,
                "mismatched payee"
            );
        }

        _withdrawnCheques[chequeData.chequeInfo.chequeId] = msg.sender;

        _balances[chequeData.chequeInfo.payer] -= chequeData.chequeInfo.amount;

        payable(chequeData.chequeInfo.payee).transfer(
            chequeData.chequeInfo.amount
        );

        emit Redeem(
            chequeData.chequeInfo.chequeId,
            chequeData.chequeInfo.payer,
            chequeData.chequeInfo.payee,
            chequeData.chequeInfo.amount
        );
    }

    function revoke(bytes32 chequeId) external {
        _revokedCheques[chequeId] = msg.sender;
        emit Revoke(msg.sender, chequeId);
    }

    function notifySignOver(SignOver memory signOverData) external {
        _signOverCheck(signOverData);

        _signOverInfos[signOverData.signOverInfo.chequeId] = signOverData
            .signOverInfo;

        emit NotifySignOver(
            signOverData.signOverInfo.chequeId,
            signOverData.signOverInfo.counter,
            signOverData.signOverInfo.oldPayee,
            signOverData.signOverInfo.newPayee
        );
    }

    function signOverCounter(bytes32 chequeId) external view returns (uint256) {
        return _signOverInfos[chequeId].counter;
    }

    function redeemSignOver(
        Cheque memory chequeData,
        SignOver[] memory signOverData
    ) external redeemCheck(chequeData) {
        require(signOverData.length > 0, "no sign over founded");

        for (uint256 index = 0; index < signOverData.length; index++) {
            _signOverCheck(signOverData[index]);

            if (
                signOverData[index].signOverInfo.chequeId !=
                chequeData.chequeInfo.chequeId
            ) {
                revert("mismatched cheque id");
            }
            emit NotifySignOver(
                signOverData[index].signOverInfo.chequeId,
                signOverData[index].signOverInfo.counter,
                signOverData[index].signOverInfo.oldPayee,
                signOverData[index].signOverInfo.newPayee
            );
        }

        require(
            chequeData.chequeInfo.payee ==
                signOverData[0].signOverInfo.oldPayee,
            "mismatched payee"
        );

        SignOver memory finalSignOver = signOverData[signOverData.length - 1];

        _withdrawnCheques[chequeData.chequeInfo.chequeId] = finalSignOver
            .signOverInfo
            .newPayee;

        _balances[chequeData.chequeInfo.payer] -= chequeData.chequeInfo.amount;

        _signOverInfos[chequeData.chequeInfo.chequeId] = finalSignOver
            .signOverInfo;

        payable(finalSignOver.signOverInfo.newPayee).transfer(
            chequeData.chequeInfo.amount
        );

        emit Redeem(
            chequeData.chequeInfo.chequeId,
            chequeData.chequeInfo.payer,
            finalSignOver.signOverInfo.newPayee,
            chequeData.chequeInfo.amount
        );
    }

    function isChequeValid(
        address payee,
        Cheque memory chequeData,
        SignOver[] memory signOverData
    ) public view redeemCheck(chequeData) returns (bool) {
        if (signOverData.length == 0) {
            return chequeData.chequeInfo.payee == payee;
        }

        for (uint256 index = 0; index < signOverData.length; index++) {
            _signOverCheck(signOverData[index]);

            if (
                signOverData[index].signOverInfo.chequeId !=
                chequeData.chequeInfo.chequeId
            ) {
                revert("mismatched cheque id");
            }
        }

        // the payee of cheque is the oldPayee of the first signOver
        require(
            chequeData.chequeInfo.payee ==
                signOverData[0].signOverInfo.oldPayee,
            "mismatched payee"
        );

        SignOver memory finalSignOver = signOverData[signOverData.length - 1];

        return payee == finalSignOver.signOverInfo.newPayee;
    }

    function _verifyCheque(Cheque memory chequeData)
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

        return _verifyMessage(message, chequeData.sig);
    }

    function _verifySignOver(SignOver memory signOver)
        private
        pure
        returns (address signer)
    {
        bytes32 message = keccak256(
            abi.encodePacked(
                bytes4(0xFFFFDEAD),
                signOver.signOverInfo.counter,
                signOver.signOverInfo.chequeId,
                signOver.signOverInfo.oldPayee,
                signOver.signOverInfo.newPayee
            )
        );

        return _verifyMessage(message, signOver.sig);
    }

    function _verifyMessage(bytes32 message, bytes memory sig)
        private
        pure
        returns (address signer)
    {
        bytes32 messageDigest = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", message)
        );
        uint8 v;
        bytes32 r;
        bytes32 s;
        (v, r, s) = _splitSignature(sig);

        return ecrecover(messageDigest, v, r, s);
    }

    function _splitSignature(bytes memory sig)
        private
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
