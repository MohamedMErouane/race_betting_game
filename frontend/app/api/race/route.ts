import { NextResponse } from 'next/server';
import { createRace, getCurrentRace, getRaceInfo } from '@/lib/bettingService';
import { escrow, ensureEscrowFunded } from '@/lib/escrowWallet';

// GET /api/race — Get current race info + escrow address
export async function GET() {
  let race = getCurrentRace();

  // Auto-create a race if none exists
  if (!race || race.status === 'finished' || race.status === 'paid_out') {
    race = createRace();
    // Ensure escrow has SOL for payouts (Devnet airdrop)
    ensureEscrowFunded().catch(() => {});
  }

  const info = getRaceInfo(race.id);

  return NextResponse.json({
    race: info,
    escrowAddress: escrow.address,
    houseAddress: escrow.address,
  });
}

// POST /api/race — Create a new race round
export async function POST() {
  const race = createRace();
  await ensureEscrowFunded().catch(() => {});

  return NextResponse.json({
    race: getRaceInfo(race.id),
    escrowAddress: escrow.address,
    houseAddress: escrow.address,
  });
}
