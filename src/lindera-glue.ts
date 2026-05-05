/**
 * Lindera-wasm Cloudflare Workers 用 init glue。
 *
 * `lindera-wasm-bundler` パッケージのエントリ `lindera_wasm.js` は webpack 流の
 *   `import * as wasm from "./lindera_wasm_bg.wasm"; wasm.__wbindgen_start()`
 * 慣習で書かれており、Workers の wasm import(WebAssembly.Module を返す)とは
 * 非互換("wasm.__wbindgen_start is not a function" runtime エラー)。
 *
 * Workers では import した .wasm は `WebAssembly.Module` なので、明示的に
 * `new WebAssembly.Instance(module, imports)` で同期 instantiate する必要がある。
 * imports namespace は wasm-bindgen の出力に合わせて `./lindera_wasm_bg.js`。
 *
 * この glue は bundler entry をスキップして bg(全 binding 実装 + __wbg_set_wasm)
 * を直接利用、明示 instantiate 後に Tokenizer / loadDictionaryFromBytes 等を
 * re-export する。
 */

// 注意: package.json の exports field が "." と "./opfs" のみ許可している。
// `lindera-wasm-bundler/lindera_wasm_bg.js` 形式のサブパス import は弾かれるため、
// node_modules への相対パス直接指定で迂回する(esbuild は relative import を素通し)。
// @ts-expect-error — Workers / wrangler が .wasm を WebAssembly.Module として import
import wasmModule from "../node_modules/lindera-wasm-bundler/lindera_wasm_bg.wasm";
// @ts-expect-error — relative path import で exports field を bypass
import * as bg from "../node_modules/lindera-wasm-bundler/lindera_wasm_bg.js";

// 同期 instantiate(Module は事前 compile 済、Workers の startup phase で許可される)
const instance = new WebAssembly.Instance(wasmModule as WebAssembly.Module, {
  "./lindera_wasm_bg.js": bg as unknown as WebAssembly.ModuleImports,
});

// wasm-bindgen 規約: bg 側のクロージャに wasm exports を注入
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(bg as any).__wbg_set_wasm(instance.exports);

// __wbindgen_start は wasm 側の初期化関数(あれば呼ぶ、現バージョンは ABI 上 export)
const exp = instance.exports as Record<string, unknown> & {
  __wbindgen_start?: () => void;
};
if (typeof exp.__wbindgen_start === "function") {
  exp.__wbindgen_start();
}

// 利用側に必要な class / 関数を re-export(.d.ts は元 package のものを継承)
export const {
  Tokenizer,
  loadDictionaryFromBytes,
  load_dictionary_from_bytes,
  Dictionary,
  Token,
  Mode,
  Metadata,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} = bg as any;

// 型の便宜:元パッケージから type だけ再 export
export type {
  Tokenizer as TokenizerType,
  Dictionary as DictionaryType,
  Token as TokenType,
} from "lindera-wasm-bundler";
