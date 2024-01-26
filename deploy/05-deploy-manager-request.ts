import { HardhatRuntimeEnvironment } from "hardhat/types"
import { DeployFunction } from "hardhat-deploy/types"
import verify from "../helper-functions"
import { networkConfig, developmentChains } from "../helper-hardhat-config"
import { ethers } from "hardhat"

const deployBox: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  // @ts-ignore
  const { getNamedAccounts, deployments, network } = hre
  const { deploy, log, get } = deployments
  const { deployer } = await getNamedAccounts()

  const governanceToken = await get("GovernanceToken")

  const baseFee = ethers.utils.parseEther((5).toString());

  log("----------------------------------------------------")
  const ManagerRequests = await deploy("ManagerRequests", {
    from: deployer,
    args: [governanceToken.address, baseFee],
    log: true,
    // we need to wait if on a live network so we can verify properly
    waitConfirmations: networkConfig[network.name].blockConfirmations || 1,
  })
  log(`ManagerRequests at ${ManagerRequests.address}`)
  if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
    await verify(ManagerRequests.address, [])
  }
  const ManagerRequestsContract = await ethers.getContractAt("ManagerRequests", ManagerRequests.address)
  const timeLock = await ethers.getContract("TimeLock")
  const transferTx = await ManagerRequestsContract.transferOwnership(timeLock.address)
  await transferTx.wait(1)

}

export default deployBox
deployBox.tags = ["all", "box"]
