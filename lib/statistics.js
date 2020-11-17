const getStatistics = (data, stat) =>
    [...data.values()].map(inner => inner.map(d => d[stat])).flat();

const getCountyStatistics = (data, county, stat) =>
    [...data.get(+county).values()].map(day => day.map(d => d[stat])).flat();

const getCrossCountryStatistics = (data, stat) =>
    [...data.values()]
        .map(county => [...county.values()])
        .map(data => data.map(month => month.map(day => day[stat])))
        .flat(4);

export { getStatistics, getCountyStatistics, getCrossCountryStatistics };
