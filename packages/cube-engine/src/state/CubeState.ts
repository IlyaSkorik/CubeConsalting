/** The finite set of forms the one cube can occupy (Creative Direction §2). */
export type CubeStateName =
  | 'idle'
  | 'assembly'
  | 'network'
  | 'grid'
  | 'data'
  | 'transition';

/** States backed by a registered module. 'transition' is owned by the state machine itself. */
export type ModuleStateName = Exclude<CubeStateName, 'transition'>;

export const CUBE_STATES: readonly CubeStateName[] = [
  'idle',
  'assembly',
  'network',
  'grid',
  'data',
  'transition',
];
