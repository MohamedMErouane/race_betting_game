import { NextRequest, NextResponse } from 'next/server';
import { placeBet, getCurrentRace, getRaceInfo } from '@/lib/bettingService';
import { escrow } from '@/lib/escrowWallet';

// POST /api/bet — Place a bet on the current race
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { wallet, racerIndex, amountLamports, txSignature } = body;

  // Validate input
  if (!wallet || typeof wallet !== 'string') {
    return NextResponse.json({ error: 'Missing wallet address' }, { status: 400 });
  }
  if (typeof racerIndex !== 'number' || racerIndex < 0 || racerIndex > 9) {
    return NextResponse.json({ error: 'Invalid racer index' }, { status: 400 });
  }
  if (typeof amountLamports !== 'number' || amountLamports <= 0) {
    return NextResponse.json({ error: 'Invalid bet amount' }, { status: 400 });
  }
  if (!txSignature || typeof txSignature !== 'string') {
    return NextResponse.json({ error: 'Missing transaction signature' }, { status: 400 });
  }

  // Get current race
  const race = getCurrentRace();
  if (!race) {
    return NextResponse.json({ error: 'No active race' }, { status: 400 });
  }

  // Place the bet (verifies TX on-chain)
  const result = await placeBet(
    race.id,
    wallet,
    racerIndex,
    amountLamports,
    txSignature,
    escrow.address
  );

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    success: true,
    warning: result.error, // "pending verification" warning if applicable
    race: getRaceInfo(race.id),
  });
}
