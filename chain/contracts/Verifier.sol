//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

contract Verifier {
    struct ChequeInfo {
        uint256 amount;
        bytes32 chequeId;
        uint32 validFrom;
        uint32 validThru;
        address payee;
        address payer;
    }

    struct Cheque {
        ChequeInfo chequeInfo;
        bytes sig;
    }

    struct Test {
        bytes32 message;
        bytes sig;
        // uint8 v;
        // bytes32 r;
        // bytes32 s;
    }

    function verifyHash(Test memory testData)
        public
        pure
        returns (address signer)
    {
        bytes32 messageDigest = keccak256(
            abi.encodePacked(
                "\x19Ethereum Signed Message:\n32",
                testData.message
            )
        );
        uint8 v;
        bytes32 r;
        bytes32 s;
        (v, r, s) = splitSignature(testData.sig);

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
