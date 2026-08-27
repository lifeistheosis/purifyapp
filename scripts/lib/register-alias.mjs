// Registers the "@/" resolver in scripts/lib/alias-hooks.mjs.
// Use with:  node --experimental-strip-types --import ./scripts/lib/register-alias.mjs <script>
import { register } from "node:module";

register("./alias-hooks.mjs", import.meta.url);
