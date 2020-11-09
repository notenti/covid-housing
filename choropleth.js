import { timeSeriesChart } from './time_series.js';
import { getStatistics, getCountyStatistics, getCrossCountryStatistics } from './statistics.js';

const choropleth_margin = { right: 50, top: 10, left: 50, bottom: 10 },
    choropleth_width = 1200 - choropleth_margin.right - choropleth_margin.left,
    choropleth_height = 700 - choropleth_margin.top - choropleth_margin.bottom;

const date_range = d3.utcDays(new Date(2020, 0), new Date(2020, 9));
const january_1st_epoch = d3.utcDay(new Date(2020, 0)).getTime();
var updateCountyColor;
var updateCovidLine;

const choropleth_svg = d3
    .select('#chart')
    .append('svg')
    .attr('width', choropleth_width + choropleth_margin.right + choropleth_margin.left)
    .attr('height', choropleth_height + choropleth_margin.top + choropleth_margin.bottom)
    .append('g')
    .attr('transform', `translate(${choropleth_margin.left}, ${choropleth_margin.top})`);

const choropleth_tooltip = d3
    .select('body')
    .append('div')
    .attr('class', 'tooltip')
    .style('opacity', 0);

const bivariate_colors = [
    '#e8e8e8',
    '#ace4e4',
    '#5ac8c8',
    '#dfb0d6',
    '#a5add3',
    '#5698b9',
    '#be64ac',
    '#8c62aa',
    '#3b4994',
];

const colors_per_class = Math.floor(Math.sqrt(bivariate_colors.length));

const createLegend = () => {
    const legend = d3.select('#legend').append('svg').attr('width', 120).attr('height', 120);
    const side_length = 24;
    const group = legend
        .append('g')
        .attr(
            'transform',
            `translate(20, 20)rotate(-45 ${(side_length * colors_per_class) / 2},${
                (side_length * colors_per_class) / 2
            })`
        );
    const marker = group
        .append('marker')
        .attr('id', 'arrow')
        .attr('markerHeight', '10')
        .attr('markerWidth', '10')
        .attr('refX', '6')
        .attr('refY', '3')
        .attr('orient', 'auto');

    marker.append('path').attr('d', 'M0,0L9,3L0,6Z');

    group
        .selectAll('rect')
        .data(d3.cross(d3.range(3), d3.range(3)))
        .enter()
        .append('rect')
        .attr('width', `${side_length}`)
        .attr('height', `${side_length}`)
        .attr('x', d => `${d[0] * side_length}`)
        .attr('y', d => `${(colors_per_class - 1 - d[1]) * side_length}`)
        .attr('fill', d => `${bivariate_colors[d[1] * colors_per_class + d[0]]}`);

    group
        .append('line')
        .attr('x1', '0')
        .attr('x2', `${colors_per_class * side_length}`)
        .attr('y1', `${colors_per_class * side_length}`)
        .attr('y2', `${colors_per_class * side_length}`)
        .attr('marker-end', 'url(#arrow)')
        .attr('stroke', 'black')
        .attr('stroke-width', '1.5');

    group
        .append('line')
        .attr('y2', '0')
        .attr('y1', `${colors_per_class * side_length}`)
        .attr('marker-end', 'url(#arrow)')
        .attr('stroke', 'black')
        .attr('stroke-width', '1.5');

    group
        .append('text')
        .attr('font-weight', 'bold')
        .attr('dy', '0.71em')
        .attr('transform', `rotate(90) translate(${(colors_per_class / 2) * side_length},6)`)
        .attr('text-anchor', 'middle')
        .text('Covid');

    group
        .append('text')
        .attr('font-weight', 'bold')
        .attr('dy', '0.71em')
        .attr(
            'transform',
            `translate(${(colors_per_class / 2) * side_length},${
                colors_per_class * side_length + 6
            })`
        )
        .attr('text-anchor', 'middle')
        .text('Housing');

    legend.attr('transform', 'translate(900,-330)');
};

const slider_time = d3
    .sliderBottom()
    .min(d3.min(date_range))
    .max(d3.max(date_range))
    .step(1000 * 60 * 60 * 24)
    .width(800)
    .tickFormat(d3.timeFormat('%m-%d'))
    .default(new Date(2020, 0).getTime())
    .on('onchange', val => {
        let epoch_time = val.getTime();
        updateCountyColor(epoch_time);
        updateCovidLine(epoch_time, null);
    });

const g_time = d3
    .select('#slider')
    .attr('align', 'center')
    .append('svg')
    .attr('width', 860)
    .attr('height', 100)
    .attr('stroke-width', '1px')
    .append('g')
    .attr('transform', 'translate(30,30)');

g_time.call(slider_time);

const generateToolTip = (d, states) => {
    let day = d3.utcDay(slider_time.value()).getTime();
    let county = d.properties.name;
    let state = states.get(d.id.slice(0, 2)).name;
    let covid_per_population = d.properties.vals.get(day)[0].normalized_covid;
    let covid_count = d.properties.vals.get(day)[0].total_confirmed;
    let housing = '$' + d.properties.vals.get(day)[0].Zhvi.toLocaleString();
    let percent_change = d.properties.vals.get(day)[0].percent_change;
    return `<p><strong>${county}, ${state}</strong></p>
  <table><tbody>
  <tr><td class='wide'>% of population with COVID-19:</td><td> ${(covid_per_population * 100).toFixed(3)}%</td></tr>
  <tr><td class='wide'>Confirmed COVID-19 cases:</td><td> ${covid_count}</td></tr>
  <tr><td class='wide'>Median housing cost:</td><td> ${housing}</td></tr>
  <tr><td class='wide'>% change in housing cost:</td><td> ${(percent_change * 100).toFixed(3)}%</td></tr>
  </tbody></table>`;
};

const x_choropleth_scale = d3.scaleQuantile().range(d3.range(colors_per_class));
const y_choropleth_scale = d3.scaleQuantile().range(d3.range(-1 * colors_per_class + 1, 1));

const path = d3.geoPath();

const parse_date = d3.timeParse('%Y-%m-%d');
const promises = [d3.json('counties-albers-10m.json'), d3.csv('joined.csv')];

const color = (value, date) => {
    if (!value || !value.get(date) || !value.get(date)[0].Zhvi) return '#ccc';
    let day_of_interest = value.get(date)[0];
    let percent_change_in_housing = day_of_interest.percent_change;
    let confirmed_covid_cases = day_of_interest.normalized_covid;
    return bivariate_colors[
        Math.abs(y_choropleth_scale(percent_change_in_housing)) +
            x_choropleth_scale(confirmed_covid_cases) * 3
    ];
};
const atlanta = {
    id: '13121',
    properties: {
        name: 'Fulton',
    },
};

createLegend();

var housing_chart = timeSeriesChart();
var covid_chart = timeSeriesChart();
d3.select('#housing').call(housing_chart);
d3.select('#covid').call(covid_chart);

Promise.all(promises).then(ready);
function ready([us, covid]) {
    covid.forEach(d => {
        d.population = +d.population;
        d.total_confirmed = +d.total_confirmed;
        d.Zhvi = +d.Zhvi;
        d.county_fips = +d.county_fips;
    });

    const counties = topojson.feature(us, us.objects.counties);
    const states = new Map(us.objects.states.geometries.map(d => [d.id, d.properties]));

    const covid_by_county = d3.group(
        covid,
        d => d.county_fips,
        d => d3.utcDay(parse_date(d.date)).getTime()
    );

    counties.features.forEach(function (county) {
        let county_of_interest = covid_by_county.get(+county.id);
        county.properties.vals = county_of_interest;

        let price_at_year_start = county_of_interest.get(january_1st_epoch)[0].Zhvi;

        for (let [day, data] of county.properties.vals) {
            for (let d of data) {
                d.normalized_covid = d.total_confirmed / d.population;
                if (price_at_year_start) {
                    d.percent_change = (d.Zhvi - price_at_year_start) / price_at_year_start;
                } else {
                    d.percent_change = 0;
                }
            }
        }
    });

    const flattened_covid = getCrossCountryStatistics(covid_by_county, 'normalized_covid');
    const flattened_housing = getCrossCountryStatistics(covid_by_county, 'percent_change');

    x_choropleth_scale.domain(flattened_covid);
    y_choropleth_scale.domain(flattened_housing);

    const tip = d3
        .tip()
        .attr('class', 'd3-tip')
        .html((EVENT, d) => generateToolTip(d, states));

    const county_shapes = choropleth_svg
        .selectAll('.county')
        .data(counties.features)
        .enter()
        .append('path')
        .attr('class', 'county')
        .attr('d', path)
        .on('mouseover', tip.show)
        .on('mouseout', tip.hide)
        .on('click', (EVENT, d) => updateCovidLine(slider_time.value().getTime(), d));

    choropleth_svg
        .append('path')
        .datum(topojson.mesh(us, us.objects.states, (a, b) => a !== b))
        .attr('fill', 'none')
        .attr('stroke', 'white')
        .attr('stroke-width', '1px')
        .attr('stroke-linejoin', 'round')
        .attr('d', path);

    choropleth_svg.call(tip);

    updateCountyColor = epoch => {
        county_shapes.style('fill', d => {
            return color(d.properties.vals, epoch);
        });
    };

    updateCovidLine = (date, d) => {
        var name = d ? d.properties.name : housing_chart.label().county;
        var id = d ? d.id : housing_chart.fips();

        const state = states.get(id.slice(0, 2)).name;
        const county = name;
        const full_date_data = getCountyStatistics(covid_by_county, id, 'total_confirmed');
        const house_date_data = getCountyStatistics(covid_by_county, id, 'Zhvi');
        const data = full_date_data.map((d, i) => [date_range[i], d]);
        const data2 = house_date_data.map((d, i) => [date_range[i], d]).filter(d => d[1] > 0);

        covid_chart.data(data, date);
        covid_chart.label(county, state);
        covid_chart.fips(id);

        housing_chart.data(data2, date);
        housing_chart.label(county, state);
        housing_chart.fips(id);
    };

    updateCountyColor(january_1st_epoch);
    updateCovidLine(january_1st_epoch, atlanta);
}
