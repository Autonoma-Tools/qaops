#!/usr/bin/env node
"use strict";

/**
 * Validates gating-policy override records.
 *
 * Usage:
 *   node scripts/validate-override.js <directory>
 *
 * Reads every .yml / .yaml file in <directory> and enforces the two rules that
 * keep an override a record instead of a bypass with a timestamp:
 *
 *   1. All five required fields are present and non-empty.
 *   2. expires_on parses as a date and is not already in the past.
 *
 * Exits 0 if every record passes, 1 if any record fails.
 */

const fs = require("node:fs");
const path = require("node:path");
const yaml = require("js-yaml");

const REQUIRED_FIELDS = [
  "check",
  "requested_by",
  "reason",
  "follow_up_issue",
  "expires_on",
];

function usage() {
  return "Usage: node scripts/validate-override.js <directory>";
}

/** Returns the .yml/.yaml files in dir, sorted, so output is deterministic. */
function listRecordFiles(dir) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /\.ya?ml$/i.test(entry.name))
    .map((entry) => path.join(dir, entry.name))
    .sort();
}

/** True when a field is absent, null, or an empty/whitespace-only string. */
function isBlank(value) {
  if (value === undefined || value === null) return true;
  if (typeof value === "string") return value.trim() === "";
  return false;
}

/**
 * js-yaml resolves a bare `2026-12-31` to a Date via the core timestamp type,
 * but a quoted date arrives as a string, so both shapes are handled here.
 * Returns a Date, or null when the value is not a usable date.
 */
function parseExpiry(value) {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return null;

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** Midnight-UTC epoch for a date, so comparison is day-granular. */
function toUtcDay(date) {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function formatDay(date) {
  return date.toISOString().slice(0, 10);
}

/** Returns an array of human-readable failure strings. Empty means valid. */
function validateRecord(record, today) {
  if (record === null || record === undefined) {
    return ["file is empty; expected one override record"];
  }
  if (typeof record !== "object" || Array.isArray(record)) {
    return ["expected a single YAML mapping of override fields"];
  }

  const failures = [];

  for (const field of REQUIRED_FIELDS) {
    if (isBlank(record[field])) {
      failures.push(`missing required field: ${field}`);
    }
  }

  if (!isBlank(record.expires_on)) {
    const expiry = parseExpiry(record.expires_on);
    if (expiry === null) {
      failures.push(
        `expires_on is not a parseable date: ${JSON.stringify(record.expires_on)}`
      );
    } else if (toUtcDay(expiry) < today) {
      failures.push(
        `expires_on is in the past: ${formatDay(expiry)} (today is ${formatDay(new Date(today))})`
      );
    }
  }

  return failures;
}

function main(argv) {
  const dir = argv[0];

  if (!dir || argv.length > 1) {
    console.error(usage());
    return 1;
  }

  let stats;
  try {
    stats = fs.statSync(dir);
  } catch (error) {
    console.error(`Cannot read ${dir}: ${error.message}`);
    return 1;
  }
  if (!stats.isDirectory()) {
    console.error(`Not a directory: ${dir}`);
    console.error(usage());
    return 1;
  }

  const files = listRecordFiles(dir);
  if (files.length === 0) {
    console.log(`No override records found in ${dir}. Nothing to validate.`);
    return 0;
  }

  const today = toUtcDay(new Date());
  let failed = 0;

  for (const file of files) {
    let record;
    try {
      record = yaml.load(fs.readFileSync(file, "utf8"));
    } catch (error) {
      failed += 1;
      console.log(`FAIL ${file}`);
      console.log(`  - YAML did not parse: ${error.message.split("\n")[0]}`);
      continue;
    }

    const failures = validateRecord(record, today);
    if (failures.length === 0) {
      console.log(`PASS ${file}`);
    } else {
      failed += 1;
      console.log(`FAIL ${file}`);
      for (const failure of failures) {
        console.log(`  - ${failure}`);
      }
    }
  }

  console.log("");
  console.log(
    `${files.length - failed} of ${files.length} override record(s) passed.`
  );

  if (failed > 0) {
    console.log(
      "An override missing a field, or past its expiry, is a bypass rather than a record."
    );
    return 1;
  }
  return 0;
}

process.exit(main(process.argv.slice(2)));
