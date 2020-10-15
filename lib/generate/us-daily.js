const write = require('../write')
const { DateTime } = require('luxon')
const database = require('../database')
const endpointFields = require('../endpoint-fields')
const itemValue = require('../item-value')

const percentPopulation = (number) => {
  const { population } = database
    .getCollection('population')
    .chain()
    .find({ state: '_national' })
    .data({ removeMeta: true })
    .pop()
  if (typeof number === 'undefined' || !number) {
    return null
  }
  return Math.round((number / population) * 10000) / 10000
}

const increasePriorDay = (date, field) => {
  const currentValue = database
    .getCollection('us-daily')
    .chain()
    .find({ date: { $lte: date } })
    .compoundsort([['date', true]])
    .limit(2)
    .data()
  if (currentValue[0] && currentValue[1]) {
    return currentValue[0][field] - currentValue[1][field]
  }
  return null
}

const sevenDayAverage = (date, field, isCumulative) => {
  const dates = database
    .getCollection('us-daily')
    .chain()
    .find({ date: { $lte: date } })
    .compoundsort([['date', true]])
    .limit(9)
    .data()
  if (dates.length < 9) {
    return null
  }
  let total = 0
  dates.forEach((item, index) => {
    if (index > 7) {
      return
    }
    if (isCumulative) {
      total += item[field] - dates[index + 1][field]
      return
    }
    total += item[field]
  })
  return Math.round((total / 7) * 100) / 100
}

const sevenDayIncrease = (item, field) => {
  const { date } = item
  const sevenDaysAgo = database
    .getCollection('us-daily')
    .chain()
    .find({
      date: { $eq: DateTime.fromISO(date).minus({ days: 7 }).toISODate() },
    })
    .limit(1)
    .data()
  if (!sevenDaysAgo.length) {
    return null
  }
  return (
    Math.round(
      ((item[field] - sevenDaysAgo[0][field]) / sevenDaysAgo[0][field]) *
        100 *
        10
    ) / 10
  )
}

const computeField = (
  item,
  field,
  { increaseField = false, isCumulative = true, excluded = [] } = {}
) => {
  const { date } = item
  const result = {}
  if (excluded.indexOf('population_percent') === -1) {
    result.population_percent = percentPopulation(item[field])
  }
  if (excluded.indexOf('change_from_prior_day') === -1) {
    result.change_from_prior_day = increaseField
      ? item[increaseField]
      : increasePriorDay(date, field)
  }
  if (excluded.indexOf('seven_day_average') === -1) {
    result.seven_day_average = sevenDayAverage(date, field, isCumulative)
  }
  if (excluded.indexOf('seven_day_change_percent') === -1) {
    result.seven_day_change_percent = sevenDayIncrease(item, field)
  }
  return result
}

module.exports = () => {
  const mapFields = (data, simplified = false) =>
    data.map((item) => {
      const value = (field, increaseField = false) =>
        simplified
          ? itemValue(item[field])
          : {
              value: itemValue(item[field]),
              calculated: computeField(item, field, { increaseField }),
            }
      return {
        states: item.states,
        date: DateTime.fromISO(item.date).setZone('UTC').toISODate(),
        cases: {
          total: value('positive'),
          confirmed: value('positiveConfirmed'),
          probable: value('probableCases'),
        },
        tests: {
          pcr: {
            total: value('totalTestResults'),
            pending: value('pending'),
            encounters: {
              total: value('totalTestEncountersViral'),
            },
            specimens: {
              total: value('totalTestsViral'),
              positive: value('positiveTestsViral'),
              negative: value('negativeTestsViral'),
            },
            people: {
              total: value('totalTestsPeopleViral'),
              positive: value('positive'),
              negative: value('negative'),
            },
          },
          antibody: {
            encounters: {
              total: value('totalTestsAntibody'),
              positive: value('positiveTestsAntibody'),
              negative: value('negativeTestsAntibody'),
            },
            people: {
              total: value('totalTestsPeopleAntibody'),
              positive: value('positiveTestsPeopleAntibody'),
              negative: value('negativeTestsPeopleAntibody'),
            },
          },
          antigen: {
            encounters: {
              total: value('totalTestsAntigen'),
              positive: value('positiveTestsAntigen'),
              negative: value('negativeTestsAntigen'),
            },
            people: {
              total: value('totalTestsPeopleAntigen'),
              positive: value('positiveTestsPeopleAntigen'),
              negative: value('negativeTestsPeopleAntigen'),
            },
          },
        },
        outcomes: {
          recovered: value('recovered'),
          hospitalized: {
            total: value('hospitalizedCumulative'),
            currently: value('hospitalizedCurrently'),
            in_icu: {
              total: value('inIcuCumulative'),
              currently: value('inIcuCurrently'),
            },
            on_ventilator: {
              total: value('onVentilatorCumulative'),
              currently: value('onVentilatorCurrently'),
            },
          },
          death: {
            total: value('death'),
            confirmed: value('deathConfirmed'),
            probable: value('deathProbable'),
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

    const allDays = database
      .getCollection('us-daily')
      .chain()
      .compoundsort([['date', true]])
      .data({ removeMeta: true })

    const schema = {
      meta: {
        ...defaultMeta,
        field_definitions: endpointFields(['us-daily'], ['states', 'date']),
      },
    }

    const simplifiedSchema = {
      meta: {
        ...defaultMeta,
      },
    }

    const tasks = [
      write('us', 'daily', {
        links: {
          self: 'https://api.covidtracking.com/v2/us/daily',
        },
        ...schema,
        data: mapFields(allDays),
      }),
      write('us/daily', 'simple', {
        links: {
          self: 'https://api.covidtracking.com/v2/us/daily/simple',
        },
        ...simplifiedSchema,
        data: mapFields(allDays, true),
      }),
    ]
    allDays.forEach((day) => {
      const formattedDate = DateTime.fromISO(day.date).toISODate()
      tasks.push(
        write(`us`, formattedDate, {
          links: {
            self: `https://api.covidtracking.com/v2/us/${formattedDate}`,
          },
          ...schema,
          data: mapFields([day]).pop(),
        })
      )

      tasks.push(
        write(`us/${formattedDate}`, 'simple', {
          links: {
            self: `https://api.covidtracking.com/v2/us/${formattedDate}/simple`,
          },
          ...simplifiedSchema,
          data: mapFields([day], true).pop(),
        })
      )
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
