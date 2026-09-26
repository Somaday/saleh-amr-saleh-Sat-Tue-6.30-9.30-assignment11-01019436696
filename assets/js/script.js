const NASA_API_URL = "https://api.nasa.gov/planetary/apod?api_key=DEMO_KEY";
const LAUNCHES_API_URL = "https://ll.thespacedevs.com/2.2.0/launch/upcoming/?limit=10";
const PLANETS_API_URL = "https://api.le-systeme-solaire.net/rest/bodies/";
const SOLAR_SYSTEM_API_TOKEN = "8b64f88c-c436-4f3b-822d-8005fcab6527";

const LAUNCH_PLACEHOLDER = "./assets/images/launch-placeholder.png";
const AU_IN_KM = 149597870.7;

const planetImagePaths = {
  mercury: "./assets/images/mercury.png",
  venus: "./assets/images/venus.png",
  earth: "./assets/images/earth.png",
  mars: "./assets/images/mars.png",
  jupiter: "./assets/images/jupiter.png",
  saturn: "./assets/images/saturn.png",
  uranus: "./assets/images/uranus.png",
  neptune: "./assets/images/neptune.png",
};

const superscriptMap = { 0: "⁰", 1: "¹", 2: "²", 3: "³", 4: "⁴", 5: "⁵", 6: "⁶", 7: "⁷", 8: "⁸", 9: "⁹", "-": "⁻" };
const toSuperscript = (value) =>
  String(value)
    .split("")
    .map((ch) => superscriptMap[ch] ?? ch)
    .join("");

const getJson = async (url, options = {}) => {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`Request failed (${response.status}): ${url}`);
  }
  return response.json();
};

const getLaunchImage = (launch) =>
  launch.image?.image_url || launch.image?.thumbnail_url || launch.rocket?.configuration?.image_url || "";

const getLaunchStatus = (launch) => launch.status?.abbrev || "TBD";

function formatDistance(km) {
  if (km === undefined || km === null) return "N/A";
  return `${(km / 1e6).toFixed(1)}M km`;
}

function formatOrbitalPeriod(days) {
  if (days === undefined || days === null) return "N/A";
  const absDays = Math.abs(days);
  return absDays < 700 ? `${absDays.toFixed(1)} days` : `${(absDays / 365.25).toFixed(1)} years`;
}

function formatRotation(hours) {
  if (hours === undefined || hours === null) return "N/A";
  const absHours = Math.abs(hours);
  const formatted = absHours < 48 ? `${absHours.toFixed(1)} hours` : `${(absHours / 24).toFixed(1)} days`;
  return hours < 0 ? `${formatted} (retrograde)` : formatted;
}

function formatMassLike(entry, unit) {
  if (!entry) return "N/A";
  return `${entry.massValue ?? entry.volValue} × 10${toSuperscript(entry.massExponent ?? entry.volExponent)} ${unit}`;
}

function formatTemperature(kelvin) {
  if (!kelvin) return "N/A";
  return `${(kelvin - 273.15).toFixed(0)}°C`;
}

function formatDateDisplay(dateString) {
  if (!dateString) return "";
  const parsed = new Date(`${dateString}T00:00:00`);
  return parsed.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function syncDateDisplay(dateString) {
  const wrapper = document.querySelector(".date-input-wrapper");
  const label = wrapper?.querySelector("span.text-sm");
  const formatted = formatDateDisplay(dateString);
  if (wrapper) wrapper.setAttribute("data-date", formatted);
  if (label) label.textContent = formatted;
}

async function fetchNASAData(date = "") {
  const url = date ? `${NASA_API_URL}&date=${date}` : NASA_API_URL;

  try {
    const loadingEl = document.getElementById("apod-loading");
    const imgEl = document.getElementById("apod-image");
    if (loadingEl) {
      loadingEl.textContent = "";
      loadingEl.innerHTML = `<i class="fas fa-spinner fa-spin text-4xl text-blue-400 mb-4"></i><p class="text-slate-400">Loading today's image...</p>`;
      loadingEl.style.display = "block";
    }
    if (imgEl) imgEl.style.display = "none";

    const data = await getJson(url);

    if (imgEl && data.media_type === "image" && data.url) {
      imgEl.src = data.url;
      imgEl.alt = data.title || "Astronomy Picture of the Day";
      imgEl.onerror = () => {
        imgEl.onerror = null;
        imgEl.src = "./assets/images/placeholder.webp";
        imgEl.style.display = "block";
      };
      imgEl.style.display = "block";
    }
    if (loadingEl) loadingEl.style.display = "none";

    document.getElementById("apod-title").textContent = data.title || "No Title";
    document.getElementById("apod-date").textContent = `Astronomy Picture of the Day - ${data.date}`;
    document.getElementById("apod-date-detail").innerHTML = `<i class="far fa-calendar mr-2"></i>${data.date}`;
    document.getElementById("apod-explanation").textContent = data.explanation || "No explanation available.";

    const copyrightEl = document.getElementById("apod-copyright");
    if (data.copyright) {
      copyrightEl.textContent = `© ${data.copyright}`;
      copyrightEl.style.display = "block";
    } else {
      copyrightEl.style.display = "none";
    }

    document.getElementById("apod-date-info").textContent = data.date;
    document.getElementById("apod-media-type").textContent = data.media_type === "image" ? "Image" : "Video";

    const dateInput = document.getElementById("apod-date-input");
    if (dateInput) dateInput.value = data.date;
    syncDateDisplay(data.date);
  } catch (error) {
    console.error("Error fetching NASA data:", error);
    const loadingEl = document.getElementById("apod-loading");
    if (loadingEl) {
      loadingEl.style.display = "block";
      loadingEl.innerHTML = `<p class="text-red-400">Failed to load today's image. ${error.message}</p>`;
    }
  }
}

document.getElementById("load-date-btn")?.addEventListener("click", () => {
  const selectedDate = document.getElementById("apod-date-input").value;
  if (selectedDate) fetchNASAData(selectedDate);
});

document.getElementById("today-apod-btn")?.addEventListener("click", () => {
  document.getElementById("apod-date-input").value = "";
  fetchNASAData();
});

document.getElementById("apod-date-input")?.addEventListener("change", (event) => {
  syncDateDisplay(event.target.value);
});

async function fetchLaunchesData() {
  const grid = document.getElementById("launches-grid");
  try {
    const data = await getJson(LAUNCHES_API_URL);

    document.getElementById("launches-count").textContent = `${data.results?.length || 0} Launches`;
    document.getElementById("launches-count-mobile").textContent = data.results?.length || 0;

    if (!grid) return;
    grid.innerHTML = "";

    (data.results || []).forEach((launch) => {
      const launchDate = new Date(launch.net);
      const date = launchDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      const time = launchDate.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        timeZoneName: "short",
      });

      let statusColor = "bg-blue-500/90";
      if (["Go", "Success"].includes(getLaunchStatus(launch))) statusColor = "bg-green-500/90";
      else if (["TBD", "TBC"].includes(getLaunchStatus(launch))) statusColor = "bg-yellow-500/90";

      const card = `
            <div class="bg-slate-800/50 border border-slate-700 rounded-2xl overflow-hidden hover:border-blue-500/30 transition-all group cursor-pointer flex flex-col">
              <div class="relative h-48 bg-slate-900/50 flex items-center justify-center overflow-hidden">
                ${getLaunchImage(launch) ? `<img src="${getLaunchImage(launch)}" onerror="this.onerror=null;this.src='${LAUNCH_PLACEHOLDER}'" class="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity" alt="${launch.name || "Launch"}">` : `<img src="${LAUNCH_PLACEHOLDER}" class="w-full h-full object-cover opacity-60" alt="Launch placeholder">`}
                <div class="absolute top-3 right-3">
                  <span class="px-3 py-1 ${statusColor} text-white backdrop-blur-sm rounded-full text-xs font-semibold">
                    ${getLaunchStatus(launch)}
                  </span>
                </div>
              </div>
              <div class="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <h4 class="font-bold text-lg mb-2 line-clamp-2 group-hover:text-blue-400 transition-colors">${launch.name}</h4>
                  <p class="text-sm text-slate-400 flex items-center gap-2 mb-4">
                    <i class="fas fa-building text-xs"></i>
                    ${launch.launch_service_provider?.name || "Unknown"}
                  </p>
                  <div class="space-y-2 mb-4">
                    <div class="flex items-center gap-2 text-sm"><i class="fas fa-calendar text-slate-500 w-4"></i><span class="text-slate-300">${date}</span></div>
                    <div class="flex items-center gap-2 text-sm"><i class="fas fa-clock text-slate-500 w-4"></i><span class="text-slate-300">${time}</span></div>
                    <div class="flex items-center gap-2 text-sm"><i class="fas fa-map-marker-alt text-slate-500 w-4"></i><span class="text-slate-300 line-clamp-1">${launch.pad?.name || "Unknown"}</span></div>
                  </div>
                </div>
                <div class="flex items-center gap-2 pt-4 border-t border-slate-700 mt-auto">
                  <button class="flex-1 px-4 py-2 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors text-sm font-semibold">Details</button>
                  <button class="px-3 py-2 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors"><i class="far fa-heart"></i></button>
                </div>
              </div>
            </div>`;
      grid.innerHTML += card;
    });
  } catch (error) {
    console.error("Error fetching Launches:", error);
    if (grid) {
      grid.innerHTML = `<div class="col-span-full text-center text-red-400 py-8">Unable to load launches right now. Please try again later.</div>`;
    }
  }
}

async function fetchPlanetsData() {
  const planetsGrid = document.getElementById("planets-grid");
  try {
    // محاولة جلب البيانات بـ Token أو بشكل رئيسي بدون معوقات CORS
    let url = `${PLANETS_API_URL}?filter[]=isPlanet,eq,true`;
    if (SOLAR_SYSTEM_API_TOKEN) {
      url += `&key=${SOLAR_SYSTEM_API_TOKEN}`;
    }

    const data = await getJson(url);
    const planets = data.bodies || [];

    window.updatePlanetDetails = (planetName) => {
      const planet = planets.find((p) => p.englishName.toLowerCase() === planetName.toLowerCase());
      if (!planet) return;

      const auValue = (planet.semimajorAxis / AU_IN_KM).toFixed(2);

      document.getElementById("planet-detail-name").textContent = planet.englishName;
      document.getElementById("planet-detail-description").textContent =
        `${planet.englishName} is classified as a ${(planet.bodyType || "planet").toLowerCase()} orbiting the Sun at an average distance of ${auValue} AU. It has a mean radius of ${planet.meanRadius ?? "N/A"} km and a surface gravity of ${planet.gravity ?? "N/A"} m/s².`;

      document.getElementById("planet-distance").textContent = formatDistance(planet.semimajorAxis);
      document.getElementById("planet-radius").textContent = `${planet.meanRadius ?? "N/A"} km`;
      document.getElementById("planet-mass").textContent = formatMassLike(planet.mass, "kg");
      document.getElementById("planet-density").textContent = `${planet.density ?? "N/A"} g/cm³`;
      document.getElementById("planet-orbital-period").textContent = formatOrbitalPeriod(planet.sideralOrbit);
      document.getElementById("planet-rotation").textContent = formatRotation(planet.sideralRotation);
      document.getElementById("planet-moons").textContent = planet.moons ? planet.moons.length : 0;
      document.getElementById("planet-gravity").textContent = `${planet.gravity ?? "N/A"} m/s²`;

      document.getElementById("planet-discoverer").textContent = planet.discoveredBy || "Known since antiquity";
      document.getElementById("planet-discovery-date").textContent = planet.discoveryDate || "Ancient";
      document.getElementById("planet-body-type").textContent = planet.bodyType || "Planet";
      document.getElementById("planet-volume").textContent = formatMassLike(planet.vol, "km³");

      document.getElementById("planet-perihelion").textContent = formatDistance(planet.perihelion);
      document.getElementById("planet-aphelion").textContent = formatDistance(planet.aphelion);
      document.getElementById("planet-eccentricity").textContent = planet.eccentricity ?? "N/A";
      document.getElementById("planet-inclination").textContent = `${planet.inclination ?? "N/A"}°`;
      document.getElementById("planet-axial-tilt").textContent = `${planet.axialTilt ?? "N/A"}°`;
      document.getElementById("planet-temp").textContent = formatTemperature(planet.avgTemp);
      document.getElementById("planet-escape").textContent = planet.escape
        ? `${(planet.escape / 1000).toFixed(2)} km/s`
        : "N/A";

      document.getElementById("planet-detail-image").src = planetImagePaths[planet.englishName.toLowerCase()] || "";

      document.querySelectorAll(".planet-card").forEach((card) => {
        card.classList.toggle("border-blue-500", card.dataset.planetId === planet.englishName.toLowerCase());
      });
    };

    if (planetsGrid) {
      planetsGrid.innerHTML = "";
      planets.forEach((planet) => {
        const card = document.createElement("article");
        const planetId = planet.englishName.toLowerCase();
        card.className =
          "planet-card bg-slate-800/50 border border-slate-700 rounded-2xl p-4 transition-all cursor-pointer group";
        card.dataset.planetId = planetId;
        card.innerHTML = `
                    <div class="relative mb-3 h-24 flex items-center justify-center">
                        <img class="w-20 h-20 object-contain group-hover:scale-110 transition-transform" src="${planetImagePaths[planetId] || ""}" alt="${planet.englishName}">
                    </div>
                    <h4 class="font-semibold text-center text-sm">${planet.englishName}</h4>
                    <p class="text-xs text-slate-400 text-center">Gravity: ${planet.gravity ?? "N/A"} m/s²</p>
                    <p class="text-xs text-slate-400 text-center">Density: ${planet.density ?? "N/A"} g/cm³</p>
                `;
        planetsGrid.appendChild(card);
      });
    }

    document.querySelectorAll(".planet-card").forEach((card) => {
      card.addEventListener("click", () => {
        const planetId = card.getAttribute("data-planet-id");
        window.updatePlanetDetails(planetId);
      });
    });

    if (planets.length) window.updatePlanetDetails("earth");
  } catch (error) {
    console.error("Error fetching Planets:", error);
    if (planetsGrid) {
      planetsGrid.innerHTML = `<div class="col-span-full text-center text-red-400 py-8">Unable to load planet data. Make sure a valid Solar System OpenData API token is set.</div>`;
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const navLinks = document.querySelectorAll(".nav-link[data-section]");
  const sections = document.querySelectorAll(".app-section[data-section]");
  const sidebar = document.getElementById("sidebar");
  const sidebarToggle = document.getElementById("sidebar-toggle");
  const dateInput = document.getElementById("apod-date-input");

  if (dateInput) {
    const today = new Date().toISOString().split("T")[0];
    dateInput.max = today;
  }

  const showSection = (sectionId) => {
    const sectionExists = [...sections].some((section) => section.dataset.section === sectionId);
    if (!sectionExists) return;

    sections.forEach((section) => {
      section.classList.toggle("hidden", section.dataset.section !== sectionId);
    });

    navLinks.forEach((link) => {
      const isActive = link.dataset.section === sectionId;
      link.classList.toggle("bg-blue-500/10", isActive);
      link.classList.toggle("text-blue-400", isActive);
      link.classList.toggle("text-slate-300", !isActive);
    });

    window.history.replaceState(null, "", `#${sectionId}`);
  };

  navLinks.forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      showSection(link.dataset.section);
      sidebar?.classList.add("sidebar-mobile");
    });
  });

  sidebarToggle?.addEventListener("click", () => {
    sidebar?.classList.toggle("sidebar-mobile");
  });

  const initialSection = window.location.hash.slice(1);
  showSection(initialSection || "today-in-space");

  fetchNASAData();
  fetchLaunchesData();
  fetchPlanetsData();
});
