const write = require('../write')
const { DateTime } = require('luxon')
const endpointFields = require('../endpoint-fields')

module.exports = (db) => {
  const population = db.getCollection('population')

  const mapFields = (data) =>
    data.map((item) => {
      return {
        state_code: item.state,
        date: DateTime.fromISO(item.date).setZone('UTC').toISO(),
      }
    })

  return new Promise((resolve, reject) => {
    const defaultMeta = db
      .getCollection('status')
      .chain()
      .data({ removeMeta: true })
      .pop()

    const stateCodes = []

    const states = mapFields(
      db
        .getCollection('states-daily')
        .chain()
        .compoundsort([['date', true], 'state'])
        .data({ removeMeta: true })
    )

    states.forEach((item) => {
      if (stateCodes.indexOf(item.state_code.toLowerCase()) === -1) {
        stateCodes.push(item.state_code.toLowerCase())
      }
    })

    const schema = {
      links: {
        self: 'https://api.covidtracking.com/v2/states/daily',
      },
      meta: {
        ...defaultMeta,
        field_definitions: endpointFields(
          db,
          ['states-daily', 'states'],
          ['state_code', 'date']
        ),
      },
    }

    const tasks = [write('states', 'daily', { ...schema, data: states })]
    stateCodes.forEach((stateCode) => {
      const stateData = states.filter(
        (state) => state.state_code.toLowerCase() === stateCode
      )
      tasks.push(
        write(`states/${stateCode}`, 'daily', {
          ...schema,
          links: {
            self: `https://api.covidtracking.com/v2/states/${stateCode}daily`,
          },
          data: stateData,
        })
      )
      stateData.forEach((item) => {
        const formattedDate = DateTime.fromISO(item.date)
        write(`states/${stateCode}`, formattedDate.toFormat('yyyy-mm-dd'), {
          ...schema,
          links: {
            self: `https://api.covidtracking.com/v2/states/${stateCode}/${formattedDate.toFormat(
              'yyyy-mm-dd'
            )}`,
          },
          data: item,
        })
      })
    })

    Promise.all(tasks)
      .then(() => {
        resolve()
      })
      .catch(() => {
        reject()
      })
  })
}
