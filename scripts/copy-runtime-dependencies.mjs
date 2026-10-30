import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";

// Forge's Vite plugin excludes node_modules. External packages must be copied
// explicitly, including dependencies and the standalone cosmetic-filter preload.
export async function copyRuntimeDependencies(packageName, sourceRoot, destinationRoot) {
  async function copy(name, resolveFrom, installInto, ancestors) {
    const require = createRequire(path.join(resolveFrom, "package.json"));
    const manifestPath = require.resolve(`${name}/package.json`);
    const source = await fs.realpath(path.dirname(manifestPath));
    if (ancestors.has(source)) return; // Node will resolve a cycle from its ancestor.
    const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
    const destination = path.join(installInto, "node_modules", name);
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.cp(source, destination, {
      recursive: true,
      dereference: true,
      filter: file => path.basename(file) !== "node_modules"
    });
    const nextAncestors = new Set([...ancestors, source]);
    await Promise.all(Object.keys(manifest.dependencies ?? {}).map(dependency =>
      copy(dependency, source, destination, nextAncestors)
    ));
  }

  await copy(packageName, sourceRoot, destinationRoot, new Set());
}
