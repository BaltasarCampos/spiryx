// Vercel Edge Runtime compatible
export const runtime = 'edge';

const BASE_URL = "https://api-bdc.net/data/reverse-geocode";

export default async function handler(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url, `${request.headers.get("x-forwarded-proto") || "https"}://${request.headers.get("host") || "localhost"}`);
  const latStrng = searchParams.get("latitude");
  const lonStrng = searchParams.get("longitude");

  if (!latStrng || !lonStrng) {
    return new Response(JSON.stringify({ error: "Missing coordinates" }), { status: 400 });
  }

  const latitude = parseFloat(latStrng);
  const longitude = parseFloat(lonStrng);

  if (isNaN(latitude) || latitude < -90 || latitude > 90 || isNaN(longitude) || longitude < -180 || longitude > 180) {
    return new Response(JSON.stringify(
      {
        error: 'INVALID_PARAMS',
        message: 'lat must be in [-90, 90] and lng must be in [-180, 180]',
      }
    ), { status: 400 });
  }

  const token = process.env['BIG_DATA_CLOUD_API_KEY'];
  if (!token) {
    return new Response(JSON.stringify(
      { error: 'CONFIGURATION_ERROR', message: 'API token not configured' }
    ), { status: 500 });
  }

  const finalUrl = new URL(BASE_URL);
  finalUrl.searchParams.append("latitude", latitude.toString());
  finalUrl.searchParams.append("longitude", longitude.toString());
  finalUrl.searchParams.append("localityLanguage", "default");
  finalUrl.searchParams.append("key", token);
  
  try {
    const upstream = await fetch(finalUrl);
    const data = await upstream.json();

    return new Response(JSON.stringify(data), {
      headers: { "Access-Control-Allow-Origin": "*" },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify(
      { error: 'FETCH_ERROR', message: 'Failed to fetch geocoding data' }
    ), { status: 500 });
  }
}