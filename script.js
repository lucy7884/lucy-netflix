const API_URL = "/api/now-playing";
const IMAGE_BASE = "https://image.tmdb.org/t/p/";

const state = {
  movies: [],
  rawMovies: [],
  page: 1,
  totalPages: 1,
  region: "KR",
  sort: "default",
  searchTerm: "",
  isLoading: false,
};

const elements = {
  header: document.querySelector(".site-header"),
  hero: document.querySelector("#hero"),
  heroTitle: document.querySelector("#heroTitle"),
  heroOverview: document.querySelector("#heroOverview"),
  heroMeta: document.querySelector("#heroMeta"),
  grid: document.querySelector("#movieGrid"),
  status: document.querySelector("#status"),
  loadMore: document.querySelector("#loadMore"),
  sortSelect: document.querySelector("#sortSelect"),
  regionSelect: document.querySelector("#regionSelect"),
  searchForm: document.querySelector("#searchForm"),
  searchInput: document.querySelector("#movieSearch"),
  listTitle: document.querySelector("#listTitle"),
  template: document.querySelector("#movieCardTemplate"),
};

const fallbackPoster =
  "data:image/svg+xml;charset=UTF-8," +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600">
      <rect width="400" height="600" fill="#1d2029"/>
      <text x="50%" y="48%" dominant-baseline="middle" text-anchor="middle"
        fill="#a6abb8" font-family="Arial" font-size="28">No Poster</text>
    </svg>
  `);

async function fetchNowPlaying({ page = 1, reset = false } = {}) {
  state.isLoading = true;
  updateStatus(reset ? "상영작을 새로 불러오는 중입니다." : "영화 정보를 불러오고 있습니다.");
  toggleSkeleton(reset);

  const params = new URLSearchParams({
    language: "ko-KR",
    region: state.region,
    page,
  });

  try {
    const response = await fetch(`${API_URL}?${params.toString()}`);

    if (!response.ok) {
      throw new Error(`TMDB 요청 실패: ${response.status}`);
    }

    const data = await response.json();
    state.page = data.page;
    state.totalPages = Math.min(data.total_pages || 1, 20);
    state.rawMovies = reset ? data.results : [...state.rawMovies, ...data.results];
    applyFilters();
    updateHero(state.rawMovies[0]);
  } catch (error) {
    console.error(error);
    updateStatus("영화 정보를 불러오지 못했습니다. API 키와 네트워크 상태를 확인해 주세요.");
    elements.loadMore.hidden = true;
  } finally {
    state.isLoading = false;
  }
}

function applyFilters() {
  let filtered = [...state.rawMovies];

  if (state.searchTerm) {
    const keyword = state.searchTerm.toLowerCase();
    filtered = filtered.filter((movie) =>
      getTitle(movie).toLowerCase().includes(keyword)
    );
  }

  if (state.sort === "rating") {
    filtered.sort((a, b) => b.vote_average - a.vote_average);
  }

  if (state.sort === "date") {
    filtered.sort((a, b) => new Date(b.release_date || 0) - new Date(a.release_date || 0));
  }

  if (state.sort === "title") {
    filtered.sort((a, b) => getTitle(a).localeCompare(getTitle(b), "ko"));
  }

  state.movies = filtered;
  renderMovies();
}

function renderMovies() {
  elements.grid.innerHTML = "";

  if (!state.movies.length) {
    updateStatus("조건에 맞는 영화가 없습니다.");
    elements.loadMore.hidden = true;
    return;
  }

  const fragment = document.createDocumentFragment();

  state.movies.forEach((movie) => {
    const card = elements.template.content.firstElementChild.cloneNode(true);
    const poster = card.querySelector(".poster");
    const rating = card.querySelector(".rating");
    const title = card.querySelector("h3");
    const release = card.querySelector(".release");
    const overview = card.querySelector(".overview");

    title.textContent = getTitle(movie);
    release.textContent = formatReleaseDate(movie.release_date);
    overview.textContent = movie.overview || "줄거리 정보가 아직 제공되지 않았습니다.";
    rating.textContent = `★ ${movie.vote_average.toFixed(1)}`;
    poster.src = movie.poster_path ? `${IMAGE_BASE}w500${movie.poster_path}` : fallbackPoster;
    poster.alt = `${getTitle(movie)} 포스터`;

    card.addEventListener("click", () => updateHero(movie));
    fragment.append(card);
  });

  elements.grid.append(fragment);
  updateStatus(`${state.movies.length}편의 영화를 보여주고 있습니다.`);
  elements.loadMore.hidden = state.searchTerm || state.page >= state.totalPages;
}

function updateHero(movie) {
  if (!movie) return;

  elements.heroTitle.textContent = getTitle(movie);
  elements.heroOverview.textContent =
    movie.overview || "현재 극장에서 상영 중인 영화입니다. 포스터를 눌러 대표 영화를 바꿔보세요.";
  elements.heroMeta.innerHTML = `
    <span>평점 ${movie.vote_average.toFixed(1)}</span>
    <span>${formatReleaseDate(movie.release_date)}</span>
    <span>투표 ${movie.vote_count.toLocaleString("ko-KR")}</span>
  `;

  if (movie.backdrop_path) {
    const backdrop = `${IMAGE_BASE}original${movie.backdrop_path}`;
    elements.hero.style.backgroundImage = `
      linear-gradient(90deg, rgba(8, 9, 13, 0.94), rgba(8, 9, 13, 0.5) 48%, rgba(8, 9, 13, 0.18)),
      linear-gradient(0deg, var(--bg) 0%, rgba(8, 9, 13, 0.05) 36%),
      url("${backdrop}")
    `;
  }
}

function toggleSkeleton(show) {
  if (!show) return;

  elements.grid.innerHTML = "";
  const fragment = document.createDocumentFragment();

  for (let index = 0; index < 10; index += 1) {
    const skeleton = document.createElement("div");
    skeleton.className = "skeleton";
    fragment.append(skeleton);
  }

  elements.grid.append(fragment);
}

function updateStatus(message) {
  elements.status.textContent = message;
}

function getTitle(movie) {
  return movie.title || movie.original_title || "제목 없음";
}

function formatReleaseDate(date) {
  if (!date) return "개봉일 미정";

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(date));
}

elements.loadMore.addEventListener("click", () => {
  if (state.isLoading || state.page >= state.totalPages) return;
  fetchNowPlaying({ page: state.page + 1 });
});

elements.sortSelect.addEventListener("change", (event) => {
  state.sort = event.target.value;
  applyFilters();
});

elements.regionSelect.addEventListener("change", (event) => {
  state.region = event.target.value;
  state.page = 1;
  state.rawMovies = [];
  state.searchTerm = "";
  elements.searchInput.value = "";
  elements.listTitle.textContent = "현재 상영작";
  fetchNowPlaying({ page: 1, reset: true });
});

elements.searchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  state.searchTerm = elements.searchInput.value.trim();
  elements.listTitle.textContent = state.searchTerm ? `"${state.searchTerm}" 검색 결과` : "현재 상영작";
  applyFilters();
});

window.addEventListener("scroll", () => {
  elements.header.classList.toggle("is-scrolled", window.scrollY > 20);
});

fetchNowPlaying({ page: 1, reset: true });
