const write = require('../write')
const { DateTime } = require('luxon')
const database = require('../database')
const endpointFields = require('../endpoint-fields')
const itemValue = require('../item-value')
const {
  percentPopulation,
  sevenDayAverage,
  increaseUS,
} = require('../calculated-fields')

module.exports = () => {
  const population = database.getCollection('population')

  const mapFields = (data) =>
    data.map((item, index) => {
      const nationalPopulation = population
        .chain()
        .find({ state: '_national' })
        .data({ removeMeta: true })
        .pop().population
      return {
        states: item.states,
        date: DateTime.fromISO(item.date).setZone('UTC').toISO(),
        cases: {
          cumulative: {
            value: itemValue(item.positive),
            calculated: {
              population_percent: percentPopulation(
                statePopulation,
                item.positive
              ),
              increase: increaseUS(item, 'positive'),
            },
          },
        },
        tests: {
          total: {
            value: itemValue(item.totalTestResults),
          },
        },
      }
    })

  return new Promise((resolve, reject) => {
    const defaultMeta = database
      .getCollection('status')
      .chain()
      .data({ removeMeta: true })
      .pop()

    const stateCodes = []

    const days = mapFields(
      database
        .getCollection('us-daily')
        .chain()
        .compoundsort([['date', true]])
        .data({ removeMeta: true })
    )

    const schema = {
      links: {
        self: 'https://api.covidtracking.com/v2/us/daily',
      },
      meta: {
        ...defaultMeta,
        field_definitions: endpointFields(['us-daily'], ['states', 'date']),
      },
    }

    const simplifiedSchema = {
      links: {
        self: 'https://api.covidtracking.com/v2/us/daily/simple',
      },
      meta: {
        ...defaultMeta,
      },
    }

    const simplifyDataElement = (element) => {
      if (typeof element !== 'object') {
        return element
      }
      Object.keys(element).forEach((key) => {
        if (!element[key]) {
          return
        }
        if (typeof element[key].value !== 'undefined') {
          element[key] = element[key].value
          return
        }
        if (typeof element[key] === 'object') {
          simplifyDataElement(element[key])
        }
      })
      return element
    }

    const simplifyData = (items) =>
      items.map((item) => simplifyDataElement(item))

    const tasks = [write('us', 'daily', { ...schema, data: days })]
    days.forEach((day) => {
      const formattedDate = DateTime.fromISO(day.date).toISODate()
      write(`us`, formattedDate, {
        ...schema,
        links: {
          self: `https://api.covidtracking.com/v2/us/${formattedDate}`,
        },
        data: day,
      })
    })

    Promise.all(tasks)
      .then(() => {
        console.log(`📝 Saved US daily endpoints`)
        resolve()
      })
      .catch(() => {
        reject()
      })
  })
}
