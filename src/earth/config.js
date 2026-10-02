// All visual tunables in one place. Colors are sRGB hex (converted to linear in code).
export const config = {
  camera: {
    fov: 20, // vertical, degrees (16:10 reference); widened automatically on narrow screens
    // scroll keyframes: 0 = close-up over the horizon (full_picture.png), 1 = whole globe in space
    start: { dist: 1.6001, pitchK: 0.964, lat: 25, lon: 58 },
    end: { fill: 0.34, pitchK: 0.0, lat: 32, lon: 60 }, // fill: globe radius / half of the smaller screen side
    spin: 38, // degrees the globe turns counter-clockwise (seen from the North Pole) over the scroll
  },
  light: {
    // sun direction relative to the camera rig: elev = degrees above the horizon seen from the point under the
    // camera (negative = behind the planet), x = sideways push (negative = from the left)
    start: { x: 0.0, elev: 2.4 },
    end: { x: -0.75, elev: -12, viewPow: 2.4, intensity: 2.6, cloudViewPow: 1.2 },
  },
  // darkening while the globe recedes: values at the end of the scroll (1 = no change)
  fade: {
    from: 0.35, // scroll progress where darkening starts
    brightness: 0.36,
    relief: 0.28, // contour contrast
    clouds: 0.5,
    atmosphere: 0.7,
  },
  terrain: {
    freq: 6.2,
    gain: 0.34,
    warpFreq: 1.4,
    warpAmt: 0.06,
    levels: 21,
    ridgeWidth: 0.12,
    ridgeSlope: 1.4,
    ridgeSharp: 1.0,
    even: 0.0, // 0 = raw contours, 1 = evenly spaced lines
    aaWidth: 0.7, // ridge never thinner than this many level-units per pixel
    aaFade: 0.8, // how fast ridges fade when contours get denser than pixels
    minSpacing: 6, // device px; denser contours are thinned out level-of-detail style (no moire, crisp far globe)
    aaMin: 2.2, // device px; below this line spacing ridges fade into an even tone
    ssBelow: 14, // device px; where visible lines are closer than this, shading is supersampled 4x
    ssSpread: 1.25, // sub-pixel sample footprint (1 = one pixel; a bit wider is calmer in motion)
  },
  earth: {
    albedo: '#ffffff',
    lightIntensity: 3.2,
    viewPow: 5.6,
    viewBumpMix: 0.25,
    termSoft: 0.06,
    ambient: 0.004,
    hazeColor: '#dfe3e8',
    hazeAmount: 0.18,
    hazePow: 9.0,
    knee: 0.55,
  },
  clouds: {
    enabled: true,
    radius: 1.011,
    freq: 6.5,
    warp: 0.4,
    cover: 0.2,
    soft: 0.28,
    detail: 1.0,
    stretch: [1.0, 1.15, 1.0],
    macro: 0.28, // large-scale clear/overcast regions
    macroFreq: 1.3,
    density: 0.3,
    opacity: 0.92,
    bright: 1.5,
    viewPow: 2.0,
    ambient: 0.02,
    puff: 3.0, // self-shadowing strength (lit cloud tops)
    lightStep: 0.012,
    max: 0.95,
    color: '#ffffff',
    shadow: 0.55,
    drift: 0.004, // radians per second relative to the ground
  },
  atmosphere: {
    color: '#e9edf2',
    rimAmount: 0.85,
    rimWidth: 0.008,
    haloAmount: 0.02,
    haloWidth: 0.1,
    sideMin: 0.25,
  },
  markers: {
    radius: 1.0045,
    size: 0.0012, // core diameter in earth radii
    minPx: 0.95, // CSS px
    maxPx: 2.6,
    glowScale: 4,
    glowAmount: 0.32,
    glowFalloff: 1.15,
    coreBoost: 2.1,
    coreColor: '#ffcf96',
    glowColor: '#ff8a2a',
    hoverColor: '#ffffff',
    twinkle: 0.18,
    farGain: 0.4, // marker brightness when the globe is far away
  },
  post: {
    bloomStrength: 0.22,
    bloomRadius: 0.2,
    bloomThreshold: 1.0,
    grain: 0.035,
    vignette: 0.35,
    exposure: 1.0,
  },
  quality: {
    maxDpr: 2,
    minDpr: 1,
    targetFps: 50,
    segments: 384,
  },
};
