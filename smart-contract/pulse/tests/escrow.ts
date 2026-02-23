import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Pulse } from "../target/types/pulse";
import { PublicKey, Keypair, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { expect } from "chai";

describe("Escrow System", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Pulse as Program<Pulse>;

  // Test accounts
  let organizer: Keypair;
  let agentOwner: Keypair;
  let agentPDA: PublicKey;
  let escrowPDA: PublicKey;
  let eventPDA: PublicKey;
  let tierPDA: PublicKey;
  let userPDA: PublicKey;

  // Test constants
  const AGENT_ID = "test-agent-001";
  const AGENT_NAME = "Test Agent";
  const MAX_BUDGET_PER_TICKET = new anchor.BN(2 * LAMPORTS_PER_SOL);
  const TOTAL_BUDGET = new anchor.BN(10 * LAMPORTS_PER_SOL);
  const TIER_PRICE = new anchor.BN(1 * LAMPORTS_PER_SOL);

  before(async () => {
    organizer = Keypair.generate();
    agentOwner = Keypair.generate();

    // Fund accounts
    await Promise.all([
      provider.connection.confirmTransaction(
        await provider.connection.requestAirdrop(organizer.publicKey, 100 * LAMPORTS_PER_SOL)
      ),
      provider.connection.confirmTransaction(
        await provider.connection.requestAirdrop(agentOwner.publicKey, 100 * LAMPORTS_PER_SOL)
      ),
    ]);

    // Derive PDAs
    [agentPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("agent"),
        agentOwner.publicKey.toBuffer(),
        Buffer.from(AGENT_ID),
      ],
      program.programId
    );

    [escrowPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("escrow"),
        agentPDA.toBuffer(),
        agentOwner.publicKey.toBuffer(),
      ],
      program.programId
    );

    [userPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("user"), agentOwner.publicKey.toBuffer()],
      program.programId
    );

    // Create user account
    await program.methods
      .createUser("testuser", "test@example.com")
      .accounts({
        user: userPDA,
        owner: agentOwner.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([agentOwner])
      .rpc();

    // Create agent
    await program.methods
      .createAiAgent(
        AGENT_ID,
        AGENT_NAME,
        MAX_BUDGET_PER_TICKET,
        TOTAL_BUDGET,
        true, // auto_purchase_enabled
        8000, // auto_purchase_threshold (80%)
        5 // max_tickets_per_event
      )
      .accounts({
        agent: agentPDA,
        owner: agentOwner.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([agentOwner])
      .rpc();
  });

  it("Creates an escrow account for an agent", async () => {
    await program.methods
      .createEscrow()
      .accounts({
        agent: agentPDA,
        escrow: escrowPDA,
        owner: agentOwner.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([agentOwner])
      .rpc();

    // Fetch escrow account
    const escrowAccount = await program.account.agentEscrow.fetch(escrowPDA);

    expect(escrowAccount.agent.toString()).to.equal(agentPDA.toString());
    expect(escrowAccount.owner.toString()).to.equal(agentOwner.publicKey.toString());
    expect(escrowAccount.balance.toNumber()).to.equal(0);
    expect(escrowAccount.totalDeposited.toNumber()).to.equal(0);
    expect(escrowAccount.totalWithdrawn.toNumber()).to.equal(0);
    expect(escrowAccount.totalSpent.toNumber()).to.equal(0);
  });

  it("Deposits SOL into escrow", async () => {
    const depositAmount = new anchor.BN(5 * LAMPORTS_PER_SOL);

    const escrowBalanceBefore = await provider.connection.getBalance(escrowPDA);
    const ownerBalanceBefore = await provider.connection.getBalance(agentOwner.publicKey);

    await program.methods
      .depositToEscrow(depositAmount)
      .accounts({
        escrow: escrowPDA,
        agent: agentPDA,
        owner: agentOwner.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([agentOwner])
      .rpc();

    const escrowAccount = await program.account.agentEscrow.fetch(escrowPDA);
    const escrowBalanceAfter = await provider.connection.getBalance(escrowPDA);
    const ownerBalanceAfter = await provider.connection.getBalance(agentOwner.publicKey);

    expect(escrowAccount.balance.toNumber()).to.equal(depositAmount.toNumber());
    expect(escrowAccount.totalDeposited.toNumber()).to.equal(depositAmount.toNumber());
    expect(escrowBalanceAfter - escrowBalanceBefore).to.equal(depositAmount.toNumber());
    expect(ownerBalanceBefore - ownerBalanceAfter).to.be.greaterThanOrEqual(depositAmount.toNumber());
  });

  it("Withdraws SOL from escrow", async () => {
    const withdrawAmount = new anchor.BN(2 * LAMPORTS_PER_SOL);

    const escrowBalanceBefore = await provider.connection.getBalance(escrowPDA);
    const ownerBalanceBefore = await provider.connection.getBalance(agentOwner.publicKey);

    await program.methods
      .withdrawFromEscrow(withdrawAmount)
      .accounts({
        escrow: escrowPDA,
        agent: agentPDA,
        owner: agentOwner.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([agentOwner])
      .rpc();

    const escrowAccount = await program.account.agentEscrow.fetch(escrowPDA);

    expect(escrowAccount.totalWithdrawn.toNumber()).to.equal(withdrawAmount.toNumber());
    expect(escrowAccount.balance.toNumber()).to.equal(
      new anchor.BN(5 * LAMPORTS_PER_SOL).sub(withdrawAmount).toNumber()
    );
  });

  it("Fails to withdraw more than escrow balance", async () => {
    const withdrawAmount = new anchor.BN(100 * LAMPORTS_PER_SOL);

    await expect(
      program.methods
        .withdrawFromEscrow(withdrawAmount)
        .accounts({
          escrow: escrowPDA,
          agent: agentPDA,
          owner: agentOwner.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([agentOwner])
        .rpc()
    ).to.be.rejected;
  });

  it("Only allows owner to deposit/withdraw", async () => {
    const stranger = Keypair.generate();
    const depositAmount = new anchor.BN(1 * LAMPORTS_PER_SOL);

    await expect(
      program.methods
        .depositToEscrow(depositAmount)
        .accounts({
          escrow: escrowPDA,
          agent: agentPDA,
          owner: stranger.publicKey, // Not the owner
          systemProgram: SystemProgram.programId,
        })
        .signers([stranger])
        .rpc()
    ).to.be.rejected;
  });

  // TODO: Add test for buy_ticket_with_escrow
  // Requires creating event, tier, and checking purchase logic
});
