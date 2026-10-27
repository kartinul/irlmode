import { expect, test } from "bun:test";
import { iou, scoreLevel, surfaceError } from "./score.js";

test("IoU of half-overlapping Boxes is 1/3", () => {
  expect(iou([0, 0, 2, 1], [1, 0, 3, 1])).toBeCloseTo(1 / 3);
  expect(iou([0, 0, 1, 1], [2, 2, 3, 3])).toBe(0);
});

test("Surface error is the mean height gap at 5 points along the true edge", () => {
  expect(surfaceError([[0, 0.5], [1, 0.5]], [[0, 0.6], [1, 0.4]])).toBeCloseTo(0.06);
  expect(surfaceError([[0.2, 0.3], [0.4, 0.5]], [[0, 0.1], [1, 0.7]])).toBeCloseTo(0.12);
});

test("scores each truth Prop against the best Prop with a matching Label", () => {
  const truth = { props: [
    { label: "mouse", match: "mouse", box: [0, 0, 1, 1] },
    { label: "desk edge", match: "desk", surface: [[0, 0.5], [1, 0.5]] },
    { label: "cat", match: "cat", box: [0, 0, 1, 1] },
  ] };
  const level = { props: [
    { label: "computer mouse", role: "coin", box: [0, 0, 1, 0.5] },
    { label: "desk", role: "platform", box: [0, 0.5, 1, 1], surface: [[0, 0.52], [1, 0.52]] },
  ] };
  expect(scoreLevel(level, truth)).toEqual([
    { label: "mouse", iou: 0.5 },
    { label: "desk edge", surfaceError: expect.closeTo(0.02) },
    { label: "cat", iou: 0 },
  ]);
});
