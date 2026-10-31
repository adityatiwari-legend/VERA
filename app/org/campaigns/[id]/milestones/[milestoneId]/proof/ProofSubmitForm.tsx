'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  UploadCloud,
  X,
  AlertCircle,
  Loader2,
  ShieldCheck,
  FileText,
  Image as ImageIcon,
} from 'lucide-react';
import { formatRupees } from '@/lib/utils';

interface ProofSubmitFormProps {
  campaignId: string;
  milestoneId: string;
  milestoneAmount: number;
}

export const ProofSubmitForm: React.FC<ProofSubmitFormProps> = ({
  campaignId,
  milestoneId,
  milestoneAmount,
}) => {
  const router = useRouter();

  const [claimedAmount, setClaimedAmount] = useState<string>(milestoneAmount.toString());
  const [description, setDescription] = useState<string>('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const formatFileSize = (bytes: number) => {
    if (bytes >= 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    }
    return `${Math.round(bytes / 1024)} KB`;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(Array.from(e.target.files));
      e.target.value = '';
    }
  };

  const processFiles = (newFiles: File[]) => {
    setError(null);
    const validExtensions = ['pdf', 'jpg', 'jpeg', 'png', 'webp'];
    const validFiles: File[] = [];

    for (const file of newFiles) {
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      if (!validExtensions.includes(ext)) {
        setError(`File "${file.name}" has unsupported format. Accepted: PDF, JPG, PNG, WEBP.`);
        continue;
      }
      if (file.size > 10 * 1024 * 1024) {
        setError(`File "${file.name}" exceeds the 10MB limit.`);
        continue;
      }
      validFiles.push(file);
    }

    setSelectedFiles((prev) => [...prev, ...validFiles]);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      processFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsedClaimed = parseFloat(claimedAmount);
    if (isNaN(parsedClaimed) || parsedClaimed <= 0) {
      setError('Please enter a valid positive claimed amount.');
      return;
    }

    if (parsedClaimed > milestoneAmount) {
      setError(
        `Claimed amount (${formatRupees(parsedClaimed)}) cannot exceed milestone allocation (${formatRupees(milestoneAmount)}).`
      );
      return;
    }

    if (!description || description.trim().length < 5) {
      setError('Description must be at least 5 characters detailing the completed work.');
      return;
    }

    if (selectedFiles.length === 0) {
      setError('Please upload at least one evidence document (invoice, receipt, or site photo).');
      return;
    }

    setIsSubmitting(true);
    setStatusMessage('Securing files and generating SHA-256 digests...');

    try {
      const formData = new FormData();
      formData.append('claimed_amount', parsedClaimed.toString());
      formData.append('description', description.trim());

      for (const file of selectedFiles) {
        formData.append('files', file);
      }

      setStatusMessage('Extracting line items and executing discrepancy screening...');

      const res = await fetch(`/api/milestones/${milestoneId}/proofs`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit proof evidence.');
      }

      setStatusMessage('Evidence processed! Redirecting to verification results...');
      router.push(`/ngo/proofs/${data.proof.id}`);
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred during proof submission.');
      setIsSubmitting(false);
      setStatusMessage(null);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card space-y-6 p-6 sm:p-8">
      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-bad/20 bg-bad-soft p-3.5 text-xs text-bad">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-bad" />
          <div className="leading-relaxed">{error}</div>
        </div>
      )}

      {/* Claimed Amount */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="label-text">
            Claimed Utilisation Amount (₹) <span className="text-accent">*</span>
          </label>
          <button
            type="button"
            onClick={() => setClaimedAmount(milestoneAmount.toString())}
            className="text-[11px] font-medium text-accent hover:underline"
          >
            Claim Full Allocation ({formatRupees(milestoneAmount)})
          </button>
        </div>
        <input
          type="number"
          step="0.01"
          min="1"
          max={milestoneAmount}
          value={claimedAmount}
          onChange={(e) => setClaimedAmount(e.target.value)}
          placeholder={`Max ${milestoneAmount}`}
          required
          disabled={isSubmitting}
          className="input font-semibold"
        />
        <p className="text-[11px] text-faint">
          Cannot exceed milestone budget of {formatRupees(milestoneAmount)}.
        </p>
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <label className="label-text">
          Execution Description & Justification <span className="text-accent">*</span>
        </label>
        <textarea
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe completed work (e.g. Electrical wiring, fixture installation, and classroom switchboard wiring completed as per schedule.)"
          required
          disabled={isSubmitting}
          className="input"
        />
      </div>

      {/* Drag & Drop Upload Zone */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="label-text">
            Upload Evidence Documents <span className="text-accent">*</span>
          </label>
          <span className="text-[10px] text-faint">
            Accepted: PDF, JPG, JPEG, PNG, WEBP (Max 10MB)
          </span>
        </div>

        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed p-8 transition-colors ${
            isDragging
              ? 'border-accent bg-accent-faint'
              : 'border-line bg-mist hover:border-accent/40'
          }`}
        >
          <input
            type="file"
            multiple
            accept=".pdf,.jpg,.jpeg,.png,.webp"
            onChange={handleFileChange}
            disabled={isSubmitting}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />

          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-line bg-white text-accent">
            <UploadCloud className="h-5 w-5" />
          </div>

          <div className="space-y-1 text-center">
            <p className="text-xs font-semibold text-ink">
              Drag & Drop invoices or site photographs here
            </p>
            <p className="text-[11px] text-faint">
              or click to browse files from your computer
            </p>
          </div>
        </div>
      </div>

      {/* Selected Files List with SHA-256 Hash Generation indicator */}
      {selectedFiles.length > 0 && (
        <div className="space-y-2">
          <span className="label-text !text-[11px]">
            Attached Documents ({selectedFiles.length})
          </span>
          <div className="divide-y divide-line overflow-hidden rounded-lg border border-line">
            {selectedFiles.map((file, idx) => {
              const isPdf = file.name.endsWith('.pdf');
              return (
                <div
                  key={idx}
                  className="flex items-center justify-between gap-3 bg-white p-3 text-xs"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    {isPdf ? (
                      <FileText className="h-4 w-4 shrink-0 text-accent-deep" />
                    ) : (
                      <ImageIcon className="h-4 w-4 shrink-0 text-accent" />
                    )}
                    <div className="min-w-0">
                      <p className="max-w-xs truncate font-semibold text-ink sm:max-w-md">
                        {file.name}
                      </p>
                      <p className="text-[10px] text-faint">
                        {formatFileSize(file.size)} • SHA-256 auto-calculated
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveFile(idx)}
                    disabled={isSubmitting}
                    className="shrink-0 rounded p-1 text-faint transition-colors hover:bg-bad-soft hover:text-bad"
                    title="Remove file"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Status Message */}
      {statusMessage && (
        <div className="flex items-center gap-2 rounded-lg border border-accent/20 bg-accent-faint p-3.5 font-mono text-xs text-accent-deep">
          <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Submit Button */}
      <div className="pt-2">
        <button
          type="submit"
          disabled={isSubmitting || selectedFiles.length === 0}
          className="btn-primary w-full !py-3 !font-mono !text-xs"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>SUBMITTING FOR AUDIT...</span>
            </>
          ) : (
            <>
              <ShieldCheck className="h-4 w-4" />
              <span>SUBMIT FOR AUDIT</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
};

export default ProofSubmitForm;
