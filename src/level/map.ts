/** Parses a Tiled .tmj (object layers only) into typed level data. Pure, unit-testable. */

export type PropValue = string | number | boolean;

export interface MapObject {
  id: number;
  type: string;
  x: number;
  y: number;
  w: number;
  h: number;
  point: boolean;
  props: Record<string, PropValue>;
}

export interface LevelMap {
  worldWidth: number;
  spawnX: number;
  spawnY: number;
  finishX: number;
  groundY: number;
  layers: Record<string, MapObject[]>;
}

interface TiledProp {
  name: string;
  value: PropValue;
}
interface TiledObject {
  id: number;
  type?: string;
  class?: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  point?: boolean;
  properties?: TiledProp[];
}
interface TiledLayer {
  name: string;
  type: string;
  objects?: TiledObject[];
}
export interface TiledMap {
  properties?: TiledProp[];
  layers: TiledLayer[];
}

const toProps = (list?: TiledProp[]): Record<string, PropValue> =>
  Object.fromEntries((list ?? []).map((p) => [p.name, p.value]));

export function parseMap(json: TiledMap): LevelMap {
  const mp = toProps(json.properties);
  const layers: Record<string, MapObject[]> = {};
  for (const l of json.layers) {
    if (l.type !== 'objectgroup') continue;
    layers[l.name] = (l.objects ?? []).map((o) => ({
      id: o.id,
      type: o.type ?? o.class ?? '',
      x: o.x,
      y: o.y,
      w: o.width ?? 0,
      h: o.height ?? 0,
      point: !!o.point,
      props: toProps(o.properties),
    }));
  }
  const num = (k: string, d: number): number => (typeof mp[k] === 'number' ? (mp[k] as number) : d);
  return {
    worldWidth: num('worldWidth', 7400),
    spawnX: num('spawnX', 80),
    spawnY: num('spawnY', 400),
    finishX: num('finishX', 7240),
    groundY: num('groundY', 460),
    layers,
  };
}

/** All objects of a type across layers. */
export function objectsOf(m: LevelMap, type: string): MapObject[] {
  return Object.values(m.layers).flatMap((l) => l.filter((o) => o.type === type));
}

export const num = (o: MapObject, k: string, d = 0): number =>
  typeof o.props[k] === 'number' ? (o.props[k] as number) : d;
export const str = (o: MapObject, k: string, d = ''): string =>
  typeof o.props[k] === 'string' ? (o.props[k] as string) : d;
export const bool = (o: MapObject, k: string): boolean => o.props[k] === true;
