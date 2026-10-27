import { readLevel } from "../src/level.js";

if (import.meta.main) {
  const truth = await Bun.file("fixtures/desk.truth.json").json();
  const snap = await Bun.file("fixtures/desk.jpg").arrayBuffer();
  for (let run = 1; run <= 3; run++) {
    const started = performance.now();
    const level = await readLevel(snap);
    const ms = Math.round(performance.now() - started);
    console.log(`run ${run}: ${ms} ms, "${level.name}"`);
    for (const { label, iou, surfaceError } of scoreLevel(level, truth))
      console.log(`  ${label.padEnd(10)} ${iou === undefined ? `surface error ${(surfaceError * 100).toFixed(1)}%` : `IoU ${iou.toFixed(2)}`}`);
    if (process.argv.includes("--save")) await Bun.write("fixtures/desk.level.json", JSON.stringify(level, null, 2) + "\n");
  }
}

export function iou([ax0, ay0, ax1, ay1], [bx0, by0, bx1, by1]) {
  const overlap = Math.max(0, Math.min(ax1, bx1) - Math.max(ax0, bx0)) * Math.max(0, Math.min(ay1, by1) - Math.max(ay0, by0));
  return overlap / ((ax1 - ax0) * (ay1 - ay0) + (bx1 - bx0) * (by1 - by0) - overlap);
}

const heightAt = ([[ax, ay], [bx, by]], x) => (bx === ax ? (ay + by) / 2 : ay + ((x - ax) / (bx - ax)) * (by - ay));

export function surfaceError(truth, surface) {
  const [[x0], [x1]] = truth;
  const xs = [0, 0.25, 0.5, 0.75, 1].map((t) => x0 + t * (x1 - x0));
  return xs.reduce((sum, x) => sum + Math.abs(heightAt(truth, x) - heightAt(surface, x)), 0) / xs.length;
}

export function scoreLevel(level, truth) {
  return truth.props.map(({ label, match, box, surface }) => {
    const candidates = level.props.filter((prop) => new RegExp(match, "i").test(prop.label));
    if (box) return { label, iou: Math.max(0, ...candidates.map((prop) => iou(box, prop.box))) };
    const errors = candidates.filter((prop) => prop.surface).map((prop) => surfaceError(surface, prop.surface));
    return { label, surfaceError: Math.min(1, ...errors) };
  });
}
