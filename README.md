Field mappings

Calculated objects

- `change_from_prior_day` - The number from the prior day subtracted from the current day
- `population_percent` - Percent of the state or national population
- `seven_day_average` - Average (mean) of the number over the prior seven days, including the current day. Set to `null` if there is no data
- `seven_day_change_percent` - Percent change since seven days ago

## States daily

date - `date` - This is now in ISO Date format of YYYY-MM-DD
state - `state`
positive - `cases`
negative - `tests.negative`
pending - `tests.pending`
totalTestResults - `tests.total`
hospitalizedCumulative - `hospitalized`
hospitalizedCurrently - `hospitalized.calculated.change_from_prior_day`
inIcuCumulative - `hospitalized.in_icu`
inIcuCurrently - `hospitalized.in_icu.calculated.change_from_prior_day`
onVentilatorCumulative - `hospitalized.on_ventilator`
onVentilatorCurrently - `hospitalized.on_ventilator.calculated.change_from_prior_day`
recovered - `outcomes.recovered`
dataQualityGrade - `meta.data_quality_grade`
lastUpdateEt - `meta.update`
dateModified - `meta.updated`
checkTimeEt - `meta.updated`
death - `outcomes.death`
hospitalized - `hospitalized`
dateChecked - `date`
totalTestsViral - `tests.pcr.total`
positiveTestsViral - `tests.pcr.positive`
negativeTestsViral - `tests.pcr.negative`
positiveCasesViral - `cases.pcr`
deathConfirmed - `outcomes.death.confirmed`
deathProbable - `outcomes.death.probable`
totalTestEncountersViral - `tests.pcr.encounters`
totalTestsPeopleViral - `tests.pcr.total.people`
totalTestsAntibody - `tests.antibody.total`
positiveTestsAntibody - `tests.antibody.positive`
negativeTestsAntibody - `tests.andibody.negative`
totalTestsPeopleAntibody - `tests.antibody.total.people`
positiveTestsPeopleAntibody - `tests.antibody.positive.people`
negativeTestsPeopleAntibody - `tests.antibody.negative.people`
totalTestsPeopleAntigen - `tests.antigen.total.people`
positiveTestsPeopleAntigen - `tests.antigen.positive.people`
totalTestsAntigen - `tests.antigen.total`
positiveTestsAntigen - `tests.antigen.positive`
fips - **not migrated**
positiveIncrease - `cases.calculated.change_from_prior_day`
negativeIncrease - `tests.negative.calculated.change_from_prior_day`
total - **not migrated**
totalTestResultsSource - `meta.tests.total_source`
totalTestResultsIncrease - `tests.total.calculated.change_from_prior_day`
posNeg - **not migrated**
deathIncrease - `outcomes.deaths.calculated.change_from_prior_day`
hospitalizedIncrease - `hospitalized.calculated.change_from_prior_day`
hash - **not migrated**
commercialScore - **not migrated**
negativeRegularScore - **not migrated**
negativeScore - **not migrated**
positiveScore - **not migrated**
score - **not migrated**
grade - **not migrated**

## US Daily

`date` - `date` - This is now in ISO Date format of YYYY-MM-DD
dateChecked - **not migrated**
death - `outcomes.death`
deathConfirmed - `outcomes.death.confirmed`
deathProbable - `outcomes.death.probable`
hospitalizedCumulative - `hospitalized`
hospitalizedCurrently - `hospitalized.calculated.change_from_prior_day`
inIcuCumulative - `hospitalized.in_icu`
inIcuCurrently - `hospitalized.in_icu.calculated.change_from_prior_day`
negative - `tests.negative`
negativeTestsAntibody - `tests.antibody.negative`
negativeTestsAntigen - `tests.antigen.negative`
negativeTestsPeopleAntibody - `tests.antibody.negative.people`
negativeTestsPeopleAntigen - `tests.antigen.negative.people`
negativeTestsViral - `tests.pcr.negative`
onVentilatorCumulative - `hospitalized.on_ventilator`
onVentilatorCurrently - `hospitalized.on_ventilator.calculated.change_from_prior_day`
pending - `tests.pending`
positive - `cases`
positiveCasesViral - `cases.pcr`
positiveConfirmed - `cases.confirmed`
positiveTestsAntibody - `tests.antibody.positive`
positiveTestsAntigen - `tests.antigen.positive`
positiveTestsPeopleAntibody - `tests.antibody.positive.people`
positiveTestsPeopleAntigen - `tests.antigen.positive.people`
positiveTestsViral - `tests.pcr.positive`
probableCases - `cases.probable`
recovered - `outcomes.recovered`
states - `states`
totalTestEncountersViral - `tests.pcr.encounters`
totalTestsAntibody - `tests.antibody.total`
totalTestsAntigen - `tests.antigen.total`
totalTestsPeopleAntibody - `tests.antibody.total.people`
totalTestsPeopleAntigen - `tests.antigen.total.people`
totalTestsPeopleViral - `tests.pcr.total.people`
totalTestsViral - `tests.pcr.total`
