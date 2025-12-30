(() => {
  const RANGE = "24h";
  const REFRESH_MS = 5000;

  const API_LATEST = "/api/readings/latest";
  const API_HISTORY = `/api/readings?range=${encodeURIComponent(RANGE)}`;

  const elTemp = document.getElementById("temp");
  const elHum = document.getElementById("hum");
  const elWind = document.getElementById("wind");
  const elNoise = document.getElementById("noise");
  const elLastUpdated = document.getElementById("lastUpdated");
  const elChartStatus = document.getElementById("chartStatus");
  const btnRefresh = document.getElementById("refreshBtn");

  let isFetching = false;

  function asNumberOrNull(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  function formatLocalDateTime(isoString) {
    if (!isoString) return "--";

    const cleaned = typeof isoString === "string" ? isoString.replace(" ", "T") : isoString;
    const d = new Date(cleaned);

    if (Number.isNaN(d.getTime())) return "--";
    return d.toLocaleString();
  }

  async function safeJsonFetch(url) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`HTTP ${res.status} for ${url}. ${text}`);
    }
    return await res.json();
  }

  google.charts.load("current", { packages: ["corechart"] });
  google.charts.setOnLoadCallback(init);

  function init() {
    if (btnRefresh) {
      btnRefresh.addEventListener("click", () => fetchAndRender().catch(() => {}));
    }

    fetchAndRender().catch(() => {});
    setInterval(() => fetchAndRender().catch(() => {}), REFRESH_MS);
  }

  async function fetchAndRender() {
    if (isFetching) return;
    isFetching = true;

    try {
      if (elChartStatus) elChartStatus.textContent = "Loading chart data...";
      await Promise.all([updateLive(), updateChart()]);
      if (elChartStatus) elChartStatus.textContent = "";
    } catch (err) {
      console.error(err);
      if (elChartStatus) elChartStatus.textContent = `Error: ${err.message || err}`;
    } finally {
      isFetching = false;
    }
  }

  async function updateLive() {
    const latest = await safeJsonFetch(API_LATEST);

    if (elTemp) elTemp.textContent = asNumberOrNull(latest.temperature) ?? "--";
    if (elHum) elHum.textContent = asNumberOrNull(latest.humidity) ?? "--";
    if (elWind) elWind.textContent = asNumberOrNull(latest.windSpeed) ?? "--";
    if (elNoise) elNoise.textContent = asNumberOrNull(latest.noiseLevel) ?? "--";

    if (elLastUpdated) {
      elLastUpdated.textContent = `Last updated: ${formatLocalDateTime(latest.timestamp)}`;
    }
  }

  async function updateChart() {
    const raw = await safeJsonFetch(API_HISTORY);

    const rows = Array.isArray(raw) ? raw : (raw.data || []);

    const dataClean = rows
      .map(r => {
        const ts = (r.timestamp || "").toString().replace(" ", "T");
        const time = new Date(ts);

        return {
          time,
          t: asNumberOrNull(r.temperature),
          h: asNumberOrNull(r.humidity),
          w: asNumberOrNull(r.windSpeed),
          n: asNumberOrNull(r.noiseLevel),
        };
      })
      .filter(r => r.time instanceof Date && !Number.isNaN(r.time.getTime()));

    if (!dataClean.length) {
      if (elChartStatus) elChartStatus.textContent = "No data returned for the selected range.";
      ["chartTemp", "chartHum", "chartWindNoise", "chartSummary"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = "";
      });
      return;
    }

    const dtTemp = new google.visualization.DataTable();
    dtTemp.addColumn("datetime", "Time");
    dtTemp.addColumn("number", "Temperature (°C)");
    dtTemp.addRows(dataClean.map(r => [r.time, r.t]));

    new google.visualization.LineChart(
      document.getElementById("chartTemp")
    ).draw(dtTemp, {
      height: 300,
      legend: { position: "none" },
      title: "Temperature (24h)",
      chartArea: { left: 60, right: 20, top: 40, bottom: 50 }
    });

    const dtHum = new google.visualization.DataTable();
    dtHum.addColumn("datetime", "Time");
    dtHum.addColumn("number", "Humidity (%)");
    dtHum.addRows(dataClean.map(r => [r.time, r.h]));

    new google.visualization.LineChart(
      document.getElementById("chartHum")
    ).draw(dtHum, {
      height: 300,
      legend: { position: "none" },
      title: "Humidity (24h)",
      chartArea: { left: 60, right: 20, top: 40, bottom: 50 }
    });

    const dtWN = new google.visualization.DataTable();
    dtWN.addColumn("datetime", "Time");
    dtWN.addColumn("number", "Wind Speed (km/h)");
    dtWN.addColumn("number", "Noise Level (dB)");
    dtWN.addRows(dataClean.map(r => [r.time, r.w, r.n]));

    new google.visualization.LineChart(
      document.getElementById("chartWindNoise")
    ).draw(dtWN, {
      height: 320,
      title: "Wind & Noise (24h)",
      legend: { position: "bottom" },
      chartArea: { left: 60, right: 40, top: 40, bottom: 60 }
    });

    function stats(arr) {
      const v = arr.filter(Number.isFinite);
      if (!v.length) return [null, null, null];
      const min = Math.min(...v);
      const avg = v.reduce((a, b) => a + b, 0) / v.length;
      const max = Math.max(...v);
      return [min, avg, max];
    }

    const sT = stats(dataClean.map(r => r.t));
    const sH = stats(dataClean.map(r => r.h));
    const sW = stats(dataClean.map(r => r.w));
    const sN = stats(dataClean.map(r => r.n));

    const dtSum = new google.visualization.DataTable();
    dtSum.addColumn("string", "Metric");
    dtSum.addColumn("number", "Min");
    dtSum.addColumn("number", "Avg");
    dtSum.addColumn("number", "Max");

    dtSum.addRows([
      ["Temperature (°C)", ...sT],
      ["Humidity (%)", ...sH],
      ["Wind (km/h)", ...sW],
      ["Noise (dB)", ...sN]
    ]);

    new google.visualization.ColumnChart(
      document.getElementById("chartSummary")
    ).draw(dtSum, {
      height: 360,
      title: "24h Summary (Min / Avg / Max)",
      legend: { position: "bottom" },
      chartArea: { left: 90, right: 20, top: 50, bottom: 60 }
    });
  }
})();
