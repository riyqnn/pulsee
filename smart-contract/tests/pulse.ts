import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Pulse } from "../target/types/pulse";
import { PublicKey, Keypair, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, createMint, createAccount, mintTo } from "@solana/spl-token";
import { assert } from "chai";

describe("PULSE - Real-time Revenue Split", () => {
  // Configure the client to use the local cluster or devnet
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Pulse as Program<Pulse>;

  // Test accounts
  let authority: Keypair;
  let investor: Keypair;
  let buyer: Keypair;

  // PDAs and accounts
  let eventPda: PublicKey;
  let vaultPda: PublicKey;
  let investorPositionPda: PublicKey;
  let revenueNftMint: PublicKey;

  // Event configuration
  const eventId = "test-event-001";
  const revenueSplitBps = 3000; // 30%
  const revenueNftSupply = new anchor.BN(100);

  before(async () => {
    // Generate test accounts
    authority = Keypair.generate();
    investor = Keypair.generate();
    buyer = Keypair.generate();

    // Fund test accounts
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(authority.publicKey, 10 * LAMPORTS_PER_SOL)
    );
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(investor.publicKey, 10 * LAMPORTS_PER_SOL)
    );
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(buyer.publicKey, 10 * LAMPORTS_PER_SOL)
    );

    // Create Revenue NFT Mint
    revenueNftMint = await createMint(
      provider.connection,
      authority,
      authority.publicKey,
      null,
      0
    );
  });

  it("Creates a new event", async () => {
    [eventPda] = PublicKey.findProgramSync(
      [
        Buffer.from("event"),
        authority.publicKey.toBuffer(),
        Buffer.from(eventId),
      ],
      program.programId
    );

    [vaultPda] = PublicKey.findProgramSync(
      [Buffer.from("vault"), eventPda.toBuffer()],
      program.programId
    );

    await program.methods
      .createEvent(eventId, revenueSplitBps, revenueNftSupply)
      .accounts({
        event: eventPda,
        vault: vaultPda,
        revenueNftMint: revenueNftMint,
        authority: authority.publicKey,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([authority])
      .rpc();

    // Fetch and verify the event account
    const eventAccount = await program.account.event.fetch(eventPda);

    assert.equal(eventAccount.authority.toString(), authority.publicKey.toString());
    assert.equal(eventAccount.eventId, eventId);
    assert.equal(eventAccount.revenueSplitBps, revenueSplitBps);
    assert.equal(eventAccount.revenueNftSupply.toString(), revenueNftSupply.toString());
    assert.equal(eventAccount.totalRevenueCollected.toNumber(), 0);
    assert.equal(eventAccount.totalInvestorPool.toNumber(), 0);
    assert.equal(eventAccount.totalRevenuePerShare.toNumber(), 0);

    console.log("✅ Event created successfully");
    console.log("   Event:", eventPda.toString());
    console.log("   Vault:", vaultPda.toString());
  });

  it("Investor buys revenue NFTs", async () => {
    const nftAmount = new anchor.BN(5);

    [investorPositionPda] = PublicKey.findProgramSync(
      [
        Buffer.from("investor"),
        eventPda.toBuffer(),
        investor.publicKey.toBuffer(),
      ],
      program.programId
    );

    // Create a fake buyer_funding account to transfer SOL from
    const buyerFunding = Keypair.generate();
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(buyerFunding.publicKey, 5 * LAMPORTS_PER_SOL)
    );

    await program.methods
      .buyRevenueNft(nftAmount)
      .accounts({
        event: eventPda,
        investorPosition: investorPositionPda,
        buyerFunding: buyerFunding.publicKey,
        owner: investor.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([investor, buyerFunding])
      .rpc();

    // Fetch and verify the investor position
    const investorPosition = await program.account.investorPosition.fetch(investorPositionPda);

    assert.equal(investorPosition.owner.toString(), investor.publicKey.toString());
    assert.equal(investorPosition.event.toString(), eventPda.toString());
    assert.equal(investorPosition.nftAmount.toString(), nftAmount.toString());
    assert.equal(investorPosition.rewardDebt.toNumber(), 0);

    console.log("✅ Investor bought", nftAmount.toString(), "revenue NFTs");
  });

  it("Buyer buys a ticket with revenue split", async () => {
    const ticketPrice = new anchor.BN(1 * LAMPORTS_PER_SOL); // 1 SOL

    const vaultBalanceBefore = await provider.connection.getBalance(vaultPda);
    const authorityBalanceBefore = await provider.connection.getBalance(authority.publicKey);
    const eventBefore = await program.account.event.fetch(eventPda);

    await program.methods
      .buyTicket(ticketPrice)
      .accounts({
        event: eventPda,
        vault: vaultPda,
        eventAuthority: authority.publicKey,
        buyer: buyer.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([buyer])
      .rpc();

    // Verify balances
    const vaultBalanceAfter = await provider.connection.getBalance(vaultPda);
    const authorityBalanceAfter = await provider.connection.getBalance(authority.publicKey);
    const eventAfter = await program.account.event.fetch(eventPda);

    // Investor cut: 30% of 1 SOL = 0.3 SOL
    // Organizer cut: 70% of 1 SOL = 0.7 SOL
    const expectedInvestorCut = ticketPrice.mul(new anchor.BN(revenueSplitBps)).div(new anchor.BN(10000));
    const expectedOrganizerCut = ticketPrice.sub(expectedInvestorCut);

    assert.equal(
      vaultBalanceAfter - vaultBalanceBefore,
      expectedInvestorCut.toNumber(),
      "Vault should receive investor cut"
    );
    assert.equal(
      authorityBalanceAfter - authorityBalanceBefore,
      expectedOrganizerCut.toNumber(),
      "Authority should receive organizer cut"
    );

    // Verify event stats
    assert.equal(
      eventAfter.totalRevenueCollected.sub(eventBefore.totalRevenueCollected).toNumber(),
      ticketPrice.toNumber()
    );

    console.log("✅ Ticket bought for", ticketPrice.toString(), "lamports");
    console.log("   Investor cut:", expectedInvestorCut.toString());
    console.log("   Organizer cut:", expectedOrganizerCut.toString());
    console.log("   Total revenue per share:", eventAfter.totalRevenuePerShare.toString());
  });

  it("Another investor buys NFTs after revenue", async () => {
    const anotherInvestor = Keypair.generate();
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(anotherInvestor.publicKey, 10 * LAMPORTS_PER_SOL)
    );

    const nftAmount = new anchor.BN(10);

    const [anotherInvestorPositionPda] = PublicKey.findProgramSync(
      [
        Buffer.from("investor"),
        eventPda.toBuffer(),
        anotherInvestor.publicKey.toBuffer(),
      ],
      program.programId
    );

    const buyerFunding = Keypair.generate();
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(buyerFunding.publicKey, 5 * LAMPORTS_PER_SOL)
    );

    await program.methods
      .buyRevenueNft(nftAmount)
      .accounts({
        event: eventPda,
        investorPosition: anotherInvestorPositionPda,
        buyerFunding: buyerFunding.publicKey,
        owner: anotherInvestor.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([anotherInvestor, buyerFunding])
      .rpc();

    const investorPosition = await program.account.investorPosition.fetch(anotherInvestorPositionPda);
    const event = await program.account.event.fetch(eventPda);

    // Should have reward debt > 0 since event has revenue
    assert.ok(investorPosition.rewardDebt.gt(new anchor.BN(0)));

    console.log("✅ Another investor bought", nftAmount.toString(), "NFTs");
    console.log("   Reward debt:", investorPosition.rewardDebt.toString());
  });

  it("More tickets bought, then investor claims rewards", async () => {
    // Buy 2 more tickets
    const ticketPrice = new anchor.BN(1 * LAMPORTS_PER_SOL);

    for (let i = 0; i < 2; i++) {
      await program.methods
        .buyTicket(ticketPrice)
        .accounts({
          event: eventPda,
          vault: vaultPda,
          eventAuthority: authority.publicKey,
          buyer: buyer.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([buyer])
        .rpc();
    }

    const investorBalanceBefore = await provider.connection.getBalance(investor.publicKey);
    const vaultBalanceBefore = await provider.connection.getBalance(vaultPda);

    await program.methods
      .claim()
      .accounts({
        event: eventPda,
        vault: vaultPda,
        investorPosition: investorPositionPda,
        investor: investor.publicKey,
      })
      .signers([investor])
      .rpc();

    const investorBalanceAfter = await provider.connection.getBalance(investor.publicKey);
    const vaultBalanceAfter = await provider.connection.getBalance(vaultPda);
    const investorPosition = await program.account.investorPosition.fetch(investorPositionPda);

    const claimedAmount = investorBalanceAfter - investorBalanceBefore;
    const vaultDecrease = vaultBalanceBefore - vaultBalanceAfter;

    assert.ok(claimedAmount > 0, "Investor should have claimed rewards");
    assert.equal(claimedAmount, vaultDecrease, "Vault decrease should equal claimed amount");

    console.log("✅ Investor claimed", claimedAmount / LAMPORTS_PER_SOL, "SOL");
  });

  it("Second investor claims rewards", async () => {
    const anotherInvestor = Keypair.generate();
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(anotherInvestor.publicKey, 10 * LAMPORTS_PER_SOL)
    );

    const nftAmount = new anchor.BN(3);

    const [anotherInvestorPositionPda] = PublicKey.findProgramSync(
      [
        Buffer.from("investor"),
        eventPda.toBuffer(),
        anotherInvestor.publicKey.toBuffer(),
      ],
      program.programId
    );

    const buyerFunding = Keypair.generate();
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(buyerFunding.publicKey, 5 * LAMPORTS_PER_SOL)
    );

    // Buy NFTs
    await program.methods
      .buyRevenueNft(nftAmount)
      .accounts({
        event: eventPda,
        investorPosition: anotherInvestorPositionPda,
        buyerFunding: buyerFunding.publicKey,
        owner: anotherInvestor.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([anotherInvestor, buyerFunding])
      .rpc();

    // Claim
    const balanceBefore = await provider.connection.getBalance(anotherInvestor.publicKey);

    await program.methods
      .claim()
      .accounts({
        event: eventPda,
        vault: vaultPda,
        investorPosition: anotherInvestorPositionPda,
        investor: anotherInvestor.publicKey,
      })
      .signers([anotherInvestor])
      .rpc();

    const balanceAfter = await provider.connection.getBalance(anotherInvestor.publicKey);
    const claimed = balanceAfter - balanceBefore;

    console.log("✅ Second investor claimed", claimed / LAMPORTS_PER_SOL, "SOL");
  });
});
