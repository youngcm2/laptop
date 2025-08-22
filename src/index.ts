import yargs from 'yargs';
import {hideBin} from 'yargs/helpers';
import {Options} from "./options";
import {Brew} from "./collect-brew";
import {Shell} from "./collect-shell-config";
import {Applications} from "./collect-applications";
import {BrewInstaller} from "./install-brew";
import {ShellInstaller} from "./install-shell";
import {ApplicationsInstaller} from "./install-applications";
import fs from "fs-extra";
import archiver from 'archiver';
import path from 'path';
import os from 'os';
import {execa} from 'execa';
// import {resolveHome} from "./utils";

const parser = yargs(hideBin(process.argv))
    .command(
        'collect',
        'Collect setup data from laptop',
        (yargs) => {
            return yargs
                .option('output', {
                    alias: 'o',
                    describe: 'Output zip file path',
                    type: 'string',
                    default: 'laptop-setup.zip'
                });
        },
        async (argv) => {
            const outputZip = argv.output as string;
            console.log('Collecting data from laptop');
            console.log(`Output will be saved to: ${path.resolve(outputZip)}`);
            const brew = new Brew();
            const shell = new Shell();
            const applications = new Applications();
            const brewData = await brew.collect();
            const shellConfig = await shell.collect();
            const applicationsData = await applications.collect();

            // Create temporary directory for files
            const tempDir = path.join(process.cwd(), '.laptop-setup-temp');
            await fs.ensureDir(tempDir);

            try {
                // Write JSON data to temp directory
                const jsonPath = path.join(tempDir, 'laptop-setup.json');
                await fs.writeJson(jsonPath, {
                    brew: brewData,
                    shell: shellConfig,
                    applications: applicationsData
                }, {spaces: 2});

                // Create a zip file
                const output = fs.createWriteStream(outputZip);
                const archive = archiver('zip', {
                    zlib: { level: 9 } // Maximum compression
                });

                // Set up event handlers
                output.on('close', () => {
                    console.log(`Created ${path.resolve(outputZip)} (${archive.pointer()} bytes)`);
                });

                archive.on('error', (err) => {
                    throw err;
                });

                // Pipe archive data to the file
                archive.pipe(output);

                // Add the JSON file to the archive
                archive.file(jsonPath, { name: 'laptop-setup.json' });

                // Add shell config files if they exist
                if (shellConfig.configs && shellConfig.configs.length > 0) {
                    for (const config of shellConfig.configs) {
                        if (config.exists && config.contents) {
                            const fileName = path.basename(config.path);
                            const filePath = path.join(tempDir, fileName);
                            await fs.writeFile(filePath, config.contents);
                            archive.file(filePath, { name: `configs/${fileName}` });
                        }
                    }
                }

                // Add applications list as separate files for easier reading
                const appsListPath = path.join(tempDir, 'applications_list.txt');
                const appsList = applicationsData.allApplications
                    .map(app => `${app.name} (${app.version || 'N/A'}) - ${app.path}`)
                    .join('\n');
                await fs.writeFile(appsListPath, appsList);
                archive.file(appsListPath, { name: 'applications_list.txt' });

                const appStoreListPath = path.join(tempDir, 'appstore_apps.txt');
                const appStoreList = applicationsData.appStoreApps
                    .map(app => `${app.name} (${app.version || 'N/A'}) - ${app.bundleId}`)
                    .join('\n');
                await fs.writeFile(appStoreListPath, appStoreList);
                archive.file(appStoreListPath, { name: 'appstore_apps.txt' });

                // Finalize the archive
                await archive.finalize();

            } finally {
                // Clean up temp directory
                await fs.remove(tempDir);
            }
        })
    .command(
        'install <zipfile>',
        'Install configuration from a collected zip file',
        (yargs) => {
            return yargs
                .positional('zipfile', {
                    describe: 'Path to the laptop-setup.zip file',
                    type: 'string',
                    demandOption: true
                })
                .option('profile', {
                    describe: 'Install to user profile instead of system-wide (no admin required)',
                    type: 'boolean',
                    default: false
                })
                .option('brew-prefix', {
                    describe: 'Custom Homebrew installation prefix (e.g., ~/homebrew)',
                    type: 'string'
                });
        },
        async (argv) => {
            const zipPath = argv.zipfile as string;
            const useProfile = argv.profile as boolean;
            const brewPrefix = argv.brewPrefix as string | undefined;

            if (!await fs.pathExists(zipPath)) {
                console.error(`Error: File not found: ${zipPath}`);
                process.exit(1);
            }

            console.log(`Installing from: ${zipPath}`);
            if (useProfile) {
                console.log('🏠 Profile mode: Installing to user directory (no admin required)');
            }

            // Create temporary directory for extraction
            const tempDir = path.join(process.cwd(), '.laptop-install-temp');
            await fs.ensureDir(tempDir);

            try {
                // Extract zip file
                console.log('Extracting configuration...');
                await execa('unzip', ['-q', zipPath, '-d', tempDir]);

                // Read the main configuration
                const jsonPath = path.join(tempDir, 'laptop-setup.json');
                if (!await fs.pathExists(jsonPath)) {
                    throw new Error('laptop-setup.json not found in zip file');
                }

                const config = await fs.readJson(jsonPath);

                // Ask what to install
                console.log('\nAvailable installations:');
                console.log('1. Homebrew packages (formulae and casks)');
                console.log('2. Shell configurations (.zshrc, .bashrc, etc.)');
                console.log('3. Applications (App Store apps)');
                console.log('4. All of the above');
                console.log('');

                // For now, we'll install everything. In a real implementation,
                // you'd want to add interactive prompts
                console.log('Installing all components...\n');

                // Install Homebrew packages
                if (config.brew) {
                    const brewInstaller = new BrewInstaller();
                    await brewInstaller.install(config.brew, {
                        useProfile,
                        brewPrefix: brewPrefix || (useProfile ? path.join(os.homedir(), 'homebrew') : undefined)
                    });
                }

                // Install shell configurations
                if (config.shell) {
                    const shellInstaller = new ShellInstaller();
                    const configsDir = path.join(tempDir, 'configs');
                    await shellInstaller.install(config.shell, configsDir, { useProfile });
                }

                // Install applications
                if (config.applications) {
                    const appsInstaller = new ApplicationsInstaller();
                    await appsInstaller.install(config.applications, { useProfile });
                }

                console.log('\n✅ Installation complete!');
                console.log('\nNext steps:');
                console.log('1. Restart your terminal to load new shell configurations');
                console.log('2. Check application_install_report.txt for manual installations');
                console.log('3. Sign into the App Store if you haven\'t already');

                if (useProfile) {
                    console.log('\n📝 Profile Mode Notes:');
                    console.log(`- Homebrew installed to: ${brewPrefix || path.join(os.homedir(), 'homebrew')}`);
                    console.log('- Casks (GUI apps) were skipped - install manually');
                    console.log('- Shell configs updated with Homebrew paths');
                    console.log('- No admin/sudo access was required! 🎉');
                }

            } catch (error) {
                console.error('Installation failed:', error);
                process.exit(1);
            } finally {
                // Clean up temp directory
                await fs.remove(tempDir);
            }
        })
    .strict()
    .demandCommand()
    .fail(false)


async function main(args: Options) {
    // Add logic to process the input file and output to CSV

}

parser.parseAsync()
    .catch(async err => {
    console.info(`${err.message}\n ${await parser.getHelp()}`)
});
