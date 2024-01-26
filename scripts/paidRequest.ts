import * as fs from "fs"
import { network, ethers } from "hardhat"
import { proposalsFile, developmentChains, VOTING_PERIOD } from "../helper-hardhat-config"
import { moveBlocks } from "../utils/move-blocks"


async function main() {

  const [deployer, deployer2] = await ethers.getSigners();
  const deployerAddress = deployer.address;

  const ManagerRequestContract = await ethers.getContractAt("ManagerRequests", '0xa513E6E4b8f2a923D98304ec87F64353C4D5C853', deployerAddress);
  const tokenContract = await ethers.getContract("GovernanceToken");

  const requestId = "1"
  let requestDetails = await ManagerRequestContract.getRequest(requestId);
  const tokenFee = await ManagerRequestContract.tokenFee();
  const quantity = requestDetails.quantities.map((value: any) => value.toNumber());
  const values = requestDetails.valuesProducts.map((value: any) => value.toNumber());

  let totalToApprove = 0;
  for (let i = 0; i < quantity.length; i++) {
    totalToApprove += quantity[i] * values[i];
  }
  await tokenContract.approve(ManagerRequestContract.address, totalToApprove + tokenFee);

  const tx = await ManagerRequestContract.payRequest(requestId);
  await tx.wait(1);

  requestDetails = await ManagerRequestContract.getRequest(requestId);
  console.log("Detalhes do Pedido:");
  console.log("ID:", requestDetails.id.toNumber());
  console.log("Vendedor:", requestDetails.seller);
  console.log("Cliente:", requestDetails.customer);
  console.log("Data:", new Date(requestDetails.date * 1000)); // Converter timestamp para data
  console.log("Produtos:", requestDetails.products);
  console.log("Quantidades:", requestDetails.quantities.map((value: any) => value.toNumber()));
  console.log("Valores:", requestDetails.valuesProducts.map((value: any) => value.toNumber()));
  console.log("paid:", requestDetails.paid);

  await seeAccountsBalance(tokenContract, ManagerRequestContract, deployer);
}


async function seeAccountsBalance(tokenContract: any, ManagerRequestContract: any, signer: any) {
  console.log('TIMELOCK BALANCE:')
  const balanceManagerRequestContract = await tokenContract.balanceOf('0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0');
  console.log(`Token balance of ${ManagerRequestContract.address}: ${balanceManagerRequestContract.toString()}`);

  console.log('ManagerRequestContract BALANCE:')
  const ManagerRequestContractBalance = await tokenContract.balanceOf(ManagerRequestContract.address);
  console.log(`Token balance of ${ManagerRequestContract.address}: ${ManagerRequestContractBalance.toString()}`);

  console.log('signerBalance BALANCE:')
  const signerBalance = await tokenContract.balanceOf(signer.address);
  console.log(`Token balance of ${signer.address}: ${signerBalance.toString()}`);
}


main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
