# VERA — Patent Claims (Draft)

Recentered on the implemented system: evidence-bound financial provenance, rule-based verification, milestone-gated fund release, multi-participant approval, tamper-evident recording with blockchain mirroring. Physical-goods claims removed (not implemented); optional re-entry claims are at the bottom.

---

## CLAIMS

**Claim 1** (Independent — System)

A computer-implemented system for evidence-bound verification and controlled disbursement of donated funds, comprising:

a financial transaction component configured to maintain records of donations received, escrow locks placed on received funds, allocations of locked funds to designated milestones, expenditure records, refund transactions, and fund-release transactions, wherein each maintained record carries a transaction identifier and a transaction type;

an evidence management component configured to associate digital evidence with at least one of the maintained records, to generate a cryptographic digest of the digital evidence upon receipt of the digital evidence, and to store the cryptographic digest as an integrity reference for the digital evidence;

a verification component configured to apply predefined verification rules to the digital evidence and to transaction attributes of the maintained record with which the digital evidence is associated, to generate a verification outcome for the digital evidence, and to generate a discrepancy record identifying an inconsistency when the predefined verification rules are not satisfied;

a provenance component configured to maintain traceable relationships linking an originating donation to one or more subsequent transactions selected from the escrow locks, the allocations, the expenditure records, the refund transactions, and the fund-release transactions, and to the digital evidence and the verification outcomes associated with the subsequent transactions;

a conditional authorization component configured to receive a fund-release request associated with one of the designated milestones and with at least one item of digital evidence, to determine whether the designated milestone satisfies a milestone completion condition, to determine whether the verification outcome of each associated item of digital evidence satisfies an evidence verification condition, to determine whether approvals received from a plurality of designated participants satisfy a predefined approval threshold, and to permit execution of the fund-release request only when the milestone completion condition, the evidence verification condition, and the predefined approval threshold are each satisfied; and

a tamper-evident recording component configured to record the donations received, the escrow locks, the allocations, the verification outcomes, the approvals, and the executed fund-release transactions in an append-only record that enables detection of unauthorized modification of the recorded content;

wherein execution of a fund-release request for which any one of the milestone completion condition, the evidence verification condition, or the predefined approval threshold is not satisfied is withheld until each of the milestone completion condition, the evidence verification condition, and the predefined approval threshold is satisfied.

**Claim 2** (depends on Claim 1)

The system of claim 1, wherein the evidence management component is further configured to generate a comparison digest of stored digital evidence and to indicate that the stored digital evidence has been modified when the comparison digest differs from the integrity reference stored for that digital evidence.

**Claim 3** (depends on Claim 1)

The system of claim 1, wherein the evidence management component is further configured to identify digital evidence as a duplicate when the cryptographic digest generated upon receipt of the digital evidence matches an integrity reference previously stored for different digital evidence.

**Claim 4** (depends on Claim 1)

The system of claim 1, wherein the verification component generates the discrepancy record when a monetary amount stated in or extracted from the digital evidence differs from a monetary amount associated with the fund-release request with which the digital evidence is associated.

**Claim 5** (depends on Claim 1)

The system of claim 1, wherein the provenance component maintains, for each originating donation, a traceable chain of records comprising: the escrow lock placed on the donation, each allocation of the locked funds, each fund-release request associated with the allocations, and the integrity references and verification outcomes associated with the fund-release requests.

**Claim 6** (depends on Claim 5)

The system of claim 5, wherein the provenance component further links a refund transaction to the originating donation and to at least one of the allocations from which refunded funds were drawn.

**Claim 7** (depends on Claim 1)

The system of claim 1, wherein the conditional authorization component is further configured to withhold execution of a fund-release request associated with an unresolved discrepancy record until the discrepancy record is resolved or an authorized override approval is recorded.

**Claim 8** (depends on Claim 1)

The system of claim 1, wherein the conditional authorization component records each approval with an identifier of the participant providing the approval, disregards a further approval received from a participant who has already approved the fund-release request, and determines the predefined approval threshold to be satisfied only when a number of distinct participants who have approved the fund-release request is at least equal to the predefined approval threshold.

**Claim 9** (depends on Claim 1)

The system of claim 1, wherein the tamper-evident recording component records at least a portion of the fund-release requests, the approvals, and the executed fund-release transactions on a blockchain network, and wherein the conditional authorization component executes a fund-release request by invoking a smart contract deployed on the blockchain network, the smart contract recording the fund-release request, recording the approvals, and releasing the locked funds in response to a number of recorded approvals satisfying a contract-defined approval threshold.

**Claim 10** (depends on Claim 9)

The system of claim 9, wherein the system is further configured to detect tampering by comparing a state of the maintained records with a corresponding state of the blockchain network and to generate an integrity alert when the comparison indicates a mismatch between the maintained records and the blockchain network.

**Claim 11** (depends on Claim 1)

The system of claim 1, further comprising an audit reporting component configured to generate for display an audit ledger that presents, for at least one originating donation: the traceable relationships maintained by the provenance component, the integrity references of digital evidence associated with the traceable relationships, the verification outcomes, any discrepancy records, and the approvals and executed fund-release transactions associated therewith.

**Claim 12** (depends on Claim 1)

The system of claim 1, wherein the append-only record comprises a hash chain in which each entry of the append-only record includes a digest of a preceding entry of the append-only record.

**Claim 13** (Independent — Method)

A computer-implemented method for evidence-controlled disbursement of donated funds, comprising:

receiving, by one or more processors, a donation transaction and recording an escrow lock on the donated funds;

recording an allocation of the locked funds to a designated milestone;

receiving a fund-release request for the designated milestone, the fund-release request being associated with digital evidence;

generating a cryptographic digest of the digital evidence and storing the cryptographic digest as an integrity reference for the digital evidence;

applying predefined verification rules to the digital evidence and to transaction attributes of the fund-release request to generate a verification outcome, including generating a discrepancy record identifying an inconsistency when the predefined verification rules are not satisfied;

recording approvals of the fund-release request from a plurality of distinct participants;

executing the fund-release request by releasing the locked funds only when a milestone completion condition for the designated milestone, an evidence verification condition on the verification outcome, and a predefined approval threshold on the recorded approvals are each satisfied; and

recording the donation transaction, the escrow lock, the allocation, the fund-release request, the integrity reference, the verification outcome, the approvals, and the executed release in an append-only record that enables detection of unauthorized modification, wherein the recorded content constitutes a traceable provenance chain linking the donation transaction to the executed release through the allocated milestone, the digital evidence, and the verification outcome.

**Claim 14** (depends on Claim 13)

The method of claim 13, further comprising generating a comparison digest of the stored digital evidence and indicating that the stored digital evidence has been modified when the comparison digest differs from the stored integrity reference.

**Claim 15** (depends on Claim 13)

The method of claim 13, wherein executing the fund-release request comprises invoking a smart contract on a blockchain network, the smart contract recording the fund-release request and the approvals and releasing the locked funds when a number of recorded approvals satisfies a contract-defined approval threshold.

**Claim 16** (depends on Claim 13)

The method of claim 13, further comprising generating for display an audit view that presents, for the donation transaction, the traceable provenance chain including the integrity reference, the verification outcome, any discrepancy record, and the approvals.

**Claim 17** (Independent — Computer-Readable Medium)

A non-transitory computer-readable medium storing instructions that, when executed by one or more processors, cause the one or more processors to perform the method of claim 13.

---

## Withheld claims — not implemented (goods tracking)

The following goods-tracking claims are withheld and may be re-inserted only if consignment tracking is built; Claim 17 remains the last issued claim.

**G1.** The system of claim 1, further comprising a goods tracking component configured to maintain records of consignments of physical goods procured using funds from the allocations, the records comprising relationships between an originating consignment and one or more resulting consignments produced by division of the originating consignment, or between a plurality of originating consignments and a combined consignment produced by consolidation of the plurality of originating consignments.

**G2.** The system of claim G1, wherein the verification component compares a quantity recorded for the originating consignment with quantities recorded for the one or more resulting consignments or the combined consignment, and generates a discrepancy record when the compared quantities are inconsistent with a predefined quantity reconciliation rule.

**G3.** The method of claim 13, further comprising recording procurement, shipment, and delivery events for consignments of physical goods procured using the allocated funds and reconciling quantities of the consignments across the recorded events.

---

## Drafting notes

1. **What changed vs. the previous draft:** physical-goods recitations removed from the independent claims (unimplemented); "verification outcome" used consistently (no more verification/reconciliation outcome mixing); every "the/said" reference now has an antecedent; "where applicable" deleted; the vague "applicable mandatory verification and authorization conditions" replaced by the three defined conditions (milestone, evidence verification, approval threshold); multi-participant approval (2-of-3) and duplicate-approver prevention elevated into claims 8–9, matching `lib/release_requests.ts` and `contracts/VERA.sol`.

2. **Code coverage status:** Claims 1–17 are fully code-backed. For Claim 7, the phrase “authorized override approval” maps exactly to the auditor approval recorded by `approveProof` with action `PROOF_APPROVED_OVERRIDE`, metadata `override: true`, and the flagged or failed status in `overridden_ai_status`. The specification should use exactly that mapping when describing Claim 7.

3. **Domain wording:** claims use "donated funds / donations / milestones" because that is what VERA is. If broader coverage is wanted, claim 1's preamble can say "financial transactions" with donations as an embodiment in the spec — but narrower claims that match the implementation are easier to defend.

4. **Novel core to emphasize in the specification:** the combination of evidence digests + rule-based discrepancy records + provenance chains + a hard gate on fund release requiring milestone completion, evidence verification, AND a multi-party approval threshold, with on-chain mirroring for tamper evidence. Claims 2, 3, 12, 13 (hashing, dedup, blockchain) are commodity techniques — treat them as fallback positions, not the headline invention.
