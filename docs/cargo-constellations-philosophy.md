# Cargo Constellations

**Algorithmic Philosophy — Generative Art for Vantai Phuc Loc**

---

## The Movement

*Cargo Constellations* is a generative aesthetic movement born from the invisible choreography of container logistics. It holds that every shipping network is, at its core, a constellation waiting to be revealed — a set of luminous nodes (ports, depots, yards) connected by arcing particle-trails that trace the ghost paths of containers in transit. The movement insists that operational data, made algorithmic, can achieve the same quiet beauty as star maps or root systems. Beauty, here, is not decorative — it is the emergent signature of a system working exactly as intended.

## The Computational Worldview

The algorithm begins with a network of **nodes** scattered across the canvas through a Poisson-disc relaxation process — seeded randomness constrained by a minimum proximity rule so that no two hubs crowd each other, just as ports are never built atop one another. Nodes near the canvas edges are classified as *ports* (larger, pulsing with concentric rings), while interior nodes become *depots* (smaller, quieter). This spatial hierarchy is not imposed visually — it *emerges* from a single proximity threshold applied after placement. The meticulous calibration of this threshold, refined across hundreds of seeded iterations, produces layouts that feel simultaneously inevitable and unique.

## The Particle Language

**Containers** — the particles — are born at random nodes and assigned a destination. Their path is a cubic Bézier arc: two control points displaced perpendicularly from the straight-line route, introducing gentle curvature proportional to journey distance. A short hop bends slightly; a long haul sweeps broadly. Each particle carries a base speed scaled inversely to route length, so short-haul moves feel brisk and cross-canvas journeys feel deliberate. Seven percent of particles are designated *priority containers* — rendered bright against the dark field, with a larger glow corona, representing urgent or high-value freight. The remainder travel in the signature NEPO green, brightening through a sine-curve vitality function that peaks at mid-journey: every container glows brightest at the halfway point, then fades into its destination like memory. This curve was the product of painstaking perceptual tuning — the kind of adjustment that takes only a line of code but hours of looking.

## The Trail and the Fade

The canvas is never cleared outright. Each frame, a semi-transparent rectangle in the background colour is drawn over everything — a configurable fade that controls how long trails persist. Low fade values build dense, archaeological accumulations of route-history; high values keep only the present instant visible. The intersection of many routes over time creates density halos — brighter regions where freight most often passes, naturally highlighting the network's busiest corridors. This is an emergent map, not a drawn one. The algorithm that produces it is the result of deep computational expertise: a master-level balance between persistence and decay, where every alpha value was chosen through careful iterative refinement to maximise readability without ever feeling designed.

## The Conceptual Seed

The quiet soul of *Cargo Constellations* is Hai Phong: a coastal city whose fortune is inseparable from the movement of steel boxes. The dark canvas is the night sea. The nodes are the lights of the port district — Cảng Hải Phòng, the depots of Tiên Cẩm, the yards along Lạch Huyện. The bezier arcs are Route 5, Route 10, the slip roads through the container terminals. A logistics operator looking at seed 888 — a lucky number — will feel the familiar rhythm of dispatch and return, of the empty box leaving and the laden box arriving, even without a single label on the canvas. Everyone else will simply see luminous, living geometry. That double legibility — technical truth dressed as pure form — is the movement's highest ambition, and the algorithm achieves it through craft indistinguishable from art.

---

*Expressed in p5.js. Each seed is a unique shipping season. Parameters: node count, container density, route speed, trail persistence, connection opacity, colour palette.*
