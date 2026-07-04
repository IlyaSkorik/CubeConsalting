import {
  Group,
  InstancedMesh,
  Matrix4,
  Object3D,
  Quaternion,
  Vector3,
  type BufferGeometry,
  type Material,
} from 'three';
import { CUBE, SCALE_MIN } from '../config/tokens';
import type { Disposable, Updatable } from '../core/types';
import { createCubeletGeometry } from './CubeletGeometry';

export interface CubeConfig {
  subdivisions: number;
  cubeletSize: number;
  gap: number;
  bevelRadius: number;
  scale: number;
}

export interface GridCoord {
  x: number;
  y: number;
  z: number;
}

/**
 * A single addressable cubelet. Modules read `home`/`grid` and write the
 * `target*` fields; the cube damps current → target every frame. Objects are
 * allocated once at build time, never inside the render loop (Performance §13).
 */
export interface Cubelet {
  readonly index: number;
  readonly grid: GridCoord;
  readonly home: Vector3;
  readonly position: Vector3;
  readonly quaternion: Quaternion;
  readonly scale: Vector3;
  readonly targetPosition: Vector3;
  readonly targetQuaternion: Quaternion;
  readonly targetScale: Vector3;
}

const DEFAULT_LAMBDA = 6;

/**
 * The one cube. A procedurally generated field of instanced cubelets that never
 * gets replaced — it only reconfigures (Architecture §5, Stage 2 "Procedural Cube").
 * Modules mutate cubelet targets to morph it into Network / Grid / Data / etc.
 */
export class ProceduralCube implements Updatable, Disposable {
  readonly object = new Group();
  readonly cubelets: Cubelet[] = [];

  private mesh!: InstancedMesh;
  private geometry!: BufferGeometry;
  private readonly material: Material;
  private config: CubeConfig;
  private lambda = DEFAULT_LAMBDA;

  private readonly scratchMatrix = new Matrix4();
  private readonly gridIndex = new Map<string, Cubelet>();

  constructor(material: Material, config: Partial<CubeConfig> = {}) {
    this.material = material;
    this.config = {
      subdivisions: config.subdivisions ?? CUBE.subdivisions,
      cubeletSize: config.cubeletSize ?? CUBE.cubeletSize,
      gap: config.gap ?? CUBE.gap,
      bevelRadius: config.bevelRadius ?? CUBE.bevelRadius,
      scale: config.scale ?? CUBE.scale,
    };
    this.object.name = 'CubLabProceduralCube';
    this.build();
  }

  get count(): number {
    return this.cubelets.length;
  }

  getCubelet(index: number): Cubelet | undefined {
    return this.cubelets[index];
  }

  getByGrid(x: number, y: number, z: number): Cubelet | undefined {
    return this.gridIndex.get(ProceduralCube.gridKey(x, y, z));
  }

  /** True for cubelets on the outer shell of the assembled cube. */
  isSurface(cubelet: Cubelet): boolean {
    const max = this.config.subdivisions - 1;
    const { x, y, z } = cubelet.grid;
    return x === 0 || y === 0 || z === 0 || x === max || y === max || z === max;
  }

  setDampingLambda(lambda: number): void {
    this.lambda = lambda;
  }

  /** Return every cubelet to its resting lattice position (Idle / home pose). */
  resetToHome(): void {
    for (const c of this.cubelets) {
      c.targetPosition.copy(c.home);
      c.targetQuaternion.identity();
      c.targetScale.setScalar(1);
    }
  }

  /** Runtime subdivision change — the object stays, its topology regenerates. */
  rebuild(subdivisions: number): void {
    if (subdivisions === this.config.subdivisions) return;
    this.config = { ...this.config, subdivisions };
    this.teardownMesh();
    this.build();
  }

  update(delta: number): void {
    const { lambda } = this;
    const alpha = 1 - Math.exp(-lambda * delta);
    const mesh = this.mesh;
    for (let i = 0; i < this.cubelets.length; i++) {
      const c = this.cubelets[i];
      c.position.lerp(c.targetPosition, alpha);
      c.quaternion.slerp(c.targetQuaternion, alpha);
      c.scale.lerp(c.targetScale, alpha);
      const s = c.scale;
      this.scratchMatrix.compose(
        c.position,
        c.quaternion,
        this.tmpScale.set(Math.max(s.x, SCALE_MIN), Math.max(s.y, SCALE_MIN), Math.max(s.z, SCALE_MIN)),
      );
      mesh.setMatrixAt(i, this.scratchMatrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }

  dispose(): void {
    this.teardownMesh();
    this.cubelets.length = 0;
    this.gridIndex.clear();
  }

  private readonly tmpScale = new Vector3(1, 1, 1);

  private build(): void {
    const { subdivisions, cubeletSize, gap, bevelRadius, scale } = this.config;
    const step = cubeletSize + gap;
    const offset = ((subdivisions - 1) * step) / 2;

    this.geometry = createCubeletGeometry(cubeletSize, bevelRadius);
    const total = subdivisions ** 3;
    this.mesh = new InstancedMesh(this.geometry, this.material, total);
    this.mesh.name = 'CubeletInstances';
    this.mesh.frustumCulled = false;
    this.object.scale.setScalar(scale);

    const seed = new Object3D();
    let index = 0;
    for (let x = 0; x < subdivisions; x++) {
      for (let y = 0; y < subdivisions; y++) {
        for (let z = 0; z < subdivisions; z++) {
          const home = new Vector3(x * step - offset, y * step - offset, z * step - offset);
          const cubelet: Cubelet = {
            index,
            grid: { x, y, z },
            home,
            position: home.clone(),
            quaternion: new Quaternion(),
            scale: new Vector3(1, 1, 1),
            targetPosition: home.clone(),
            targetQuaternion: new Quaternion(),
            targetScale: new Vector3(1, 1, 1),
          };
          seed.position.copy(home);
          seed.updateMatrix();
          this.mesh.setMatrixAt(index, seed.matrix);
          this.cubelets.push(cubelet);
          this.gridIndex.set(ProceduralCube.gridKey(x, y, z), cubelet);
          index++;
        }
      }
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    this.object.add(this.mesh);
  }

  private teardownMesh(): void {
    this.object.remove(this.mesh);
    this.geometry.dispose();
    this.mesh.dispose();
    this.cubelets.length = 0;
    this.gridIndex.clear();
  }

  private static gridKey(x: number, y: number, z: number): string {
    return `${x},${y},${z}`;
  }
}
