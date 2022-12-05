#!/usr/bin/env zx
$.verbose = false;
const data = JSON.parse((await $`brew info --json=v2 --installed`).stdout);
fs.writeJson("brew.json", data);
const taps = new Set();

for (const { name, tap, desc, homepage } of data.formulae) {
  taps.add(tap);
}

for (const { token, tap, desc, homepage } of data.casks) {
  taps.add(tap);
}
