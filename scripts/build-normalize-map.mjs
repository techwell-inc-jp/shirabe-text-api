#!/usr/bin/env node
/**
 * SudachiDict CSV から /normalize Phase 3 用 lookup map を生成する。
 *
 * Input:
 *   --input <path>  : SudachiDict raw CSV(small_lex.csv / core_lex.csv 等)
 *   --output <path> : 出力 JSON map(default: scripts/data/normalize-map.json)
 *   --min-len <n>   : この長さ以上の surface のみ採用(default: 1)
 *
 * SudachiDict CSV 19 列(0-indexed):
 *   0  surface (TRIE)
 *   1-3 left_context_id, right_context_id, cost
 *   4  surface (display)
 *   5-10 POS 1-6
 *   11 reading (full-width katakana)
 *   12 normalized_form  ← what we extract
 *   13 dictionary_form_id
 *   14 split_type (A/B/C)
 *   15-17 A/B/C-unit splits
 *   18 (unused / wordtype id)
 *
 * Filter:
 *   - surface !== normalized_form(変更ありエントリのみ)
 *   - conjugation_form (col 10) ∈ {"*", "終止形-一般"}(活用形 drift 排除、行なう→行う を保ち つき→尽きる を排除)
 *
 * Output: { "<surface>": "<normalized_form>", ... }
 *   - surface 重複時は最初に現れたエントリを採用(SudachiDict は活用優先順で並ぶため最初が一般的)
 *
 * SudachiDict License: Apache-2.0(WorksApplications/SudachiDict)。
 * 出力 JSON は派生物として attribution を含む形で配信する(Workers attribution.notes に明示)。
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { argv } from "node:process";

function parseArgs() {
  const args = { input: null, output: null, minLen: 1 };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--input") args.input = argv[++i];
    else if (a === "--output") args.output = argv[++i];
    else if (a === "--min-len") args.minLen = Number(argv[++i]);
    else if (a === "--help" || a === "-h") {
      console.log(`Usage: node build-normalize-map.mjs --input <csv> [--output <json>] [--min-len <n>]`);
      process.exit(0);
    } else {
      console.error(`Unknown arg: ${a}`);
      process.exit(1);
    }
  }
  if (!args.input) {
    console.error("--input is required (SudachiDict raw CSV path)");
    process.exit(1);
  }
  if (!args.output) {
    args.output = resolve("scripts/data/normalize-map.json");
  }
  return args;
}

/** SudachiDict CSV 1 行を field 配列にパース。引用符内 comma を尊重しないシンプル版(SudachiDict は無引用フォーマット)。 */
function parseLine(line) {
  return line.split(",");
}

function main() {
  const { input, output, minLen } = parseArgs();
  console.log(`Reading: ${input}`);
  const csv = readFileSync(input, "utf-8");
  const lines = csv.split(/\r?\n/);
  console.log(`Total lines: ${lines.length}`);

  const map = Object.create(null);
  let kept = 0;
  let skippedDup = 0;
  let skippedSame = 0;
  let skippedConj = 0;
  let skippedShort = 0;
  let skippedShape = 0;

  for (const line of lines) {
    if (!line) continue;
    const cols = parseLine(line);
    if (cols.length < 13) continue;

    const surface = cols[0];
    const conjugationForm = cols[10];
    const normalized = cols[12];

    if (surface === normalized) { skippedSame++; continue; }
    if (surface.length < minLen) { skippedShort++; continue; }
    if (conjugationForm !== "*" && conjugationForm !== "終止形-一般") {
      skippedConj++;
      continue;
    }
    // 1 文字 ASCII 等 surface を排除(数字 1 文字 → 漢字数字、副作用大)
    if (surface.length === 1 && /^[\x00-\x7F]$/.test(surface)) {
      skippedShape++;
      continue;
    }
    if (surface in map) { skippedDup++; continue; }
    map[surface] = normalized;
    kept++;
  }

  console.log(`Kept: ${kept}`);
  console.log(`Skipped same: ${skippedSame}`);
  console.log(`Skipped conjugation drift: ${skippedConj}`);
  console.log(`Skipped duplicates: ${skippedDup}`);
  console.log(`Skipped short: ${skippedShort}`);
  console.log(`Skipped 1-char ASCII: ${skippedShape}`);

  mkdirSync(dirname(output), { recursive: true });
  const json = JSON.stringify(map);
  writeFileSync(output, json);
  console.log(`Wrote: ${output} (${(json.length / 1024 / 1024).toFixed(2)} MB)`);
}

main();
