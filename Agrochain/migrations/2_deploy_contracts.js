
const PaymentContract = artifacts.require("PaymentContract");

module.exports = function (deployer) {
  // Deploy the contract with only the farmer's and buyer's addresses
  deployer.deploy(PaymentContract, "0x8Cd2b826Af01e621EFC314ec1e116Ca7C1fCD5fA", "0x7591DD35059eff68B46d14c89bB6d671448B4a39");
};
