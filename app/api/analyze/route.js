import { NextResponse } from "next/server";
import { resolveMedia } from "@/lib/platforms/resolver";

export async function POST(request) {
  try {
    const body = await request.json();

    const url = body?.url;

    if (!url) {
      return NextResponse.json(
        {
          error: "URL is required"
        },
        {
          status: 400
        }
      );
    }

    const media = await resolveMedia(url);

    return NextResponse.json(media);

  } catch (error) {
    return NextResponse.json(
      {
        error: error.message || "Unable to analyze URL"
      },
      {
        status: 500
      }
    );
  }
}
