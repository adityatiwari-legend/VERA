"use client";

import React, { useState } from "react";
import {
  ShieldCheck,
  Coins,
  Lock,
  ScanLine,
  Eye,
  Sparkles,
  ArrowRight,
} from "lucide-react";

import { Surface } from "@/components/ui/Surface";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Tabs } from "@/components/ui/Tabs";
import { Tooltip } from "@/components/ui/Tooltip";

import { StatCard } from "@/components/financial/StatCard";
import { FundDistributionBar } from "@/components/financial/FundDistributionBar";
import { TrustScoreGauge } from "@/components/financial/TrustScoreGauge";
import { HashDisplay } from "@/components/financial/HashDisplay";
import { ProgressBar } from "@/components/financial/ProgressBar";

import { CampaignCard } from "@/components/domain/CampaignCard";
import { CampaignHero } from "@/components/domain/CampaignHero";
import { EscrowMilestoneTracker, type EscrowMilestone } from "@/components/domain/EscrowMilestoneTracker";
import { MultisigApprovalWidget, type Signer } from "@/components/domain/MultisigApprovalWidget";
import { ProofEvidenceInspectorModal } from "@/components/domain/ProofEvidenceInspectorModal";
import { BlockchainBadge } from "@/components/domain/BlockchainBadge";
import { AuditTimeline, type AuditEvent } from "@/components/domain/AuditTimeline";
import { DonationJourneyTrace, type JourneyStage } from "@/components/domain/DonationJourneyTrace";
import { NgoReputationCard } from "@/components/domain/NgoReputationCard";

/**
 * VeraSystem — a showcase section demonstrating every VERA foundational &
 * domain component defined in component.md. Inserted after the hero on the
 * landing page. Does NOT touch the hero section.
 */

const MILESTONES: EscrowMilestone[] = [
  { id: 1, title: "Site Survey & Deep Borewell Excavation", budget: 850000, status: "RELEASED", signers: 3, requiredSigners: 3, txHash: "0x4a9b2c8e1f027a3b5c9d1e6f4a2b8c0d" },
  { id: 2, title: "RCC Foundation & Filtration Shed", budget: 1450000, status: "RELEASED", signers: 3, requiredSigners: 3, txHash: "0xe3b0c44298fc1c149afbf4c8996fb92427ae41e" },
  { id: 3, title: "Commercial RO Units & UV Rig", budget: 2200000, status: "UNDER_REVIEW", signers: 2, requiredSigners: 3, txHash: "0x78a155c9d2e4f0b1a3c5d7e9f1b2a4c6" },
  { id: 4, title: "Smart Water Dispensing ATM Kiosks (x4)", budget: 950000, status: "LOCKED", signers: 0, requiredSigners: 3 },
];

const SIGNERS: Signer[] = [
  { role: "NGO Lead", name: "A. Mehta", address: "0x892a3f4c5d6e7f8090a1b2c3d4e5f6071829", signed: true },
  { role: "Project Admin", name: "R. Krishnan", address: "0x11ab2c3d4e5f60718293a4b5c6d7e8f90112", signed: true },
  { role: "Certified Auditor", name: "S. Iyer", address: "0x44dd5e6f70819203a4b5c6d7e8f901122334", signed: false, eligible: true },
];

const AUDIT_EVENTS: AuditEvent[] = [
  { id: "EV-01", type: "Donation", title: "Anonymous donation received", timestamp: "2026-09-11 09:42 UTC", amount: 250000, txHash: "0x7f9a2b8e3c4d5e6f1a0b9c8d7e6f5a4b3c2d1e0f" },
  { id: "EV-02", type: "Lock", title: "Funds locked in milestone escrow", timestamp: "2026-09-11 09:38 UTC", amount: 850000, txHash: "0x4b3c2d1e0f7f9a2b8e3c4d5e6f1a0b9c8d7e6f5a" },
  { id: "EV-03", type: "Proof", title: "Site evidence submitted (SHA-256)", timestamp: "2026-09-11 09:30 UTC" },
  { id: "EV-04", type: "Approval", title: "2-of-3 multisig quorum reached", timestamp: "2026-09-11 09:25 UTC" },
  { id: "EV-05", type: "Release", title: "Tranche released to contractor", timestamp: "2026-09-11 09:20 UTC", amount: 850000, txHash: "0x9c8d7e6f5a4b3c2d1e0f7f9a2b8e3c4d5e6f1a0b" },
];

const JOURNEY: JourneyStage[] = [
  { key: "donate", title: "Donation", description: "Funds pledged to campaign", amount: 50000 },
  { key: "lock", title: "Escrow Lock", description: "Capital locked in smart contract", amount: 50000, txHash: "0x4b3c2d1e0f7f9a2b8e3c4d5e6f1a0b9c8d7e6f5a" },
  { key: "allocate", title: "Milestone Allocation", description: "Routed to Tranche 3: RO Units", amount: 50000 },
  { key: "proof", title: "Proof & AI Check", description: "OCR + discrepancy screen", evidenceHash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855" },
  { key: "signoff", title: "Multisig Signoff", description: "2-of-3 auditor quorum", txHash: "0x6f5a4b3c2d1e0f7f9a2b8e3c4d5e6f1a0b9c8d7e" },
  { key: "release", title: "On-Chain Release", description: "Released to Apex Waterworks Ltd", amount: 50000, txHash: "0x1a0b9c8d7e6f5a4b3c2d1e0f7f9a2b8e3c4d5e6f" },
];

const EVIDENCE = {
  title: "Tranche 3 — RO Unit Procurement Invoice.pdf",
  sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  txHash: "0x7f9a2b8e3c4d5e6f1a0b9c8d7e6f5a4b3c2d1e0f",
  network: "Sepolia" as const,
  claimedAmount: 50000,
  invoiceAmount: 50000,
  ocrConfidence: 98,
  lineItems: [
    { vendor: "Apex Waterworks Ltd", date: "2026-09-08", invoiceNo: "INV-4471", amount: 32000 },
    { vendor: "Filtration Membrane Co", date: "2026-09-09", invoiceNo: "INV-4472", amount: 18000 },
  ],
  auditorNotes: "Line items reconcile with milestone scope. Geo-tag matches site coordinates. No discrepancy detected.",
  verifiedAt: "2026-09-11 09:42:15 UTC",
};

export default function VeraSystem() {
  const [tab, setTab] = useState("Campaigns");
  const [evidenceOpen, setEvidenceOpen] = useState(false);

  return (
    <section id="vera-system" className="py-20 bg-[#0B0F19] border-b border-white/[0.08] relative">
      {/* ambient mesh */}
      <div className="absolute inset-0 vera-ambient-mesh pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Section header */}
        <div className="space-y-3 pb-6 border-b border-white/[0.08]">
          <div className="flex items-center gap-2 font-mono text-xs text-brand-emerald-500">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-emerald-500 animate-pulse" />
            <span>VERA // COMPONENT ARCHITECTURE v1.0</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-normal tracking-[-0.03em] text-white">
            One foundation.{" "}
            <span className="text-zinc-500">Every claim, anchored.</span>
          </h2>
          <p className="text-sm text-zinc-400 max-w-2xl">
            Built on the all-important <code className="font-mono text-brand-emerald-500">&lt;Surface&gt;</code> linchpin.
            Cards, trackers, gauges, and proofs — all inherit consistent glassmorphism, elevation, and cryptographic trust.
          </p>
        </div>

        {/* Layer 1 + 2: StatCard ribbon */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Secured Capital" value="₹48.2 Cr" subtext="100% escrowed" icon={<Lock className="w-5 h-5" />} accentColor="emerald" variant="dark" trend={{ value: "+12.4% MoM", positive: true }} />
          <StatCard label="Released" value="₹31.6 Cr" subtext="3,812 tranches" icon={<Coins className="w-5 h-5" />} accentColor="cyan" variant="dark" trend={{ value: "+8.1% WoW", positive: true }} />
          <StatCard label="Escrow Locked" value="₹16.6 Cr" subtext="Awaiting proof" icon={<ShieldCheck className="w-5 h-5" />} accentColor="amber" variant="dark" />
          <StatCard label="Misallocation" value="0.00%" subtext="Zero drift" icon={<ScanLine className="w-5 h-5" />} accentColor="indigo" variant="dark" trend={{ value: "Stable", positive: true }} />
        </div>

        {/* Domain showcase grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Left column: CampaignHero + FundDistributionBar */}
          <div className="xl:col-span-2 space-y-6">
            <CampaignHero
              title="Narmada Clean Water Initiative"
              ngo="Apex Waterworks Foundation"
              category="Clean Energy"
              raised={5450000}
              target={7000000}
              escrowLocked={3150000}
              released={2300000}
              contractAddress="0x7f9a2b8e3c4d5e6f1a0b9c8d7e6f5a4b3c2d1e0f"
              txHash="0x7f9a2b8e3c4d5e6f1a0b9c8d7e6f5a4b3c2d1e0f"
            />

            <Surface variant="default" padding="lg" rounded="2xl" className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-base font-semibold text-white tracking-tight">Fund Distribution</h3>
                <Badge variant="emerald" size="xs" dot label="Audited" />
              </div>
              <FundDistributionBar total={7000000} released={2300000} locked={3150000} height="lg" />
            </Surface>

            <EscrowMilestoneTracker milestones={MILESTONES} />
          </div>

          {/* Right column: Multisig + Reputation + Blockchain */}
          <div className="space-y-6">
            <MultisigApprovalWidget signers={SIGNERS} required={2} onSign={() => {}} />

            <NgoReputationCard
              name="Apex Waterworks Foundation"
              trustScore={94}
              grade="A+"
              completedCampaigns={27}
              verifiedInvoices={412}
              tamperScore={0}
            />

            <Surface variant="default" padding="lg" rounded="2xl" className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-white tracking-tight">On-Chain Proof</h3>
                <Badge variant="cyan" size="xs" dot pulse label="Live" />
              </div>
              <BlockchainBadge network="Sepolia" txHash="0x7f9a2b8e3c4d5e6f1a0b9c8d7e6f5a4b3c2d1e0f" blockConfirmations={1284} confirmed />
              <div className="pt-2 border-t border-white/[0.06]">
                <HashDisplay hash="0x7f9a2b8e3c4d5e6f1a0b9c8d7e6f5a4b3c2d1e0f" type="address" label="Contract" explorerUrl="https://sepolia.etherscan.io" />
              </div>
            </Surface>
          </div>
        </div>

        {/* Donation journey trace */}
        <DonationJourneyTrace
          donationAmount={50000}
          campaign="Narmada Clean Water Initiative"
          stages={JOURNEY}
          currentStageIndex={4}
        />

        {/* Audit timeline + evidence inspector trigger */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <AuditTimeline events={AUDIT_EVENTS} />
          <Surface variant="default" padding="lg" rounded="2xl" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-white tracking-tight">Evidence Inspector</h3>
              <Badge variant="indigo" size="xs" label="OCR 98%" />
            </div>
            <p className="text-sm text-zinc-400">
              Inspect receipts, SHA-256 anchors, and AI discrepancy screening. Click to open the proof modal.
            </p>
            <ProgressBar value={100} accent="emerald" size="sm" showLabel label="Math Validation" />
            <div className="flex items-center justify-between gap-3 pt-2 border-t border-white/[0.06]">
              <HashDisplay hash={EVIDENCE.sha256} type="sha256" label="SHA-256" />
              <Button variant="primary" size="sm" leftIcon={<Eye className="w-4 h-4" />} onClick={() => setEvidenceOpen(true)}>
                Inspect Evidence
              </Button>
            </div>
          </Surface>
        </div>

        {/* Campaign explorer (Tabs + CampaignCard grid) */}
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="space-y-1">
              <h3 className="text-xl font-semibold text-white tracking-tight">Featured Initiatives</h3>
              <p className="font-mono text-[11px] text-zinc-500 uppercase tracking-wider">
                Composed entirely with &lt;CampaignCard&gt; on &lt;Surface&gt;
              </p>
            </div>
            <Tabs
              items={[
                { key: "Campaigns", label: "All", count: 6 },
                { key: "Active", label: "Active", count: 4 },
                { key: "Completed", label: "Completed", count: 2 },
              ]}
              activeKey={tab}
              onChange={setTab}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <CampaignCard title="Narmada Clean Water Initiative" ngo="Apex Waterworks Foundation" category="Clean Energy" raised={5450000} target={7000000} milestonesReleased={2} milestonesTotal={4} status="Active" trustScore={94} trustGrade="A+" />
            <CampaignCard title="Odisha Cyclone Resilient Shelter #14" ngo="Kalinga Infra Trust" category="Disaster Relief" raised={4200000} target={5000000} milestonesReleased={1} milestonesTotal={3} status="Active" trustScore={88} trustGrade="A" />
            <CampaignCard title="Ladakh Solar Microgrid Phase 1" ngo="Himalayan Solar Corp" category="Infrastructure" raised={9000000} target={9000000} milestonesReleased={4} milestonesTotal={4} status="Completed" trustScore={96} trustGrade="A+" />
          </div>
        </div>

        {/* Layer 1 primitives row */}
        <div className="space-y-5">
          <div className="space-y-1">
            <h3 className="text-xl font-semibold text-white tracking-tight">Core Primitives</h3>
            <p className="font-mono text-[11px] text-zinc-500 uppercase tracking-wider">
              Surface · Badge · Button · Tabs · Tooltip · ProgressBar · TrustScoreGauge
            </p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Badge variants */}
            <Surface variant="default" padding="lg" rounded="2xl" className="space-y-4">
              <h4 className="text-sm font-semibold text-white">Badge / StatusPill</h4>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="emerald" size="sm" dot pulse label="Released" />
                <Badge variant="amber" size="sm" dot label="Escrow Locked" />
                <Badge variant="cyan" size="sm" dot label="On-Chain" />
                <Badge variant="indigo" size="sm" label="OCR Verified" />
                <Badge variant="rose" size="sm" label="Tamper Alert" />
                <Badge variant="slate" size="sm" label="Archived" />
              </div>
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/[0.06]">
                <Button variant="primary" size="sm">Primary</Button>
                <Button variant="glow" size="sm" leftIcon={<Sparkles className="w-3.5 h-3.5" />}>Glow</Button>
                <Button variant="secondary" size="sm">Secondary</Button>
                <Button variant="outline" size="sm">Outline</Button>
                <Button variant="ghost" size="sm">Ghost</Button>
                <Button variant="danger" size="sm">Danger</Button>
                <Button variant="subtle" size="sm">Subtle</Button>
              </div>
            </Surface>

            {/* Gauge + tooltip */}
            <Surface variant="default" padding="lg" rounded="2xl" className="space-y-4">
              <h4 className="text-sm font-semibold text-white">TrustScoreGauge & Tooltip</h4>
              <div className="flex items-center justify-between gap-4">
                <TrustScoreGauge score={94} grade="A+" size="md" />
                <div className="flex flex-col gap-2">
                  <Tooltip content="2-of-3 multisig consensus required for release">
                    <span className="font-mono text-xs text-zinc-400 hover:text-white cursor-help border-b border-dashed border-white/[0.2]">
                      Multisig Consensus
                    </span>
                  </Tooltip>
                  <Tooltip content="SHA-256 anchored, on-chain verifiable evidence">
                    <span className="font-mono text-xs text-zinc-400 hover:text-white cursor-help border-b border-dashed border-white/[0.2]">
                      Cryptographic Proof
                    </span>
                  </Tooltip>
                  <Tooltip content="Optical character recognition with discrepancy screening">
                    <span className="font-mono text-xs text-zinc-400 hover:text-white cursor-help border-b border-dashed border-white/[0.2]">
                      OCR Confidence
                    </span>
                  </Tooltip>
                </div>
              </div>
            </Surface>
          </div>
        </div>

        {/* Footer CTA */}
        <Surface variant="glass-dark" padding="xl" rounded="2xl" className="vera-ambient-mesh relative overflow-hidden">
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-xl">
              <div className="flex items-center gap-2 font-mono text-xs text-brand-emerald-500">
                <ShieldCheck className="w-4 h-4" />
                <span>EVERY CLAIM, CRYPTographically ANCHORED</span>
              </div>
              <h3 className="text-2xl font-semibold text-white tracking-tight">
                The all-important <span className="text-brand-emerald-500">&lt;Surface&gt;</span> beneath it all.
              </h3>
              <p className="text-sm text-zinc-400">
                Every card, tracker, gauge, and proof inherits the same glassmorphism, elevation, and trust signaling.
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <Button variant="glow" size="md" rightIcon={<ArrowRight className="w-4 h-4" />}>
                Explore Audit Ledgers
              </Button>
            </div>
          </div>
        </Surface>
      </div>

      {/* Evidence inspector modal */}
      <ProofEvidenceInspectorModal
        isOpen={evidenceOpen}
        onClose={() => setEvidenceOpen(false)}
        evidence={EVIDENCE}
      />
    </section>
  );
}
