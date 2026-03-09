import { NextRequest, NextResponse } from "next/server";
import type { DetectionResponse } from "@/app/types";

const PYTHON_API_URL = "http://127.0.0.1:8000/detect";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("image");

    if (!(file instanceof File)) {
      return NextResponse.json<DetectionResponse>(
        {
          ok: false,
          results: [],
          error: "Image file is required",
        },
        { status: 400 },
      );
    }

    const pythonFormData = new FormData();
    pythonFormData.append("image", file);

    const response = await fetch(PYTHON_API_URL, {
      method: "POST",
      body: pythonFormData,
    });

    const data: DetectionResponse = await response.json();

    return NextResponse.json<DetectionResponse>(data, {
      status: response.ok ? 200 : 500,
    });
  } catch (error) {
    console.error("Next.js API proxy error:", error);

    return NextResponse.json<DetectionResponse>(
      {
        ok: false,
        results: [],
        error: "Failed to connect to Python service",
      },
      { status: 500 },
    );
  }
}
