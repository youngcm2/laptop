import {readFile} from 'fs/promises'
import {join} from "path";

export class Shell {
    async collect(): Promise<ShellConfig>{
        const filePath = join(process.env.HOME || '', '.zshrc');
        const contents = await readFile(filePath);
        return {
            shell: 'zsh',
            contents: contents.toString('base64')
        }
    }
}
