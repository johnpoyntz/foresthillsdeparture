import { NextResponse } from "next/server";

const MBTA_BASE = "https://api-v3.mbta.com";
const MBTA_ACCEPT = "application/vnd.api+json";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const stop = searchParams.get("stop") ?? "place-forhl";
  const route = searchParams.get("route") ?? "Orange";
  const directionId = searchParams.get("direction_id");

  const qs = new URLSearchParams();
  qs.set("filter[stop]", stop);
  qs.set("filter[route]", route);

  if (directionId !== null && directionId !== undefined && directionId !== "") {
    qs.set("filter[direction_id]", directionId);
  }

  qs.set(
    "fields[prediction]",
    "departure_time,arrival_time,status,stop_sequence,direction_id",
  );
  qs.set("include", "stop,route");

  const url = `${MBTA_BASE}/predictions?${qs.toString()}`;

  const makeRequest = async (useApiKey: boolean) => {
    const headers: Record<string, string> = { accept: MBTA_ACCEPT };
    if (useApiKey && process.env.MBTA_API_KEY) {
      headers["x-api-key"] = process.env.MBTA_API_KEY;
    }
    return fetch(url, { headers, cache: "no-store" });
  };

  const hasApiKey = Boolean(process.env.MBTA_API_KEY);
  let response = await makeRequest(hasApiKey);
  if (hasApiKey && (response.status === 401 || response.status === 403)) {
    response = await makeRequest(false);
  }

  const text = await response.text();

  if (!response.ok) {
    return NextResponse.json(
      {
        error: "MBTA upstream request failed",
        status: response.status,
        details: text.slice(0, 280).replace(/\s+/g, " ").trim(),
      },
      { status: response.status },
    );
  }

  return new NextResponse(text, {
    status: response.status,
    headers: {
      "content-type": response.headers.get("content-type") ?? MBTA_ACCEPT,
    },
  });
}
