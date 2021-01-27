const sass = require('sass')
const postcss = require('postcss')
const autoprefixer = require('autoprefixer')
const postcssLogical = require('postcss-logical')
const postcssDirPseudoClass = require('postcss-dir-pseudo-class')
const cssnano = require('cssnano')
// const safeImportant = require('postcss-safe-important')
const chalk = require('chalk')
const { promisify } = require('util')
const fs = require('fs')
const path = require('path')
const resolve = require('resolve')
const mkdirp = promisify(require('mkdirp'))
const glob = promisify(require('glob'))

const renderScss = promisify(sass.render)
const writeFile = promisify(fs.writeFile)

const cwd = process.cwd()

function handleErr (err) {
  console.error(chalk.red('✗ Error:'), chalk.red(err.message))
}

async function compileCSS () {
  const files = await glob('packages/{,@uppy/}*/src/style.scss')
  for (const file of files) {
    const importedFiles = new Set()
    const scssResult = await renderScss({
      file,
      importer (url, from, done) {
        resolve(url, {
          basedir: path.dirname(from),
          filename: from,
          extensions: ['.scss']
        }, (err, res) => {
          if (err) return done(err)

          res = fs.realpathSync(res)

          if (importedFiles.has(res)) return done({ contents: '' })
          importedFiles.add(res)

          done({ file: res })
        })
      }
    })

    const plugins = [
      autoprefixer,
      postcssLogical(),
      postcssDirPseudoClass()
    ]
    const postcssResult = await postcss(plugins)
      .process(scssResult.css, { from: file })
    postcssResult.warnings().forEach(function (warn) {
      console.warn(warn.toString())
    })

    const outdir = path.join(path.dirname(file), '../dist')
    // Save the `uppy` package's CSS as `uppy.css`,
    // `@uppy/robodog` as `robodog.css`,
    // the rest as `style.css`.
    // const outfile = path.join(outdir, outdir.includes(path.normalize('packages/uppy/')) ? 'uppy.css' : 'style.css')
    let outfile = path.join(outdir, 'style.css')
    if (outdir.includes(path.normalize('packages/uppy/'))) {
      outfile = path.join(outdir, 'uppy.css')
    } else if (outdir.includes(path.normalize('packages/@uppy/robodog/'))) {
      outfile = path.join(outdir, 'robodog.css')
    }
    await mkdirp(outdir)
    await writeFile(outfile, postcssResult.css)
    console.info(
      chalk.green('✓ Built Uppy CSS:'),
      chalk.magenta(path.relative(cwd, outfile))
    )

    const minifiedResult = await postcss([
      cssnano({ safe: true })
    ]).process(postcssResult.css, { from: outfile })
    minifiedResult.warnings().forEach(function (warn) {
      console.warn(warn.toString())
    })
    await writeFile(outfile.replace(/\.css$/, '.min.css'), minifiedResult.css)
    console.info(
      chalk.green('✓ Minified Bundle CSS:'),
      chalk.magenta(path.relative(cwd, outfile).replace(/\.css$/, '.min.css'))
    )
  }
}

compileCSS().then(() => {
  console.info(chalk.yellow('✓ CSS Bundles 🎉'))
}, handleErr)
