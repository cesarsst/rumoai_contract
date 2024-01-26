import * as fs from "fs"
import { network, ethers } from "hardhat"
import { proposalsFile, developmentChains, VOTING_PERIOD } from "../helper-hardhat-config"
import { moveBlocks } from "../utils/move-blocks"


async function main() {

  const [deployer, deployer2] = await ethers.getSigners();
  const deployerAddress = deployer.address;
  const deployer2Address = deployer2.address;

  const ManagerRequestContract = await ethers.getContractAt("ManagerRequests", '0xa513E6E4b8f2a923D98304ec87F64353C4D5C853', deployerAddress);

  const balanceWei = await ethers.provider.getBalance(deployerAddress);
  const balanceEther = ethers.utils.formatEther(balanceWei);
  console.log("Saldo da Conta (Ether):", balanceEther);

  // Detalhes do pedido a ser criado
  const products = ["Product1", "Product2"]; // Substitua com os produtos reais
  const quantities = [2, 3]; // Substitua com as quantidades reais
  const valuesProducts = [100, 150]; // Substitua com os valores reais

  const tokenContract = await ethers.getContract("GovernanceToken");
  const balance = await tokenContract.balanceOf(deployerAddress);
  const balance2 = await tokenContract.balanceOf(deployer2Address);
  console.log(`Token balance of ${deployerAddress}: ${balance.toString()}`);
  console.log(`Token balance of ${deployerAddress}: ${balance2.toString()}`);

  await tokenContract.approve(ManagerRequestContract.address, 5);

  const tx = await ManagerRequestContract.createRequest(ManagerRequestContract.address, products, quantities, valuesProducts);
  const requestReceipt = await tx.wait(1);
  const requestId = requestReceipt.events[3].args.id.toNumber();

  const requestDetails = await ManagerRequestContract.getRequest(requestId);
  console.log("Detalhes do Pedido:");
  console.log("ID:", requestDetails.id.toNumber());
  console.log("Vendedor:", requestDetails.seller);
  console.log("Cliente:", requestDetails.customer);
  console.log("Data:", new Date(requestDetails.date * 1000)); // Converter timestamp para data
  console.log("Produtos:", requestDetails.products);
  console.log("Quantidades:", requestDetails.quantities.map((value: any) => value.toNumber()));
  console.log("Valores:", requestDetails.valuesProducts.map((value: any) => value.toNumber()));
  console.log("paid:", requestDetails.paid);

  await seeAccountsBalance(tokenContract, ManagerRequestContract);
}


async function seeAccountsBalance(tokenContract: any, ManagerRequestContract: any) {
  console.log('TIMELOCK BALANCE:')
  const balanceManagerRequestContract = await tokenContract.balanceOf('0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0');
  console.log(`Token balance of ${ManagerRequestContract.address}: ${balanceManagerRequestContract.toString()}`);

  console.log('ManagerRequestContract BALANCE:')
  const ManagerRequestContractBalance = await tokenContract.balanceOf(ManagerRequestContract.address);
  console.log(`Token balance of ${ManagerRequestContract.address}: ${ManagerRequestContractBalance.toString()}`);
}


main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
