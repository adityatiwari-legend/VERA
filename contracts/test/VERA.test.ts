import { expect } from 'chai';
import hre from 'hardhat';
const { ethers } = hre;
import { VERA } from '../../typechain-types';
import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';

describe('VERA Smart Contract Tests', () => {
  let vera: VERA;
  let admin: HardhatEthersSigner;
  let ngoOwner: HardhatEthersSigner;
  let ngoAdmin: HardhatEthersSigner;
  let campaignOwner: HardhatEthersSigner;
  let auditor: HardhatEthersSigner;
  let donor1: HardhatEthersSigner;
  let donor2: HardhatEthersSigner;
  let unauthorized: HardhatEthersSigner;
  let recipient: HardhatEthersSigner;

  const campaignId = ethers.id('test-campaign-jaipur-1');
  const milestoneId = ethers.id('test-milestone-electrical-1');
  const targetAmount = ethers.parseEther('10.0'); // 10 ETH

  beforeEach(async () => {
    [admin, ngoOwner, ngoAdmin, campaignOwner, auditor, donor1, donor2, unauthorized, recipient] =
      await ethers.getSigners();

    const VERAFactory = await ethers.getContractFactory('VERA');
    vera = (await VERAFactory.deploy()) as VERA;
    await vera.waitForDeployment();
  });

  describe('1. Campaign Creation', () => {
    it('Should create a campaign with 3 designated multisig signers', async () => {
      await expect(
        vera.createCampaign(
          campaignId,
          targetAmount,
          ngoOwner.address,
          ngoAdmin.address,
          campaignOwner.address,
          auditor.address
        )
      )
        .to.emit(vera, 'CampaignCreated')
        .withArgs(campaignId, ngoOwner.address, targetAmount);

      const camp = await vera.getCampaign(campaignId);
      expect(camp.owner).to.equal(ngoOwner.address);
      expect(camp.targetAmount).to.equal(targetAmount);
      expect(camp.active).to.equal(true);
      expect(camp.totalDonated).to.equal(BigInt(0));
      expect(camp.totalReleased).to.equal(BigInt(0));
    });

    it('Should reject duplicate campaign creation with same ID', async () => {
      await vera.createCampaign(
        campaignId,
        targetAmount,
        ngoOwner.address,
        ngoAdmin.address,
        campaignOwner.address,
        auditor.address
      );

      await expect(
        vera.createCampaign(
          campaignId,
          targetAmount,
          ngoOwner.address,
          ngoAdmin.address,
          campaignOwner.address,
          auditor.address
        )
      ).to.be.revertedWith('VERA: campaign already exists');
    });
  });

  describe('2. Donations & Campaign Balance', () => {
    beforeEach(async () => {
      await vera.createCampaign(
        campaignId,
        targetAmount,
        ngoOwner.address,
        ngoAdmin.address,
        campaignOwner.address,
        auditor.address
      );
    });

    it('Should receive donation and update totalDonated', async () => {
      const donationAmount = ethers.parseEther('2.0');

      await expect(
        vera.connect(donor1).donate(campaignId, { value: donationAmount })
      )
        .to.emit(vera, 'DonationReceived')
        .withArgs(campaignId, donor1.address, donationAmount);

      const camp = await vera.getCampaign(campaignId);
      expect(camp.totalDonated).to.equal(donationAmount);
      expect(await vera.donorContributions(campaignId, donor1.address)).to.equal(donationAmount);
    });

    it('Should accept multiple donations from different donors', async () => {
      await vera.connect(donor1).donate(campaignId, { value: ethers.parseEther('2.0') });
      await vera.connect(donor2).donate(campaignId, { value: ethers.parseEther('3.5') });

      const camp = await vera.getCampaign(campaignId);
      expect(camp.totalDonated).to.equal(ethers.parseEther('5.5'));
    });

    it('Should reject 0 value donations', async () => {
      await expect(
        vera.connect(donor1).donate(campaignId, { value: BigInt(0) })
      ).to.be.revertedWith('VERA: donation must be greater than 0');
    });
  });

  describe('3. Milestone Creation & Cap Enforcement', () => {
    beforeEach(async () => {
      await vera.createCampaign(
        campaignId,
        targetAmount, // 10 ETH
        ngoOwner.address,
        ngoAdmin.address,
        campaignOwner.address,
        auditor.address
      );
    });

    it('Should create milestone within campaign target allocation', async () => {
      const msAmount = ethers.parseEther('3.0');

      await expect(vera.createMilestone(campaignId, milestoneId, msAmount))
        .to.emit(vera, 'MilestoneCreated')
        .withArgs(campaignId, milestoneId, msAmount);

      const [ms] = await vera.getMilestone(campaignId, milestoneId);
      expect(ms.amount).to.equal(msAmount);
      expect(ms.released).to.equal(false);
    });

    it('Should enforce financial limit: milestone cannot exceed campaign target', async () => {
      const excessiveAmount = ethers.parseEther('11.0'); // exceeds 10.0 ETH target

      await expect(
        vera.createMilestone(campaignId, milestoneId, excessiveAmount)
      ).to.be.revertedWith('VERA: milestone amount exceeds campaign target');
    });

    it('Should reject duplicate milestone ID under same campaign', async () => {
      await vera.createMilestone(campaignId, milestoneId, ethers.parseEther('3.0'));

      await expect(
        vera.createMilestone(campaignId, milestoneId, ethers.parseEther('2.0'))
      ).to.be.revertedWith('VERA: milestone already exists');
    });
  });

  describe('4. Multi-Signature Release Workflow (2-of-3)', () => {
    const msAmount = ethers.parseEther('3.0'); // 3 ETH
    const releaseAmount = ethers.parseEther('2.85'); // 2.85 ETH

    beforeEach(async () => {
      await vera.createCampaign(
        campaignId,
        targetAmount,
        ngoOwner.address,
        ngoAdmin.address,
        campaignOwner.address,
        auditor.address
      );

      // Milestone created
      await vera.createMilestone(campaignId, milestoneId, msAmount);

      // Funded with 5 ETH
      await vera.connect(donor1).donate(campaignId, { value: ethers.parseEther('5.0') });
    });

    it('Should allow authorized requester to create release request', async () => {
      await expect(
        vera.connect(ngoOwner).requestRelease(campaignId, milestoneId, releaseAmount)
      )
        .to.emit(vera, 'ReleaseRequested')
        .withArgs(campaignId, milestoneId, releaseAmount);

      const [ms] = await vera.getMilestone(campaignId, milestoneId);
      expect(ms.releaseRequested).to.equal(true);
      expect(ms.requestedReleaseAmount).to.equal(releaseAmount);
    });

    it('Should reject release request with amount exceeding milestone allocation', async () => {
      await expect(
        vera.connect(ngoOwner).requestRelease(campaignId, milestoneId, ethers.parseEther('3.5'))
      ).to.be.revertedWith('VERA: requested amount exceeds milestone allocation');
    });

    it('Should reject release request from unauthorized accounts', async () => {
      await expect(
        vera.connect(unauthorized).requestRelease(campaignId, milestoneId, releaseAmount)
      ).to.be.revertedWith('VERA: unauthorized release requester');
    });

    it('Should reject approval from unauthorized non-signers', async () => {
      await vera.connect(ngoOwner).requestRelease(campaignId, milestoneId, releaseAmount);

      await expect(
        vera.connect(unauthorized).approveRelease(campaignId, milestoneId)
      ).to.be.revertedWith('VERA: caller is not an authorized 2-of-3 multisig signer');
    });

    it('Should allow designated signers to approve and increment count', async () => {
      await vera.connect(ngoOwner).requestRelease(campaignId, milestoneId, releaseAmount);

      // Signer 1: NGO Admin approves
      await expect(vera.connect(ngoAdmin).approveRelease(campaignId, milestoneId))
        .to.emit(vera, 'ReleaseApproved')
        .withArgs(campaignId, milestoneId, ngoAdmin.address, BigInt(1));

      let [, currentApprovals] = await vera.getMilestone(campaignId, milestoneId);
      expect(currentApprovals).to.equal(BigInt(1));

      // Signer 2: Auditor approves (reaching 2/3)
      await expect(vera.connect(auditor).approveRelease(campaignId, milestoneId))
        .to.emit(vera, 'ReleaseApproved')
        .withArgs(campaignId, milestoneId, auditor.address, BigInt(2));

      [, currentApprovals] = await vera.getMilestone(campaignId, milestoneId);
      expect(currentApprovals).to.equal(BigInt(2));
    });

    it('Should reject duplicate approvals by the same signer', async () => {
      await vera.connect(ngoOwner).requestRelease(campaignId, milestoneId, releaseAmount);

      await vera.connect(ngoAdmin).approveRelease(campaignId, milestoneId);

      await expect(
        vera.connect(ngoAdmin).approveRelease(campaignId, milestoneId)
      ).to.be.revertedWith('VERA: signer has already approved this release');
    });

    it('Should reject releaseFunds if 2-of-3 threshold is not met (1 approval)', async () => {
      await vera.connect(ngoOwner).requestRelease(campaignId, milestoneId, releaseAmount);
      await vera.connect(ngoAdmin).approveRelease(campaignId, milestoneId); // Only 1 approval

      await expect(
        vera.releaseFunds(campaignId, milestoneId, recipient.address)
      ).to.be.revertedWith('VERA: 2-of-3 multisig threshold not met');
    });

    it('Should successfully release funds when 2 approvals are present', async () => {
      await vera.connect(ngoOwner).requestRelease(campaignId, milestoneId, releaseAmount);

      // 2-of-3 approvals: NGO Admin + Auditor
      await vera.connect(ngoAdmin).approveRelease(campaignId, milestoneId);
      await vera.connect(auditor).approveRelease(campaignId, milestoneId);

      const recipientBalBefore = await ethers.provider.getBalance(recipient.address);

      await expect(
        vera.releaseFunds(campaignId, milestoneId, recipient.address)
      )
        .to.emit(vera, 'FundsReleased')
        .withArgs(campaignId, milestoneId, recipient.address, releaseAmount);

      const recipientBalAfter = await ethers.provider.getBalance(recipient.address);
      expect(recipientBalAfter - recipientBalBefore).to.equal(releaseAmount);

      const [ms] = await vera.getMilestone(campaignId, milestoneId);
      expect(ms.released).to.equal(true);
      expect(ms.releasedAmount).to.equal(releaseAmount);

      const camp = await vera.getCampaign(campaignId);
      expect(camp.totalReleased).to.equal(releaseAmount);
    });

    it('Should prevent double release of the same milestone', async () => {
      await vera.connect(ngoOwner).requestRelease(campaignId, milestoneId, releaseAmount);
      await vera.connect(ngoAdmin).approveRelease(campaignId, milestoneId);
      await vera.connect(auditor).approveRelease(campaignId, milestoneId);

      await vera.releaseFunds(campaignId, milestoneId, recipient.address);

      // Attempt second release
      await expect(
        vera.releaseFunds(campaignId, milestoneId, recipient.address)
      ).to.be.revertedWith('VERA: milestone already released');
    });

    it('Should reject release if release amount exceeds available campaign funds', async () => {
      const bigMilestoneId = ethers.id('big-milestone');
      // Create another milestone of 6 ETH
      await vera.createMilestone(campaignId, bigMilestoneId, ethers.parseEther('6.0'));
      // Request release of 6 ETH, but campaign only has 5 ETH donated
      await vera.connect(ngoOwner).requestRelease(campaignId, bigMilestoneId, ethers.parseEther('6.0'));
      await vera.connect(ngoAdmin).approveRelease(campaignId, bigMilestoneId);
      await vera.connect(auditor).approveRelease(campaignId, bigMilestoneId);

      await expect(
        vera.releaseFunds(campaignId, bigMilestoneId, recipient.address)
      ).to.be.revertedWith('VERA: release amount exceeds available campaign funds');
    });
  });

  describe('5. Refund Path', () => {
    beforeEach(async () => {
      await vera.createCampaign(
        campaignId,
        targetAmount,
        ngoOwner.address,
        ngoAdmin.address,
        campaignOwner.address,
        auditor.address
      );

      // Funded with 4 ETH
      await vera.connect(donor1).donate(campaignId, { value: ethers.parseEther('4.0') });
    });

    it('Should issue refund from available balance and transfer funds', async () => {
      const refundAmount = ethers.parseEther('1.5');
      const donorBalBefore = await ethers.provider.getBalance(donor1.address);

      await expect(
        vera.connect(ngoOwner).refund(campaignId, donor1.address, refundAmount, 'Milestone 2 cancelled')
      )
        .to.emit(vera, 'RefundIssued')
        .withArgs(campaignId, donor1.address, refundAmount, 'Milestone 2 cancelled');

      const donorBalAfter = await ethers.provider.getBalance(donor1.address);
      expect(donorBalAfter - donorBalBefore).to.equal(refundAmount);

      const camp = await vera.getCampaign(campaignId);
      expect(camp.totalReleased).to.equal(refundAmount);
    });

    it('Should reject refund that exceeds available campaign balance', async () => {
      const excessiveRefund = ethers.parseEther('5.0'); // Campaign only has 4 ETH

      await expect(
        vera.connect(ngoOwner).refund(campaignId, donor1.address, excessiveRefund, 'Overdraft refund')
      ).to.be.revertedWith('VERA: refund exceeds available campaign balance');
    });

    it('Should prevent double refund exceeding available balance', async () => {
      // First refund of 3 ETH out of 4 ETH
      await vera.connect(ngoOwner).refund(campaignId, donor1.address, ethers.parseEther('3.0'), 'First refund');

      // Second refund of 2 ETH (3 + 2 > 4 ETH)
      await expect(
        vera.connect(ngoOwner).refund(campaignId, donor1.address, ethers.parseEther('2.0'), 'Second refund')
      ).to.be.revertedWith('VERA: refund exceeds available campaign balance');
    });
  });
});
