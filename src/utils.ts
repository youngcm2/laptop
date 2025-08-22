import { resolve, join } from 'path';

export function resolveHome(filepath: string): string {
    if (filepath.startsWith('~')) {
        return join(process.env.HOME || '', filepath.slice(1));
    }
    return resolve(filepath);
}
