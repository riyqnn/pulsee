import * as anchor from "@anchor-lang/core";
import { Program } from "@anchor-lang/core";
import { Pulse } from "../target/types/pulse";

describe("pulse", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.pulse as Program<Pulse>;

  it("Is initialized!", async () => {
    // Add your test here.
    const tx = await program.methods.initialize().rpc();
    console.log("Your transaction signature", tx);
  });
});
