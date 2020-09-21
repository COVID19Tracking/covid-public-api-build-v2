const write = require('../write')
const { DateTime } = require('luxon')
const database = require('../database')
const endpointFields = require('../endpoint-fields')
const itemValue = require('../item-value')

const percentPopulation = (state, number) => {
  const { population } = database
    .getCollection('population')
    .chain()
    .find({ state: state })
    .data({ removeMeta: true })
    .pop()
  if (typeof number === 'undefined' || !number) {
    return null
  }
  return Math.round((number / population) * 10000) / 10000
}

const increasePriorDay = (date, state, field) => {
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

const sevenDayAverage = (date, state, field, isCumulative) => {
  const dates = database
    .getCollection('us-daily')
    .chain()
    .find({
      state: { $eq: state },
      date: { $lte: date },
    })
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
  const { date, state } = item
  const sevenDaysAgo = database
    .getCollection('states-daily')
    .chain()
    .find({
      state: { $eq: state },
      date: { $eq: DateTime.fromISO(date).minus({ days: 7 }).toISODate() },
    })
    .limit(1)
    .data()
  if (!sevenDaysAgo.length) {
    return null
  }
  return (
    Math.round(
      ((item[field] - sevenDaysAgo[0][field]) / sevenDaysAgo[0][field]) * 1000
    ) / 1000
  )
}

const computeField = (
  item,
  field,
  { increaseField = false, isCumulative = true, excluded = [] } = {}
) => {
  const { date, state } = item
  const result = {}
  if (excluded.indexOf('population_percent') === -1) {
    result.population_percent = percentPopulation(state, item[field])
  }
  if (excluded.indexOf('change_from_prior_day') === -1) {
    result.change_from_prior_day = increaseField
      ? item[increaseField]
      : increasePriorDay(date, state, field)
  }
  if (excluded.indexOf('seven_day_average') === -1) {
    result.seven_day_average = sevenDayAverage(date, state, field, isCumulative)
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
        date: DateTime.fromISO(item.date).setZone('UTC').toISODate(),
        state: item.state,
        meta: {
          data_quality_grade: item.dataQualityGrade,
          updated: DateTime.fromISO(item.dateModified).toISO(),
          tests: {
            total_source: item.totalTestResultsSource,
          },
        },
        cases: {
          ...value('positive'),
          pcr: value('positiveCasesViral'),
        },
        tests: {
          total: value('totalTestResults'),

          negative: value('negative'),
          pending: value('pending'),
          pcr: {
            total: {
              ...value('totalTestsViral'),
              people: value('totalTestsPeopleViral'),
            },
            positive: value('positiveTestsViral'),
            negative: value('negativeTestsViral'),
            encounters: value('totalTestEncountersViral'),
          },
          antibody: {
            total: {
              ...value('totalTestsAntibody'),
              people: value('totalTestsPeopleAntibody'),
            },
            positive: {
              ...value('positiveTestsAntibody'),
              people: value('positiveTestsPeopleAntibody'),
            },
            negative: {
              ...value('negativeTestsAntibody'),
              people: value('negativeTestsPeopleAntibody'),
            },
          },
          antigen: {
            total: {
              ...value('totalTestsAntigen'),
              people: value('totalTestsPeopleAntigen'),
            },
            positive: {
              ...value('positiveTestsAntigen'),
              people: value('positiveTestsPeopleAntigen'),
            },
          },
        },
        hospitalized: {
          ...value('hospitalizedCumulative', 'hospitalizedCurrently'),
          in_icu: value('inIcuCumulative', 'inIcuCurrently'),
          on_ventilator: value(
            'onVentilatorCumulative',
            'onVentilatorCurrently'
          ),
        },
        outcomes: {
          recovered: value('recovered'),
          death: {
            ...value('death'),
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

    const states = database
      .getCollection('states')
      .chain()
      .data({ removeMeta: true })

    const allStates = database
      .getCollection('states-daily')
      .chain()
      .compoundsort([['date', true], 'state'])
      .data({ removeMeta: true })

    const schema = {
      meta: {
        ...defaultMeta,
        field_definitions: endpointFields(['states-daily'], ['date']),
      },
    }

    const simplifiedSchema = {
      meta: {
        ...defaultMeta,
      },
    }

    const tasks = [
      write('states', 'daily', {
        links: {
          self: 'https://api.covidtracking.com/states/daily',
        },
        ...schema,
        data: mapFields(allStates),
      }),
      write('states/daily', 'simple', {
        links: {
          self: 'https://api.covidtracking.com/v2/states/daily/simple',
        },
        ...simplifiedSchema,
        data: mapFields(allStates, true),
      }),
    ]

    states.forEach(({ state }) => {
      const currentState = allStates.filter((item) => item.state === state)
      write(`states/${state.toLowerCase()}`, 'daily', {
        links: {
          self: `https://api.covidtracking.com/states/${state.toLowerCase()}/daily`,
        },
        ...schema,
        data: mapFields(currentState),
      })
      write(`states/${state.toLowerCase()}`, 'simple', {
        links: {
          self: `https://api.covidtracking.com/v2/states/${state.toLowerCase()}daily/simple`,
        },
        ...simplifiedSchema,
        data: mapFields(currentState, true),
      })
      const current = [currentState.shift()]
      write(`states/${state.toLowerCase()}`, 'current', {
        links: {
          self: `https://api.covidtracking.com/v2/states/${state.toLowerCase()}`,
        },
        ...simplifiedSchema,
        data: mapFields(current).pop(),
      })
      write(`states/${state.toLowerCase()}/current`, 'simple', {
        links: {
          self: `https://api.covidtracking.com/v2/states/${state.toLowerCase()}/current`,
        },
        ...simplifiedSchema,
        data: mapFields(current, true).pop(),
      })
      currentState.forEach((day) => {
        const formattedDate = DateTime.fromISO(day.date).toISODate()

        write(`states/${state.toLowerCase()}`, formattedDate, {
          links: {
            self: `https://api.covidtracking.com/states/${state.toLowerCase()}/${formattedDate}`,
          },
          ...schema,
          data: mapFields([day]).pop(),
        })
        write(`states/${state.toLowerCase()}/${formattedDate}`, 'simple', {
          links: {
            self: `https://api.covidtracking.com/v2/states/${state.toLowerCase()}daily/simple`,
          },
          ...simplifiedSchema,
          data: mapFields([day], true).pop(),
        })
      })
    })

    Promise.all(tasks)
      .then(() => {
        console.log(`📝 Saved states daily endpoints`)
        resolve()
      })
      .catch(() => {
        reject()
      })
  })
}
