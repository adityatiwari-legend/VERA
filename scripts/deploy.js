const hre = require('hardhat');
const fs = require('fs');
const path = require('path');

async function main() {
  console.log('🚀 Deploying VERA Smart Contract...');

  const { ethers } = hre;
  const [deployer] = await ethers.getSigners();
  console.log(`👤 Deployer address: ${deployer.address}`);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`💰 Deployer balance: ${ethers.formatEther(balance)} ETH`);

  const network = await ethers.provider.getNetwork();
  console.log(`🌐 Network: ${network.name} (Chain ID: ${network.chainId})`);

  const VERAFactory = await ethers.getContractFactory('VERA');
  const vera = await VERAFactory.deploy();
  await vera.waitForDeployment();

  const contractAddress = await vera.getAddress();
  console.log(`✅ VERA Contract deployed to: ${contractAddress}`);

  // Extract ABI
  const artifactPath = path.join(
    process.cwd(),
    'artifacts_hardhat',
    'contracts',
    'VERA.sol',
    'VERA.json'
  );
  let abi = [];
  if (fs.existsSync(artifactPath)) {
    const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
    abi = artifact.abi;
  }

  // Save deployment artifact
  const deploymentInfo = {
    address: contractAddress,
    deployer: deployer.address,
    network: network.name,
    chainId: Number(network.chainId),
    deployedAt: new Date().toISOString(),
    abi,
  };

  const deployedPath = path.join(process.cwd(), 'contracts', 'deployed.json');
  fs.writeFileSync(deployedPath, JSON.stringify(deploymentInfo, null, 2));
  console.log(`📝 Deployment info saved to: ${deployedPath}`);

  // Update .env / .env.local if present
  ['.env', '.env.local'].forEach((envFile) => {
    const envPath = path.join(process.cwd(), envFile);
    if (fs.existsSync(envPath)) {
      let envContent = fs.readFileSync(envPath, 'utf8');
      if (envContent.includes('CONTRACT_ADDRESS=')) {
        envContent = envContent.replace(/CONTRACT_ADDRESS=.*/, `CONTRACT_ADDRESS=${contractAddress}`);
      } else {
        envContent += `\nCONTRACT_ADDRESS=${contractAddress}\n`;
      }
      fs.writeFileSync(envPath, envContent);
      console.log(`⚙️ Updated CONTRACT_ADDRESS in ${envFile}`);
    }
  });

  return deploymentInfo;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Deployment failed:', error);
    process.exit(1);
  });
