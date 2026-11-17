const HORIZONS_ENDPOINT = "https://ssd.jpl.nasa.gov/api/horizons.api";

const TARGETS = [
  { key:"Mercury", id:"199" },
  { key:"Venus", id:"299" },
  { key:"Earth", id:"399" },
  { key:"Mars", id:"499" },
  { key:"Jupiter", id:"599" },
  { key:"Saturn", id:"699" },
  { key:"Uranus", id:"799" },
  { key:"Neptune", id:"899" },
  { key:"Moon", id:"301" }
];

function formatHorizonsTime(date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone:"UTC",
    year:"numeric",
    month:"short",
    day:"2-digit",
    hour:"2-digit",
    minute:"2-digit",
    second:"2-digit",
    hourCycle:"h23"
  }).formatToParts(date);
  const values = {};
  parts.forEach(part => { if (part.type !== "literal") values[part.type] = part.value; });
  return values.year + "-" + values.month + "-" + values.day + " " +
    values.hour + ":" + values.minute + ":" + values.second;
}

function readVector(result) {
  const axes = ["X", "Y", "Z"];
  const vector = {};
  for (const axis of axes) {
    const expression = new RegExp("\\b" + axis + "\\s*=\\s*([-+]?(?:\\d+\\.?\\d*|\\.\\d+)(?:[Ee][-+]?\\d+)?)", "i");
    const match = expression.exec(result);
    if (!match) throw new Error("Horizons response did not contain vector axis " + axis + ".");
    const value = Number(match[1]);
    if (!Number.isFinite(value)) throw new Error("Horizons returned a non-finite vector component.");
    vector[axis.toLowerCase()] = value;
  }
  return vector;
}

async function fetchTarget(target, timeString) {
  const parameters = new URLSearchParams({
    format:"json",
    COMMAND:"'" + target.id + "'",
    OBJ_DATA:"NO",
    MAKE_EPHEM:"YES",
    EPHEM_TYPE:"VECTORS",
    CENTER:"'500@10'",
    REF_PLANE:"ECLIPTIC",
    REF_SYSTEM:"ICRF",
    TIME_TYPE:"UT",
    TLIST:"'" + timeString + "'",
    VEC_TABLE:"1",
    VEC_CORR:"NONE",
    OUT_UNITS:"AU-D"
  });
  const response = await fetch(HORIZONS_ENDPOINT + "?" + parameters.toString(), {
    headers:{ Accept:"application/json" },
    signal:AbortSignal.timeout(8500)
  });
  if (!response.ok) throw new Error("NASA/JPL Horizons returned HTTP " + response.status + ".");
  const payload = await response.json();
  if (payload.error) throw new Error(payload.error);
  if (typeof payload.result !== "string") throw new Error("NASA/JPL Horizons returned an incomplete result.");
  return [target.key, readVector(payload.result)];
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "public, s-maxage=40, stale-while-revalidate=20");
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error:"Method not allowed." });
  }

  const rawTime = Array.isArray(req.query?.time) ? req.query.time[0] : req.query?.time;
  const requestedDate = rawTime ? new Date(rawTime) : new Date();
  if (!Number.isFinite(requestedDate.getTime()) || Math.abs(Date.now() - requestedDate.getTime()) > 7 * 86400000) {
    return res.status(400).json({ error:"The requested ephemeris time is invalid or outside the allowed range." });
  }

  const timeString = formatHorizonsTime(requestedDate);
  try {
    const entries = await Promise.all(TARGETS.map(target => fetchTarget(target, timeString)));
    const positions = Object.fromEntries(entries);
    return res.status(200).json({
      source:"NASA/JPL Horizons",
      referencePlane:"ECLIPTIC",
      coordinateOrigin:"SUN CENTER",
      units:"AU",
      epoch:requestedDate.toISOString(),
      positions
    });
  } catch (error) {
    console.error("TCS NASA/JPL ephemeris request failed:", error?.message || error);
    return res.status(502).json({ error:"NASA/JPL ephemeris is temporarily unavailable." });
  }
}
