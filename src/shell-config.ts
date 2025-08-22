export interface ConfigFile {
    path: string;
    contents: string;
    exists: boolean;
}

export interface ShellConfig {
    shell: string;
    configs: ConfigFile[];
}
