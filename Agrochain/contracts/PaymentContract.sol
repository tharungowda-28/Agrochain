// PaymentContract.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract PaymentContract {
    address public farmer;
    address public buyer;
    uint public amount;

    event PaymentMade(address indexed buyer, address indexed farmer, uint amount);

    constructor(address _farmer, address _buyer) {
        farmer = _farmer;
        buyer = _buyer;
        // amount = 0 Initialize with 0, can be set dynamically
    }

    // Set the amount dynamically
    function setAmount(uint _amount) public {
        require(msg.sender == buyer, "Only the buyer can set the amount");
        amount = _amount;
    }

    // Transfer payment from buyer to farmer
    function makePayment() public payable {
        require(msg.sender == buyer, "Only the buyer can make the payment");
        require(msg.value == amount, "Incorrect amount sent");

        payable(farmer).transfer(msg.value);  // Transfer the payment to the farmer

        emit PaymentMade(buyer, farmer, msg.value);
    }
}
