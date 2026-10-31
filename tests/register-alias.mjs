// Registers the `@/…` alias hook before the test runner loads any app module.
import { register } from "node:module";

register("./alias-loader.mjs", import.meta.url);
