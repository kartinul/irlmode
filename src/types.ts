export type Point = [x: number, y: number]
export type Box = [x0: number, y0: number, x1: number, y1: number]
export type Role = "platform" | "hazard" | "coin" | "bouncy" | "wind" | "exit"
export type Wind = "left" | "right" | "up" | "down"

export type Prop = {
  label: string
  role: Role
  box: Box
  layer: number
  surface?: [Point, Point]
  wind?: Wind
}

export type Level = { name: string; props: Prop[] }
