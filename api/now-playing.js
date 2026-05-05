export default async function handler(request, response) {
  const apiKey = process.env.TMDB_API_KEY;

  if (!apiKey) {
    return response.status(500).json({ error: "TMDB_API_KEY is not configured." });
  }

  const { language = "ko-KR", region = "KR", page = "1" } = request.query;
  const params = new URLSearchParams({
    api_key: apiKey,
    language,
    region,
    page,
  });

  try {
    const tmdbResponse = await fetch(
      `https://api.themoviedb.org/3/movie/now_playing?${params.toString()}`
    );
    const data = await tmdbResponse.json();

    return response.status(tmdbResponse.status).json(data);
  } catch (error) {
    return response.status(502).json({
      error: "Failed to fetch now playing movies.",
    });
  }
}
