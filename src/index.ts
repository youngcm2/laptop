import yargs from 'yargs';
import {hideBin} from 'yargs/helpers';
import {Options} from "./options";
import {Brew} from "./collect-brew";
import {Shell} from "./collect-shell-config";
import fs from "fs-extra";
// import {resolveHome} from "./utils";

const parser = yargs(hideBin(process.argv))
    .command(
        'collect',
        'Collect setup data from laptop',
        async () => {
            console.log('Collecting data from laptop');
            const brew = new Brew();
            const shell = new Shell();
            const brewData = await brew.collect();
            const shellConfig = await shell.collect();
            const outputPath = 'laptop-setup.json';
            await fs.writeJson(outputPath, {brew: brewData, shell: shellConfig}, {spaces: 2});
        })
    .strict()
    .demandCommand()
    .fail(false)
    // .options({
    //     input: {
    //         alias: 'i',
    //         describe: 'the file path for the input file',
    //         demandOption: true,
    //         type: 'string',
    //         coerce: resolveHome
    //     }
    // })


async function main(args: Options) {
    // Add logic to process the input file and output to CSV

}

parser.parseAsync()
    .catch(async err => {
    console.info(`${err.message}\n ${await parser.getHelp()}`)
});
