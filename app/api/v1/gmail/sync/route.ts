import { NextResponse } from "next/server";
import { startIdle } from "@/lib/imap";

export async function GET() {
  try {
    startIdle();
    return NextResponse.json({ message: "IMAP IDLE process started." });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 },
    );
  }
}
