// ==========================================
// 1. إعدادات الـ APIs
// ==========================================
const NASA_API_URL =
  "https://api.nasa.gov/planetary/apod?api_key=bU7WaOFtMVnWeJGvbySkFHQt5WestD49c69xOgQa";
const LAUNCHES_API_URL =
  "https://lldev.thespacedevs.com/2.3.0/launches/upcoming/?limit=10";
const PLANETS_API_URL =
  "https://solar-system-opendata-proxy.vercel.app/api/planets";
const LAUNCH_PLACEHOLDER = "./assets/images/launch-placeholder.png";

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

const getJson = async (url) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Request failed (${response.status}): ${url}`);
  }
  return response.json();
};

const getLaunchImage = (launch) =>
  launch.image?.image_url ||
  launch.image?.thumbnail_url ||
  launch.rocket?.configuration?.image_url ||
  "";

const getLaunchStatus = (launch) => launch.status?.abbrev || "TBD";

// ==========================================
// 2. قسم Today in Space (NASA APOD)
// ==========================================
async function fetchNASAData(date = "") {
  const url = date ? `${NASA_API_URL}&date=${date}` : NASA_API_URL;

  try {
    // إظهار علامة التحميل وإخفاء الصورة مؤقتاً
    const loadingEl = document.getElementById("apod-loading");
    const imgEl = document.getElementById("apod-image");
    if (loadingEl) loadingEl.style.display = "block";
    if (imgEl) imgEl.style.display = "none";

    const data = await getJson(url);

    // حقن البيانات في ملف الـ HTML الخاص بك
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

    document.getElementById("apod-title").textContent =
      data.title || "No Title";
    document.getElementById("apod-date").textContent =
      `Astronomy Picture of the Day - ${data.date}`;
    document.getElementById("apod-date-detail").innerHTML =
      `<i class="far fa-calendar mr-2"></i>${data.date}`;
    document.getElementById("apod-explanation").textContent =
      data.explanation || "No explanation available.";

    const copyrightEl = document.getElementById("apod-copyright");
    if (data.copyright) {
      copyrightEl.textContent = `© ${data.copyright}`;
      copyrightEl.style.display = "block";
    } else {
      copyrightEl.style.display = "none";
    }

    document.getElementById("apod-date-info").textContent = data.date;
    document.getElementById("apod-media-type").textContent =
      data.media_type === "image" ? "Image" : "Video";
  } catch (error) {
    console.error("Error fetching NASA data:", error);
    const loadingEl = document.getElementById("apod-loading");
    if (loadingEl) loadingEl.textContent = "Failed to load today's image.";
  }
}

// تشغيل أزرار التاريخ (Load & Today)
document.getElementById("load-date-btn")?.addEventListener("click", () => {
  const selectedDate = document.getElementById("apod-date-input").value;
  if (selectedDate) fetchNASAData(selectedDate);
});

document.getElementById("today-apod-btn")?.addEventListener("click", () => {
  document.getElementById("apod-date-input").value = "";
  fetchNASAData();
});

// ==========================================
// 3. قسم Upcoming Launches (SpaceDevs)
// ==========================================
async function fetchLaunchesData() {
  try {
    const data = await getJson(LAUNCHES_API_URL);

    // تحديث عدد الرحلات في الـ Header
    document.getElementById("launches-count").textContent =
      `${data.results?.length || 0} Launches`;
    document.getElementById("launches-count-mobile").textContent =
      data.results?.length || 0;

    const grid = document.getElementById("launches-grid");
    if (!grid) return;
    grid.innerHTML = ""; // تفريغ المحتوى الثابت (Static)

    // رسم كروت الرحلات ديناميكياً
    (data.results || []).forEach((launch) => {
      const launchDate = new Date(launch.net);
      const date = launchDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
      const time = launchDate.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        timeZoneName: "short",
      });

      // تحديد لون الحالة (Go = أخضر, TBD/TBC = أصفر/أزرق)
      let statusColor = "bg-blue-500/90";
      if (["Go", "Success"].includes(getLaunchStatus(launch)))
        statusColor = "bg-green-500/90";
      else if (["TBD", "TBC"].includes(getLaunchStatus(launch)))
        statusColor = "bg-yellow-500/90";

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
  }
}

// ==========================================
// 4. قسم Planets (Solar System)
// ==========================================
async function fetchPlanetsData() {
  try {
    const data = await getJson(PLANETS_API_URL);

    // تصفية الكواكب فقط (8 كواكب)
    const planets = (data.bodies || []).filter(
      (body) => body.isPlanet === true,
    );
    const allPlanetsData = planets;

    // دالة لتحديث قسم تفاصيل الكوكب عند النقر عليه
    window.updatePlanetDetails = (planetName) => {
      const planet = allPlanetsData.find(
        (p) => p.englishName.toLowerCase() === planetName.toLowerCase(),
      );
      if (!planet) return;

      document.getElementById("planet-detail-name").textContent =
        planet.englishName;
      document.getElementById("planet-mass").textContent = planet.mass
        ? `${planet.mass.massValue} × 10^${planet.mass.massExponent} kg`
        : "N/A";
      document.getElementById("planet-gravity").textContent =
        `${planet.gravity ?? "N/A"} m/s²`;
      document.getElementById("planet-density").textContent =
        `${planet.density ?? "N/A"} g/cm³`;
      document.getElementById("planet-radius").textContent =
        `${planet.meanRadius} km`;
      document.getElementById("planet-moons").textContent = planet.moons
        ? planet.moons.length
        : 0;

      document.getElementById("planet-discoverer").textContent =
        planet.discoveredBy || "Known since antiquity";
      document.getElementById("planet-discovery-date").textContent =
        planet.discoveryDate || "Ancient";
      document.getElementById("planet-eccentricity").textContent =
        planet.eccentricity;
      document.getElementById("planet-inclination").textContent =
        `${planet.inclination}°`;
      document.getElementById("planet-axial-tilt").textContent =
        `${planet.axialTilt}°`;
      document.getElementById("planet-escape").textContent = planet.escape
        ? `${(planet.escape / 1000).toFixed(2)} km/s`
        : "N/A";

      // تغيير صورة الكوكب بناءً على الاسم
      document.getElementById("planet-detail-image").src =
        planetImagePaths[planet.englishName.toLowerCase()] || "";
    };

    const planetsGrid = document.getElementById("planets-grid");
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

    // تفعيل الضغط على كروت الكواكب بعد إنشائها من بيانات API
    const planetCards = document.querySelectorAll(".planet-card");
    planetCards.forEach((card) => {
      card.addEventListener("click", () => {
        const planetId = card.getAttribute("data-planet-id");
        updatePlanetDetails(planetId);
      });
    });
  } catch (error) {
    console.error("Error fetching Planets:", error);
  }
}

// ==========================================
// 5. تهيئة تشغيل الأقسام عند تحميل الصفحة
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
  const navLinks = document.querySelectorAll(".nav-link[data-section]");
  const sections = document.querySelectorAll(".app-section[data-section]");
  const sidebar = document.getElementById("sidebar");
  const sidebarToggle = document.getElementById("sidebar-toggle");

  const showSection = (sectionId) => {
    const sectionExists = [...sections].some(
      (section) => section.dataset.section === sectionId,
    );
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
