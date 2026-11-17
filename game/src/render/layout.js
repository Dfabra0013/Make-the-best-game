// The stage: Wispwood is drawn at one fixed size and every scene places things in
// these pixels, so a screenshot is the same frame on any machine. The horizon
// separates the sky the game is played under from the meadow it is played on, and
// the field is the part of the meadow a body may occupy.

export const STAGE = {
  width: 1280,
  height: 800,
  horizonY: 248,
  fieldTop: 300,
  fieldBottom: 768,
  fieldLeft: 44,
  fieldRight: 1236,
};

/** Clamps a point into the meadow, with a margin for a body of the given radius. */
export function keepInField(x, y, radius = 0) {
  return {
    x: Math.min(STAGE.fieldRight - radius, Math.max(STAGE.fieldLeft + radius, x)),
    y: Math.min(STAGE.fieldBottom - radius, Math.max(STAGE.fieldTop + radius, y)),
  };
}

/** True when a point is on the meadow rather than in the sky. */
export function inField(x, y) {
  return y >= STAGE.fieldTop - 8;
}

/** A point at a fraction of the stage, handy for laying out a scene. */
export function at(fx, fy) {
  return { x: STAGE.width * fx, y: STAGE.height * fy };
}
