require('dotenv').config()
const loki = require('lokijs')
const { DateTime } = require('luxon')
const fs = require('fs-extra')
const commandLineArgs = require('command-line-args')
const sources = require('./lib/sources')
const generate = require('./lib/generate')
const package = require('./package.json')
const write = require('./lib/write')

const options = commandLineArgs([
  { name: 'cache', alias: 'c', type: Boolean },
  { name: 'loadCache', alias: 'l', type: Boolean },
])

const database = new loki('covidApi')
if (options.loadCache) {
  database.loadJSON(fs.readFileSync('./.cache/database.json'))
}
fs.ensureDirSync('./_api/v2')

const defaultMeta = {
  build_time: DateTime.local().setZone('UTC').toISO(),
  license: 'CC-BY-3.0',
  version: package.version,
}

database.addCollection('status').insert(defaultMeta)

write('status', defaultMeta)

sources(database, options.loadCache)
  .then(() => generate(database))
  .then(() => {
    console.log(
      database.getCollection('population').chain().find({ state: 'CA' })
    )
    if (options.cache) {
      fs.ensureDirSync('./.cache')
      fs.writeFileSync('./.cache/database.json', database.serialize())
    }
  })
