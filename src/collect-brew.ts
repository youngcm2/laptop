import {$} from "execa";
import {BrewItem} from "./brew-item";

export class Brew {

    async collect(): Promise<BrewItem[]> {
        const {stdout: json} = await $`brew info --json=v2 --installed`
        const data = JSON.parse(json || '[]');
        const items = new Set<BrewItem>();

        for (const {name, tap, desc, homepage} of data.formulae) {
            items.add({tap, token: name, name, desc, homepage})
        }

        for (const {token, name, tap, desc, homepage} of data.casks) {
            items.add({tap, token, name: name[0], desc, homepage})
        }

        return Array.from(items);
    }

    async install(item: BrewItem) {
        await $`brew install ${item.token}`;
    }

    async createScript(items: BrewItem[]) {
        
        const script = items.map(item => `brew install ${item.token}`).join('\n');
        return script;
    }
}


