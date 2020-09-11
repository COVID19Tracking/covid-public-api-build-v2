const write = require('../write')
const { DateTime } = require('luxon')
const endpointFields = require('../endpoint-fields')
const itemValue = require('../item-value')
const { percentPopulation, sevenDayAverage } = require('../calculated-fields')

module.exports = (db) => {
  const population = db.getCollection('population')

  const mapFields = (data) =>
    data.map((item, index) => {
      const statePopulation = population
        .chain()
        .find({ state: item.state })
        .data({ removeMeta: true })
        .pop().population
      return {
        state_code: item.state,
        date: DateTime.fromISO(item.date).setZone('UTC').toISO(),
        cases: {
          cumulative: {
            value: itemValue(item.positive),
            calculated: {
              population_percent: percentPopulation(
                statePopulation,
                item.positive
              ),
            },
          },
        },
        hospitalization: {
          hospitalized: {
            currently: {
              value: itemValue(item.hospitalizedCurrently),
              calculated: {
                seven_day_average: sevenDayAverage(
                  data,
                  index,
                  'hospitalizedCurrently'
                ),
              },
            },
            cumulative: {
              value: itemValue(item.hospitalizedCumulative),
            },
          },
          in_icu: {
            currently: {
              value: itemValue(item.inIcuCurrently),
            },
            cumulative: {
              value: itemValue(item.inIcuCumulative),
            },
          },
          on_ventilator: {
            currently: {
              value: itemValue(item.onVentilatorCurrently),
            },
            cumulative: {
              value: itemValue(item.onVentilatorCumulative),
            },
          },
        },
        outcomes: {
          recovered: {
            value: itemValue(item.recovered),
          },
          death: {
            cumulative: {
              value: itemValue(item.death),
            },
            confirmed: {
              value: itemValue(item.deathConfirmed),
            },
            probable: {
              value: itemValue(item.deathProbable),
            },
          },
        },
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
          [
            'state_code',
            'date',
            'hospitalization.hospitalized.cumulative',
            'hospitalization.hospitalized.currently',
            'hospitalization.in_icu.cumulative',
            'hospitalization.in_icu.currently',
            'hospitalization.on_ventilator.currently',
            'hospitalization.on_ventilator.cumulative',
            'outcomes.death.cumulative',
            'outcomes.death.confirmed',
            'outcomes.death.probable',
          ]
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
