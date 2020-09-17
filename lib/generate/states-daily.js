const write = require('../write')
const { DateTime } = require('luxon')
const database = require('../database')
const endpointFields = require('../endpoint-fields')
const itemValue = require('../item-value')
const {
  percentPopulation,
  sevenDayAverage,
  increase,
} = require('../calculated-fields')

module.exports = () => {
  const population = database.getCollection('population')

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
        last_updated_time: DateTime.fromISO(item.lastUpdateTIme).toISO(),
        cases: {
          cumulative: {
            value: itemValue(item.positive),
            calculated: {
              population_percent: percentPopulation(
                statePopulation,
                item.positive
              ),
              increase: increase(item, 'positive'),
            },
          },
        },
        testing: {
          legacy: {
            negative: {
              value: item.negative,
              computed: {
                increase: increase(item, 'negative'),
              },
            },
            pending: {
              value: item.pending,
              computed: {
                increase: increase(item, 'pending'),
              },
            },
          },
          viral_pcr: {
            positive: {
              cases: {
                value: item.positiveCasesViral,
                computed: {
                  increase: increase(item, 'positiveCasesViral'),
                },
              },
              tests: {
                value: item.positiveTestsViral,
                computed: {
                  increase: increase(item, 'positiveTestsViral'),
                },
              },
            },
            negative: {
              value: item.negativeTestsViral,
              computed: {
                increase: increase(item, 'negativeTestsViral'),
              },
            },
          },
          antibody: {
            positive: {
              tests: {
                value: item.positiveTestsAntibody,
                computed: {
                  increase: increase(item, 'positiveTestsAntibody'),
                },
              },
              people: {
                value: item.positiveTestsPeopleAntibody,
                computed: {
                  increase: increase(item, 'positiveTestsPeopleAntibody'),
                },
              },
            },
            negative: {
              samples: {
                value: item.negativeTestsAntibody,
                computed: {
                  increase: increase(item, 'negativeTestsAntibody'),
                },
              },
              people: {
                value: item.negativeTestsPeopleAntibody,
                computed: {
                  increase: increase(item, 'negativeTestsPeopleAntibody'),
                },
              },
            },
          },
          antigen: {
            positive: {
              tests: {
                value: item.positiveTestsAntigen,
                computed: {
                  increase: increase(item, 'positiveTestsAntigen'),
                },
              },
              people: {
                value: item.positiveTestsPeopleAntigen,
                computed: {
                  increase: increase(item, 'positiveTestsPeopleAntigen'),
                },
              },
            },
          },
        },
        hospitalization: {
          hospitalized: {
            currently: {
              value: itemValue(item.hospitalizedCurrently),
              calculated: {
                seven_day_average: sevenDayAverage(
                  item.state,
                  item.date,
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
    const defaultMeta = database
      .getCollection('status')
      .chain()
      .data({ removeMeta: true })
      .pop()

    const stateCodes = []

    const states = mapFields(
      database
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
          ['states-daily'],
          ['state_code', 'date']
        ),
      },
    }

    const simplifiedSchema = {
      links: {
        self: 'https://api.covidtracking.com/v2/states/daily/simple',
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

    const tasks = [
      write('states', 'daily', { ...schema, data: states }),
      write('states/daily', 'simple', {
        ...simplifiedSchema,
        data: simplifyData(states),
      }),
    ]
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
      tasks.push(
        write(`states/${stateCode}/simple`, 'daily', {
          ...simplifiedSchema,
          links: {
            self: `https://api.covidtracking.com/v2/states/${stateCode}daily/simple`,
          },
          data: simplifyData(stateData),
        })
      )
      stateData.forEach((item) => {
        const formattedDate = DateTime.fromISO(item.date)
        write(`states/${stateCode}`, formattedDate.toFormat('yyyy-LL-dd'), {
          ...schema,
          links: {
            self: `https://api.covidtracking.com/v2/states/${stateCode}/${formattedDate.toFormat(
              'yyyy-LL-dd'
            )}`,
          },
          data: item,
        })
        write(
          `states/${stateCode}/${formattedDate.toFormat('yyyy-LL-dd')}/simple`,
          'simple',
          {
            ...schema,
            links: {
              self: `https://api.covidtracking.com/v2/states/${stateCode}/${formattedDate.toFormat(
                'yyyy-LL-dd'
              )}/simple`,
            },
            data: simplifyData([item]).pop(),
          }
        )
      })
    })

    Promise.all(tasks)
      .then(() => {
        console.log(`📝 Saved state daily endpoints`)
        resolve()
      })
      .catch(() => {
        reject()
      })
  })
}
