import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const rootDirectory = join(dirname(fileURLToPath(import.meta.url)), "..");
const packagePaths = [
  "packages/types/package.json",
  "packages/core/package.json",
  "packages/react/package.json",
];
const packages = packagePaths.map((packagePath) => ({
  path: packagePath,
  version: JSON.parse(readFileSync(join(rootDirectory, packagePath), "utf8"))
    .version,
}));
const expectedVersion = packages[0].version;
const changelog = readFileSync(join(rootDirectory, "CHANGELOG.md"), "utf8");
const changelogVersion = changelog.match(/^## \[([^\]]+)]/m)?.[1];
const errors = [];

if (packages.some(({ version }) => version !== expectedVersion)) {
  errors.push(
    `publishable package versions must match:\n${packages
      .map(({ path, version }) => `  ${path}: ${version}`)
      .join("\n")}`
  );
}

if (changelogVersion !== expectedVersion) {
  errors.push(
    `top CHANGELOG.md version must match ${expectedVersion}; found ${changelogVersion ?? "no release heading"}`
  );
}

if (errors.length > 0) {
  console.error(`Release check failed:\n${errors.join("\n")}`);
  process.exitCode = 1;
} else {
  console.log(`Release check passed for version ${expectedVersion}.`);
}
