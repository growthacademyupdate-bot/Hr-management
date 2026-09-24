import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) return new NextResponse("Missing URL", { status: 400 });

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Failed to fetch document");

    const arrayBuffer = await response.arrayBuffer();
    
    // Cloudinary forces Content-Disposition: attachment for PDFs on free accounts to prevent XSS.
    // By proxying the file through our own API, we can override the header to allow inline previews.
    return new NextResponse(arrayBuffer, {
      headers: {
        "Content-Type": response.headers.get("Content-Type") || "application/pdf",
        "Content-Disposition": "inline",
        "Cache-Control": "public, max-age=31536000, immutable"
      },
    });
  } catch (error) {
    return new NextResponse("Error fetching document", { status: 500 });
  }
}
