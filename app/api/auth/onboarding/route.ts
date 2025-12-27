import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { updateUserApiKeys } from "@/lib/users";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await request.json();

    await updateUserApiKeys(session.user.id, data);

    return NextResponse.json(
      { message: "Configuration saved successfully" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Onboarding error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
