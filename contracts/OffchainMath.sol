// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract OffchainMath {
    using ECDSA for bytes32;

    enum Status {
        IDLE,
        PENDING
    }

    struct Params {
        uint256 param1;
        uint256 param2;
        uint256 result;
        Status status;
    }

    mapping(address => Params) private requests;

    address public immutable BACKEND_SIGNER;

    constructor(address _backendSigner) {
        BACKEND_SIGNER = _backendSigner;
    }

    function first(uint256 param1, uint256 param2) public {
        // strong validation
        require(param1 > 0 && param2 > 0, "wrong params");

        requests[msg.sender].param1 = param1;
        requests[msg.sender].param2 = param2;
        requests[msg.sender].result = 0;
        requests[msg.sender].status = Status.PENDING;
    }

    function second(uint256 result, bytes memory signature) public {
        Params memory request = requests[msg.sender];

        // verify input data
        require(
            isDataValid(request.param1, request.param2, result, signature),
            "invalid signature"
        );

        requests[msg.sender].result = result;
        requests[msg.sender].status = Status.IDLE;
    }

    function getParams(address addr) public view returns (uint256, uint256) {
        Params memory request = requests[addr];

        require(request.status != Status.IDLE, "waiting for first tx");

        return (request.param1, request.param2);
    }

    function getStatus(address addr) public view returns (Status) {
        Params memory request = requests[addr];
        return request.status;
    }

    function getResult(address addr) public view returns (uint256 result) {
        Params memory request = requests[addr];

        require(request.status != Status.PENDING, "waiting for second tx");

        return request.result;
    }

    function isDataValid(
        uint256 param1,
        uint256 param2,
        uint256 result,
        bytes memory signature
    ) internal view returns (bool isValid) {
        bytes32 msgHash = keccak256(
            abi.encodePacked(msg.sender, param1, param2, result)
        );

        if (isValidSignature(msgHash, signature)) {
            return true;
        } else {
            return false;
        }
    }

    function isValidSignature(bytes32 hash, bytes memory signature)
        internal
        view
        returns (bool isValid)
    {
        bytes32 signedHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", hash)
        );
        return signedHash.recover(signature) == BACKEND_SIGNER;
    }
}
