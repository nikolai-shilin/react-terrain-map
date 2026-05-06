import { SceneOptions, TerrainSceneApi } from './types';
/**
 * Create a terrain scene attached to the given container element. The scene
 * appends its own canvas, listens for container resizes, and exposes async
 * methods for loading locations and updating vertical exaggeration.
 */
export declare function createTerrainScene(container: HTMLElement, options?: SceneOptions): TerrainSceneApi;
