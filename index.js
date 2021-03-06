require('dotenv').config()
const { DateTime } = require('luxon')
const fs = require('fs-extra')
const commandLineArgs = require('command-line-args')
const database = require('./lib/database')
const sources = require('./lib/sources')
const generate = require('./lib/generate')
const package = require('./package.json')
const write = require('./lib/write')

const options = commandLineArgs([
  { name: 'cache', alias: 'c', type: Boolean },
  { name: 'loadCache', alias: 'l', type: Boolean },
])

if (options.loadCache) {
  database.loadJSON(fs.readFileSync('./.cache/database.json'))
}
fs.ensureDirSync('./_api/v2')

const defaultMeta = {
  build_time: DateTime.local().setZone('UTC').toISO(),
  license: 'CC-BY-4.0',
  version: package.version,
}

const status = database.addCollection('status')
status.insert(defaultMeta)

sources(options.loadCache)
  .then(() =>
    write(null, 'status', status.chain().data({ removeMeta: true }).pop())
  )
  .then(() => generate())
  .then(() => {
    if (options.cache) {
      fs.ensureDirSync('./.cache')
      fs.writeFileSync('./.cache/database.json', database.serialize())
    }
  })
