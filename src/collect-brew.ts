import {$} from "execa";
import {BrewItem} from "./brew-item";

export interface BrewData {
    formulae: BrewItem[];
    casks: BrewItem[];
    taps: string[];
}

export class Brew {

    async collect(): Promise<BrewData> {
        const {stdout: json} = await $`brew info --json=v2 --installed`
        const data = JSON.parse(json || '{}');
        const formulae: BrewItem[] = [];
        const casks: BrewItem[] = [];
        const taps = new Set<string>();

        // Process formulae
        if (data.formulae) {
            for (const formula of data.formulae) {
                const tap = formula.tap || 'homebrew/core';
                formulae.push({
                    tap: tap,
                    token: formula.name,
                    name: formula.name,
                    desc: formula.desc || '',
                    homepage: formula.homepage || ''
                });
                if (tap !== 'homebrew/core') {
                    taps.add(tap);
                }
            }
        }

        // Process casks
        if (data.casks) {
            for (const cask of data.casks) {
                const tap = cask.tap || 'homebrew/cask';
                casks.push({
                    tap: tap,
                    token: cask.token,
                    name: Array.isArray(cask.name) ? cask.name[0] : cask.name || cask.token,
                    desc: cask.desc || '',
                    homepage: cask.homepage || ''
                });
                if (tap !== 'homebrew/cask') {
                    taps.add(tap);
                }
            }
        }

        // Get all taps
        try {
            const {stdout: tapsOutput} = await $`brew tap`;
            const allTaps = tapsOutput.trim().split('\n').filter(Boolean);
            allTaps.forEach(tap => taps.add(tap));
        } catch (error) {
            console.warn('Failed to get brew taps:', error);
        }

        return {
            formulae: formulae.filter(f => f.tap !== "homebrew/core"),
            casks,
            taps: Array.from(taps)
        };
    }

    async install(item: BrewItem) {
        await $`brew install ${item.token}`;
    }

    async createScript(items: BrewItem[]) {
        
        const script = items.map(item => `brew install ${item.token}`).join('\n');
        return script;
    }
}

