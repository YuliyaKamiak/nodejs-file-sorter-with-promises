const path = require('path');
const yargs = require('yargs');
const fs = require('fs');
const Observer = require('./libs/observer')

const args = yargs
    .usage('Usage: node $0 [options]')
    .help('help')
    .alias('help', 'h')
    .alias('version', 'v')
    .example('node $0 index.js --entry ./path/ --dist ./path --delete')
    .option('entry', {
        alias: 'e',
        describe: 'Initial directory path',
        demandOption: true
    })
    .option('dist', {
        alias: 'd',
        describe: 'Result directory path',
        default: './dist'
    })
    .option('delete', {
        alias: 'D',
        describe: 'Remove initial directory or not',
        boolean: true,
        default: false
    })
    .epilog('My first console application')
    .argv

const config = {
    src: path.normalize(path.join(__dirname, args.entry)),
    dist: path.normalize(path.join(__dirname, args.dist)),
    delete: args.delete,
}

function readdir(src) {
    return new Promise((resolve, reject) => {
      fs.readdir(src, (err, files) => {
          if (err) reject(err)

          resolve(files)
      })
    })
}

function stats(currentPath) {
    return new Promise((resolve, reject) => {
        fs.stat(currentPath, (err, stats) => {
            if (err) reject(err)

            resolve(stats)
        })
    })
}

function copyFile(currentPath, newPath) {
    return new Promise((resolve, reject) => {
        fs.copyFile(currentPath, newPath, (err) => {
            if (err) reject(err)

            resolve()
        })
    })
}

function access(src) {
    return new Promise((resolve, reject) => {
        fs.access(src, fs.constants.F_OK,(err) => {
            if (err) resolve()

            reject()
        })
    })
}

function mkdir(src) {
    return new Promise((resolve, reject) => {
        fs.mkdir(src, (err) => {
            if (err) reject(err)

            resolve()
        })
    })
}

async function createDir(src) {
    await access(src).then(() => {
        mkdir(src)
    }).catch((err) => {
        if (err) throw new Error(err);
    })
}

function rm(src) {
    return new Promise((resolve, reject) => {
        fs.rm(src,{ recursive: true, force: true }, (err) => {
            if (err) reject(err)

            resolve()
        })
    })
}

(async function() {
    async function sorter(src) {
        const files  = await readdir(src)

        for (const file of files) {
            const currentPath = path.join(src, file)
            const stat = await stats(currentPath)
            if (stat.isDirectory()) {
                await sorter(currentPath)
            } else {
                await createDir(config.dist)
                const newFolderName = file.charAt(0).toLowerCase();
                const newPath = path.join(config.dist, newFolderName);
                await createDir(newPath)
                await copyFile(currentPath,  path.join(newPath, file))
            }
        }
    }

    try {
        await sorter(config.src)
        console.log('Done!')

        if (config.delete) {
            await rm(config.src)
            console.log('Source folder was deleted')
        }
    } catch (error) {
        console.log(error)
    }
})()
