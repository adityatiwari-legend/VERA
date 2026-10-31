// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title VERA
 * @notice Transparent milestone-based fund custody and 2-of-3 multi-signature release contract.
 * @dev Enforces financial invariants, escrow locking, release authorizations, and refund paths.
 */
contract VERA {
    // Contract deployer / system admin
    address public admin;

    // Mutex guard against reentrancy
    bool private _locked;

    modifier nonReentrant() {
        require(!_locked, "ReentrancyGuard: reentrant call");
        _locked = true;
        _;
        _locked = false;
    }

    modifier onlyAdmin() {
        require(msg.sender == admin, "VERA: only admin authorized");
        _;
    }

    struct Campaign {
        bytes32 id;
        address owner;
        uint256 targetAmount;
        uint256 totalDonated;
        uint256 totalReleased;
        uint256 totalAllocated;
        bool active;
        // 3 designated multisig signers: NGO Admin, Campaign Owner, Certified Auditor
        address ngoAdmin;
        address campaignOwner;
        address auditor;
    }

    struct Milestone {
        bytes32 id;
        uint256 amount;
        uint256 releasedAmount;
        uint256 requestedReleaseAmount;
        bool releaseRequested;
        bool released;
        bool failed;
    }

    // campaignId => Campaign
    mapping(bytes32 => Campaign) public campaigns;

    // campaignId => milestoneId => Milestone
    mapping(bytes32 => mapping(bytes32 => Milestone)) public milestones;

    // campaignId => milestoneId => approver => hasApproved
    mapping(bytes32 => mapping(bytes32 => mapping(address => bool))) public releaseApprovals;

    // campaignId => milestoneId => approvalCount
    mapping(bytes32 => mapping(bytes32 => uint256)) public approvalCounts;

    // campaignId => donor => totalDonated
    mapping(bytes32 => mapping(address => uint256)) public donorContributions;

    // Events
    event CampaignCreated(bytes32 indexed campaignId, address indexed owner, uint256 targetAmount);
    event SignersConfigured(bytes32 indexed campaignId, address ngoAdmin, address campaignOwner, address auditor);
    event DonationReceived(bytes32 indexed campaignId, address indexed donor, uint256 amount);
    event MilestoneCreated(bytes32 indexed campaignId, bytes32 indexed milestoneId, uint256 amount);
    event ReleaseRequested(bytes32 indexed campaignId, bytes32 indexed milestoneId, uint256 amount);
    event ReleaseApproved(bytes32 indexed campaignId, bytes32 indexed milestoneId, address indexed approver, uint256 currentApprovals);
    event FundsReleased(bytes32 indexed campaignId, bytes32 indexed milestoneId, address indexed recipient, uint256 amount);
    event RefundIssued(bytes32 indexed campaignId, address indexed recipient, uint256 amount, string reason);
    event MilestoneFailed(bytes32 indexed campaignId, bytes32 indexed milestoneId, string reason);

    constructor() {
        admin = msg.sender;
    }

    /**
     * @notice Register a new campaign on-chain
     * @param campaignId Unique hash representing the campaign UUID
     * @param targetAmount Target funding goal in units (wei)
     * @param owner The campaign managing NGO address
     * @param ngoAdmin Signer 1: NGO representative
     * @param campaignOwner Signer 2: Project lead / Campaign creator
     * @param auditor Signer 3: Certified independent auditor
     */
    function createCampaign(
        bytes32 campaignId,
        uint256 targetAmount,
        address owner,
        address ngoAdmin,
        address campaignOwner,
        address auditor
    ) external {
        require(campaignId != bytes32(0), "VERA: invalid campaign ID");
        require(targetAmount > 0, "VERA: target amount must be > 0");
        require(campaigns[campaignId].id == bytes32(0), "VERA: campaign already exists");

        // Fallback default signers to owner and admin if not explicitly set
        address s1 = ngoAdmin != address(0) ? ngoAdmin : owner;
        address s2 = campaignOwner != address(0) ? campaignOwner : owner;
        address s3 = auditor != address(0) ? auditor : admin;

        campaigns[campaignId] = Campaign({
            id: campaignId,
            owner: owner,
            targetAmount: targetAmount,
            totalDonated: 0,
            totalReleased: 0,
            totalAllocated: 0,
            active: true,
            ngoAdmin: s1,
            campaignOwner: s2,
            auditor: s3
        });

        emit CampaignCreated(campaignId, owner, targetAmount);
        emit SignersConfigured(campaignId, s1, s2, s3);
    }

    /**
     * @notice Update authorized 2-of-3 multisig signers for a campaign
     */
    function setSigners(
        bytes32 campaignId,
        address ngoAdmin,
        address campaignOwner,
        address auditor
    ) external {
        Campaign storage camp = campaigns[campaignId];
        require(camp.id != bytes32(0), "VERA: campaign not found");
        require(msg.sender == camp.owner || msg.sender == admin, "VERA: unauthorized to set signers");
        require(ngoAdmin != address(0) && campaignOwner != address(0) && auditor != address(0), "VERA: invalid signer address");

        camp.ngoAdmin = ngoAdmin;
        camp.campaignOwner = campaignOwner;
        camp.auditor = auditor;

        emit SignersConfigured(campaignId, ngoAdmin, campaignOwner, auditor);
    }

    /**
     * @notice Donate native testnet ETH or deposit funds towards an active earmarked campaign
     * @param campaignId Campaign identifier
     */
    function donate(bytes32 campaignId) external payable nonReentrant {
        Campaign storage camp = campaigns[campaignId];
        require(camp.id != bytes32(0), "VERA: campaign not found");
        require(camp.active, "VERA: campaign is not active");
        require(msg.value > 0, "VERA: donation must be greater than 0");

        camp.totalDonated += msg.value;
        donorContributions[campaignId][msg.sender] += msg.value;

        emit DonationReceived(campaignId, msg.sender, msg.value);
    }

    /**
     * @notice Register a milestone under an active campaign
     * @param campaignId Campaign identifier
     * @param milestoneId Unique milestone hash
     * @param amount Allocated budget
     */
    function createMilestone(
        bytes32 campaignId,
        bytes32 milestoneId,
        uint256 amount
    ) external {
        Campaign storage camp = campaigns[campaignId];
        require(camp.id != bytes32(0), "VERA: campaign not found");
        require(camp.active, "VERA: campaign is not active");
        require(amount > 0, "VERA: milestone amount must be > 0");
        require(milestones[campaignId][milestoneId].id == bytes32(0), "VERA: milestone already exists");

        // Financial Invariant: milestone allocations cannot exceed campaign target
        require(camp.totalAllocated + amount <= camp.targetAmount, "VERA: milestone amount exceeds campaign target");

        camp.totalAllocated += amount;

        milestones[campaignId][milestoneId] = Milestone({
            id: milestoneId,
            amount: amount,
            releasedAmount: 0,
            requestedReleaseAmount: 0,
            releaseRequested: false,
            released: false,
            failed: false
        });

        emit MilestoneCreated(campaignId, milestoneId, amount);
    }

    /**
     * @notice Request fund release for an approved milestone
     * @param campaignId Campaign identifier
     * @param milestoneId Milestone identifier
     * @param amount Requested amount (must be <= milestone allocation)
     */
    function requestRelease(
        bytes32 campaignId,
        bytes32 milestoneId,
        uint256 amount
    ) external {
        Campaign storage camp = campaigns[campaignId];
        require(camp.id != bytes32(0), "VERA: campaign not found");
        Milestone storage ms = milestones[campaignId][milestoneId];
        require(ms.id != bytes32(0), "VERA: milestone not found");
        require(!ms.released, "VERA: milestone already released");
        require(!ms.failed, "VERA: cannot release failed milestone");
        require(amount > 0 && amount <= ms.amount, "VERA: requested amount exceeds milestone allocation");

        // Only campaign owner or admin can initiate release request
        require(msg.sender == camp.owner || msg.sender == admin || msg.sender == camp.ngoAdmin, "VERA: unauthorized release requester");

        ms.releaseRequested = true;
        ms.requestedReleaseAmount = amount;

        // Reset any previous approvals if re-requesting
        approvalCounts[campaignId][milestoneId] = 0;
        releaseApprovals[campaignId][milestoneId][camp.ngoAdmin] = false;
        releaseApprovals[campaignId][milestoneId][camp.campaignOwner] = false;
        releaseApprovals[campaignId][milestoneId][camp.auditor] = false;

        emit ReleaseRequested(campaignId, milestoneId, amount);
    }

    /**
     * @notice Submit a signature approval towards the 2-of-3 multi-signature release requirement
     * @param campaignId Campaign identifier
     * @param milestoneId Milestone identifier
     */
    /**
     * @notice Submit a signature approval towards the 2-of-3 multi-signature release requirement
     * @param campaignId Campaign identifier
     * @param milestoneId Milestone identifier
     */
    function approveRelease(
        bytes32 campaignId,
        bytes32 milestoneId
    ) external {
        _approveRelease(campaignId, milestoneId, msg.sender);
    }

    /**
     * @notice Submit a signature approval on behalf of an authorized signer (server-side relayer)
     */
    function approveReleaseFor(
        bytes32 campaignId,
        bytes32 milestoneId,
        address approver
    ) external onlyAdmin {
        _approveRelease(campaignId, milestoneId, approver);
    }

    function _approveRelease(
        bytes32 campaignId,
        bytes32 milestoneId,
        address approver
    ) internal {
        Campaign storage camp = campaigns[campaignId];
        require(camp.id != bytes32(0), "VERA: campaign not found");
        Milestone storage ms = milestones[campaignId][milestoneId];
        require(ms.id != bytes32(0), "VERA: milestone not found");
        require(ms.releaseRequested, "VERA: release has not been requested for this milestone");
        require(!ms.released, "VERA: milestone already released");

        // Multisig Authorization Check: Must be one of the 3 designated signers (or platform admin)
        bool isSigner = (approver == camp.ngoAdmin || approver == camp.campaignOwner || approver == camp.auditor || approver == admin);
        require(isSigner, "VERA: caller is not an authorized 2-of-3 multisig signer");

        // Prevent duplicate approvals by the same signer
        require(!releaseApprovals[campaignId][milestoneId][approver], "VERA: signer has already approved this release");

        releaseApprovals[campaignId][milestoneId][approver] = true;
        approvalCounts[campaignId][milestoneId] += 1;

        uint256 currentApprovals = approvalCounts[campaignId][milestoneId];
        emit ReleaseApproved(campaignId, milestoneId, approver, currentApprovals);
    }

    /**
     * @notice Execute fund release once 2-of-3 multisig approvals are satisfied
     * @param campaignId Campaign identifier
     * @param milestoneId Milestone identifier
     * @param recipient Target beneficiary or vendor payout address
     */
    function releaseFunds(
        bytes32 campaignId,
        bytes32 milestoneId,
        address payable recipient
    ) external nonReentrant {
        Campaign storage camp = campaigns[campaignId];
        require(camp.id != bytes32(0), "VERA: campaign not found");
        Milestone storage ms = milestones[campaignId][milestoneId];
        require(ms.id != bytes32(0), "VERA: milestone not found");
        require(ms.releaseRequested, "VERA: release not requested");
        require(!ms.released, "VERA: milestone already released");
        require(recipient != address(0), "VERA: invalid recipient address");

        // Enforce 2-of-3 multi-signature threshold
        require(approvalCounts[campaignId][milestoneId] >= 2, "VERA: 2-of-3 multisig threshold not met");

        uint256 amountToRelease = ms.requestedReleaseAmount;
        require(amountToRelease > 0 && amountToRelease <= ms.amount, "VERA: invalid release amount");

        // Financial Invariant: total releases cannot exceed total donated balance
        uint256 availableBalance = camp.totalDonated - camp.totalReleased;
        require(amountToRelease <= availableBalance, "VERA: release amount exceeds available campaign funds");

        // Update state before external transfer (Checks-Effects-Interactions)
        ms.released = true;
        ms.releasedAmount = amountToRelease;
        camp.totalReleased += amountToRelease;

        // Transfer funds to recipient if contract holds native balance
        if (address(this).balance >= amountToRelease) {
            (bool success, ) = recipient.call{value: amountToRelease}("");
            require(success, "VERA: fund transfer failed");
        }

        emit FundsReleased(campaignId, milestoneId, recipient, amountToRelease);
    }

    /**
     * @notice Issue refund when a milestone fails or campaign is cancelled
     * @param campaignId Campaign identifier
     * @param recipient Donor or refund recipient
     * @param amount Refund sum
     * @param reason Detailed refund justification
     */
    function refund(
        bytes32 campaignId,
        address payable recipient,
        uint256 amount,
        string calldata reason
    ) external nonReentrant {
        Campaign storage camp = campaigns[campaignId];
        require(camp.id != bytes32(0), "VERA: campaign not found");
        require(amount > 0, "VERA: refund amount must be > 0");
        require(recipient != address(0), "VERA: invalid recipient address");

        // Caller must be campaign owner or admin
        require(msg.sender == camp.owner || msg.sender == admin, "VERA: unauthorized to issue refund");

        uint256 availableBalance = camp.totalDonated - camp.totalReleased;
        require(amount <= availableBalance, "VERA: refund exceeds available campaign balance");

        camp.totalReleased += amount;

        if (address(this).balance >= amount) {
            (bool success, ) = recipient.call{value: amount}("");
            require(success, "VERA: refund transfer failed");
        }

        emit RefundIssued(campaignId, recipient, amount, reason);
    }

    /**
     * @notice Mark a milestone as failed
     */
    function markMilestoneFailed(
        bytes32 campaignId,
        bytes32 milestoneId,
        string calldata reason
    ) external {
        Campaign storage camp = campaigns[campaignId];
        require(camp.id != bytes32(0), "VERA: campaign not found");
        Milestone storage ms = milestones[campaignId][milestoneId];
        require(ms.id != bytes32(0), "VERA: milestone not found");
        require(!ms.released, "VERA: cannot fail an already released milestone");
        require(msg.sender == camp.owner || msg.sender == admin || msg.sender == camp.auditor, "VERA: unauthorized");

        ms.failed = true;
        emit MilestoneFailed(campaignId, milestoneId, reason);
    }

    /**
     * @notice Query campaign financial status
     */
    function getCampaign(bytes32 campaignId) external view returns (
        address owner,
        uint256 targetAmount,
        uint256 totalDonated,
        uint256 totalReleased,
        uint256 totalAllocated,
        bool active
    ) {
        Campaign storage c = campaigns[campaignId];
        return (c.owner, c.targetAmount, c.totalDonated, c.totalReleased, c.totalAllocated, c.active);
    }

    /**
     * @notice Query milestone status
     */
    function getMilestone(bytes32 campaignId, bytes32 milestoneId) external view returns (
        Milestone memory milestone,
        uint256 currentApprovals
    ) {
        return (
            milestones[campaignId][milestoneId],
            approvalCounts[campaignId][milestoneId]
        );
    }

    // Allow contract to receive testnet ETH
    receive() external payable {}
}
