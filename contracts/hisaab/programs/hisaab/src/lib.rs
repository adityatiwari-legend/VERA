use anchor_lang::prelude::*;

declare_id!("AUH7tYQJFXjya5wgu9APf1Q5qDs8G9jKEEzxjA1VpxMw");

/// Citizens required before a report enters the public register.
const REQUIRED_CONFIRMATIONS: u8 = 3;

/// Report.status values: 0 OPEN, 1 CONFIRMED, 2 ESCALATED, 3 PAID
/// (PG keeps the richer lifecycle; the chain anchors the trust-critical states.)

#[program]
pub mod hisaab {
    use super::*;

    /// A citizen (via the VERA relayer) registers a pothole report.
    pub fn init_report(
        ctx: Context<InitReport>,
        seed: [u8; 16],
        lat_micro: i64,
        lng_micro: i64,
        severity: u8,
        media_hash: [u8; 32],
    ) -> Result<()> {
        let report = &mut ctx.accounts.report;
        report.reporter = ctx.accounts.reporter.key();
        report.seed = seed;
        report.lat_micro = lat_micro;
        report.lng_micro = lng_micro;
        report.severity = severity;
        report.media_hash = media_hash;
        report.confirmations = 0;
        report.status = 0;
        report.created_at = Clock::get()?.unix_timestamp;
        report.bump = ctx.bumps.report;
        Ok(())
    }

    /// A distinct citizen confirms the report. The confirmation PDA makes
    /// double-confirmation by the same wallet impossible on-chain.
    pub fn confirm_report(ctx: Context<ConfirmReport>, seed: [u8; 16]) -> Result<()> {
        let report = &mut ctx.accounts.report;
        require!(report.seed == seed, ErrorCode::SeedMismatch);
        report.confirmations = report
            .confirmations
            .checked_add(1)
            .ok_or(ErrorCode::Overflow)?;
        if report.confirmations >= REQUIRED_CONFIRMATIONS && report.status == 0 {
            report.status = 1; // CONFIRMED — enters the public street register
        }
        let confirmation = &mut ctx.accounts.confirmation;
        confirmation.confirmer = ctx.accounts.confirmer.key();
        confirmation.report = report.key();
        confirmation.created_at = Clock::get()?.unix_timestamp;
        confirmation.bump = ctx.bumps.confirmation;
        Ok(())
    }

    /// Funder locks the full milestone budget in the PDA vault up front.
    /// `hold_until` is the absolute unix timestamp before which hold-gated
    /// stages (2 and 3) cannot be released — enforced on-chain, not just in PG.
    pub fn init_escrow(
        ctx: Context<InitEscrow>,
        seed: [u8; 16],
        oracle: Pubkey,
        stage_amounts: [u64; 3],
        hold_until: i64,
    ) -> Result<()> {
        require!(ctx.accounts.report.seed == seed, ErrorCode::SeedMismatch);
        require!(
            stage_amounts[0] > 0 && stage_amounts[1] > 0 && stage_amounts[2] > 0,
            ErrorCode::InvalidStage
        );
        let now = Clock::get()?.unix_timestamp;
        require!(hold_until >= now, ErrorCode::InvalidStage);
        let escrow = &mut ctx.accounts.escrow;
        escrow.funder = ctx.accounts.funder.key();
        escrow.contractor = ctx.accounts.contractor.key();
        escrow.oracle = oracle;
        escrow.seed = seed;
        escrow.stage_amounts = stage_amounts;
        escrow.released_stage = 0;
        escrow.hold_until = hold_until;
        escrow.created_at = now;
        escrow.bump = ctx.bumps.escrow;
        escrow.vault_bump = ctx.bumps.vault;

        let total = stage_amounts[0]
            .checked_add(stage_amounts[1])
            .ok_or(ErrorCode::Overflow)?
            .checked_add(stage_amounts[2])
            .ok_or(ErrorCode::Overflow)?;
        let cpi_accounts = anchor_lang::system_program::Transfer {
            from: ctx.accounts.funder.to_account_info(),
            to: ctx.accounts.vault.to_account_info(),
        };
        anchor_lang::system_program::transfer(
            CpiContext::new(ctx.accounts.system_program.to_account_info(), cpi_accounts),
            total,
        )?;

        let report = &mut ctx.accounts.report;
        report.status = 2; // ESCALATED — repair budget committed
        Ok(())
    }

    /// Oracle-only: release the next milestone from the vault to the contractor.
    /// Stage 1 = repair verified (Gemini + citizens), stage 2 = mid-term,
    /// stage 3 = released only after the on-chain durability hold.
    pub fn release_stage(ctx: Context<ReleaseStage>, stage: u8) -> Result<()> {
        let escrow = &mut ctx.accounts.escrow;
        require!(ctx.accounts.oracle.key() == escrow.oracle, ErrorCode::UnauthorizedOracle);
        require!(stage >= 1 && stage <= 3, ErrorCode::InvalidStage);
        require!(stage == escrow.released_stage + 1, ErrorCode::InvalidStage);

        // On-chain durability hold: stages 2 and 3 wait for hold_until.
        if stage >= 2 {
            let now = Clock::get()?.unix_timestamp;
            require!(now >= escrow.hold_until, ErrorCode::HoldActive);
        }

        let amount = escrow.stage_amounts[(stage - 1) as usize];
        require!(amount > 0, ErrorCode::InvalidStage);

        let seed = escrow.seed;
        let vault_bump = escrow.vault_bump;
        let signer_seeds: [&[u8]; 3] = [b"vault", &seed[..], &[vault_bump]];
        let cpi_accounts = anchor_lang::system_program::Transfer {
            from: ctx.accounts.vault.to_account_info(),
            to: ctx.accounts.contractor.to_account_info(),
        };
        anchor_lang::system_program::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.system_program.to_account_info(),
                cpi_accounts,
                &[&signer_seeds],
            ),
            amount,
        )?;

        escrow.released_stage = stage;
        if stage == 3 {
            // Final stage released → the report is fully PAID on-chain.
            ctx.accounts.report.status = 3;
        }
        Ok(())
    }

    /// Funder or oracle pulls the remaining vault balance back (e.g. repair
    /// rejected or milestone failed).
    pub fn refund(ctx: Context<Refund>) -> Result<()> {
        let escrow = &ctx.accounts.escrow;
        let vault_balance = ctx.accounts.vault.lamports();
        require!(vault_balance > 0, ErrorCode::NothingToRefund);

        let seed = escrow.seed;
        let vault_bump = escrow.vault_bump;
        let signer_seeds: [&[u8]; 3] = [b"vault", &seed[..], &[vault_bump]];
        let cpi_accounts = anchor_lang::system_program::Transfer {
            from: ctx.accounts.vault.to_account_info(),
            to: ctx.accounts.funder.to_account_info(),
        };
        anchor_lang::system_program::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.system_program.to_account_info(),
                cpi_accounts,
                &[&signer_seeds],
            ),
            vault_balance,
        )?;
        Ok(())
    }
}

#[account]
pub struct Report {
    pub reporter: Pubkey,
    pub seed: [u8; 16],
    pub lat_micro: i64,
    pub lng_micro: i64,
    pub severity: u8,
    pub media_hash: [u8; 32],
    pub confirmations: u8,
    pub status: u8,
    pub created_at: i64,
    pub bump: u8,
}

#[account]
pub struct Confirmation {
    pub confirmer: Pubkey,
    pub report: Pubkey,
    pub created_at: i64,
    pub bump: u8,
}

#[account]
pub struct Escrow {
    pub funder: Pubkey,
    pub contractor: Pubkey,
    pub oracle: Pubkey,
    pub seed: [u8; 16],
    pub stage_amounts: [u64; 3],
    pub released_stage: u8,
    /// Absolute unix timestamp gating stages 2 and 3 (durability hold).
    pub hold_until: i64,
    pub created_at: i64,
    pub bump: u8,
    pub vault_bump: u8,
}

#[derive(Accounts)]
#[instruction(seed: [u8; 16])]
pub struct InitReport<'info> {
    #[account(
        init,
        payer = reporter,
        space = 8 + 32 + 16 + 8 + 8 + 1 + 32 + 1 + 1 + 8 + 1,
        seeds = [b"report", &seed[..]],
        bump
    )]
    pub report: Account<'info, Report>,
    #[account(mut)]
    pub reporter: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(seed: [u8; 16])]
pub struct ConfirmReport<'info> {
    #[account(mut, seeds = [b"report", &seed[..]], bump)]
    pub report: Account<'info, Report>,
    #[account(
        init,
        payer = confirmer,
        space = 8 + 32 + 32 + 8 + 1,
        seeds = [b"confirm", &seed[..], confirmer.key().as_ref()],
        bump
    )]
    pub confirmation: Account<'info, Confirmation>,
    #[account(mut)]
    pub confirmer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(seed: [u8; 16])]
pub struct InitEscrow<'info> {
    #[account(seeds = [b"report", &seed[..]], bump)]
    pub report: Account<'info, Report>,
    #[account(
        init,
        payer = funder,
        space = 8 + 32 * 3 + 16 + 8 * 3 + 8 + 8 + 1 + 1 + 1,
        seeds = [b"escrow", &seed[..]],
        bump
    )]
    pub escrow: Account<'info, Escrow>,
    /// CHECK: vault PDA funded via system transfer; holds the escrow lamports.
    #[account(mut, seeds = [b"vault", &seed[..]], bump)]
    pub vault: SystemAccount<'info>,
    #[account(mut)]
    pub funder: Signer<'info>,
    /// CHECK: repair contractor wallet; validated against PG off-chain.
    #[account(mut)]
    pub contractor: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ReleaseStage<'info> {
    #[account(mut, seeds = [b"report", &escrow.seed[..]], bump)]
    pub report: Account<'info, Report>,
    #[account(mut)]
    pub escrow: Account<'info, Escrow>,
    #[account(mut, seeds = [b"vault", &escrow.seed[..]], bump)]
    pub vault: SystemAccount<'info>,
    pub oracle: Signer<'info>,
    /// CHECK: must be the escrow contractor; enforced below.
    #[account(
        mut,
        address = escrow.contractor @ ErrorCode::UnauthorizedContractor
    )]
    pub contractor: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Refund<'info> {
    #[account(seeds = [b"report", &escrow.seed[..]], bump)]
    pub report: Account<'info, Report>,
    #[account(mut)]
    pub escrow: Account<'info, Escrow>,
    #[account(mut, seeds = [b"vault", &escrow.seed[..]], bump)]
    pub vault: SystemAccount<'info>,
    #[account(
        mut,
        constraint = authority.key() == escrow.funder || authority.key() == escrow.oracle
            @ ErrorCode::UnauthorizedOracle
    )]
    pub authority: Signer<'info>,
    /// CHECK: refund destination is always the original funder.
    #[account(mut, address = escrow.funder)]
    pub funder: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Seed does not match the report account")]
    SeedMismatch,
    #[msg("Caller is not the escrow oracle")]
    UnauthorizedOracle,
    #[msg("Caller is not the escrow contractor")]
    UnauthorizedContractor,
    #[msg("Invalid or out-of-order stage")]
    InvalidStage,
    #[msg("Durability hold is still active for this stage")]
    HoldActive,
    #[msg("Nothing left to refund")]
    NothingToRefund,
    #[msg("Arithmetic overflow")]
    Overflow,
}
