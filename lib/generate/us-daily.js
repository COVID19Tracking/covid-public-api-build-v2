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
      ((item[field] - sevenDaysAgo[0][field]) / sevenDaysAgo[0][field]) * 1000
    ) / 1000
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

const defaultField = (item, field, increaseField = false) => ({
  value: itemValue(item[field]),
  calculated: computeField(item, field, { increaseField }),
})

module.exports = () => {
  const mapFields = (data) =>
    data.map((item) => {
      return {
        states: item.states,
        date: DateTime.fromISO(item.date).setZone('UTC').toISODate(),
        cases: {
          ...defaultField(item, 'positive'),
          probable: defaultField(item, 'probableCases'),
          confirmed: defaultField(item, 'positiveConfirmed'),
          pcr: defaultField(item, 'positiveCasesViral'),
        },
        tests: {
          total: defaultField(item, 'totalTestResults'),
          negative: defaultField(item, 'negative'),
          pending: defaultField(item, 'pending'),
          pcr: {
            total: {
              ...defaultField(item, 'totalTestsViral'),
              people: defaultField(item, 'totalTestsPeopleViral'),
            },
            negative: defaultField(item, 'negativeTestsViral'),
            positive: defaultField(item, 'positiveTestsViral'),
            encounters: defaultField(item, 'totalTestEncountersViral'),
          },
          antibody: {
            total: {
              ...defaultField(item, 'totalTestsAntibody'),
              people: defaultField(item, 'totalTestsPeopleAntibody'),
            },
            negative: {
              ...defaultField(item, 'negativeTestsAntibody'),
              people: defaultField(item, 'negativeTestsPeopleAntibody'),
            },
            positive: {
              ...defaultField(item, 'positiveTestsAntibody'),
              people: defaultField(item, 'positiveTestsAntibodyPeople'),
            },
          },
          antigen: {
            total: {
              ...defaultField(item, 'totalTestsAntigen'),
              people: defaultField(item, 'totalTestsPeopleAntigen'),
            },
            negative: {
              ...defaultField(item, 'negativeTestsAntigen'),
              people: defaultField(item, 'negativeTestsPeopleAntigen'),
            },
            positive: {
              ...defaultField(item, 'positiveTestsAntigen'),
              people: defaultField(item, 'positiveTestsPeopleAntigen'),
            },
          },
          hospitalized: {
            ...defaultField(
              item,
              'hospitalizedCumulative',
              'hospitalizedCurrently'
            ),
            in_icu: defaultField(item, 'inIcuCumulative', 'inIcuCurrently'),
            on_ventilator: defaultField(
              item,
              'onVentilatorCumulative',
              'onVentilatorCurrently'
            ),
          },
        },
        outcomes: {
          recovered: defaultField(item, 'recovered'),
          death: {
            ...defaultField(item, 'death'),
            confirmed: defaultField(item, 'deathConfirmed'),
            probable: defaultField(item, 'deathProbable'),
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
