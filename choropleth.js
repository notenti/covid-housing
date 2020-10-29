var w = 1200,
  h = 700;
var margin = { right: 150, top: 50, left: 150, bottom: 50 },
  width = w - margin.right - margin.left,
  height = h - margin.top - margin.bottom;

var svg = d3
  .select("#chart")
  .append("svg")
  .attr("width", w)
  .attr("height", h)
  .attr("id", "chart")
  .append("g")
  .attr("transform", `translate(${margin.left}, ${margin.top})`);

var tooltip = d3
  .select("body")
  .append("div")
  .attr("class", "tooltip")
  .style("opacity", 0);

var dataTime = d3.range(1, 11)

var colors = [
  "#e8e8e8",
  "#ace4e4",
  "#5ac8c8",
  "#dfb0d6",
  "#a5add3",
  "#5698b9",
  "#be64ac",
  "#8c62aa",
  "#3b4994",
];

var sliderTime = d3
  .sliderBottom()
  .min(d3.min(dataTime))
  .max(d3.max(dataTime))
  .step(1)
  .default(1)
  .width(300)
  .tickValues(dataTime)
  .default(1)
  .on("onchange", (val) => {
    update(val);
  });

var gTime = d3
  .select("#slider-time")
  .append("svg")
  .attr("width", 500)
  .attr("height", 100)
  .append("g")
  .attr("transform", "translate(30,30)");

gTime.call(sliderTime);

const generateToolTip = (d, states) => {
  let month = ('0' + sliderTime.value()).slice(-2)
  let county = d.properties.name
  let state = states.get(d.id.slice(0, 2)).name
  let covid = d.properties.vals.get(month)[0].total_confirmed || "0"
  let housing = "$" + d.properties.vals.get(month)[0].median_listing_price.toFixed(2) || "No Data"

  return `<p><strong>${county}, ${state}</strong></p>
  <table><tbody>
  <tr><td class='wide'>Covid:</td><td> ${covid}</td></tr>
  <tr><td class='wide'>Median:</td><td> ${housing}</td></tr>
  </tbody></table>`;
};

var parseDate = d3.timeParse("%Y-%m-%d")
var formatMonth = d3.timeFormat("%m")
const promises = [
  d3.json("counties-albers-10m.json"),
  d3.csv("joined.csv"),
];

Promise.all(promises).then(ready);

function ready([us, covid]) {

  covid.forEach(d => {
    d.population = +d.population
    d.total_confirmed = +d.total_confirmed
    d.median_listing_price = +d.median_listing_price
    d.county_fips = +d.county_fips
  })

  const counties = topojson.feature(us, us.objects.counties);
  const covid_by_county = d3.group(covid, d => d.county_fips, d => formatMonth(parseDate(d.date)))
  const states = new Map(us.objects.states.geometries.map(d => [d.id, d.properties]));
  let percents = []

  counties.features.forEach(function (county) {
    county.properties.vals = covid_by_county.get(+county.id);

    const full_timeline_data = [...county.properties.vals.values()]
    const median_listing_price_per_month = full_timeline_data.map(month => d3.max(month.map(day => day.median_listing_price))).filter(price => price > 0)
    const percent_change = (d3.max(median_listing_price_per_month) - d3.min(median_listing_price_per_month)) / d3.min(median_listing_price_per_month)
    county.properties.housing_change = percent_change || 0
    if (percent_change) {
      percents.push(percent_change)
    }
    for (let [month, data] of county.properties.vals) {
      for (d of data) {
        d.percent_change = percent_change
      }
    }
  });

  covid_county_vals = [...covid_by_county.values()]

  const flattened_covid = covid_county_vals.map(county => [...county.values()]).map(data => data.map(month => month.map(day => day.total_confirmed))).flat(3)
  const flattened_housing = covid_county_vals.map(county => [...county.values()]).map(data => data.map(month => month.map(day => day.percent_change))).flat(3)

  const n = Math.floor(Math.sqrt(colors.length));
  const x = d3.scaleQuantile(flattened_covid, d3.range(n))
  const y = d3.scaleQuantile(flattened_housing, d3.range(n))

  const path = d3.geoPath();

  const tip = d3
    .tip()
    .attr("class", "d3-tip")
    .html((EVENT, d) => generateToolTip(d, states));

  const color = (value, month) => {
    if (!value || !value.get(month) || !value.get(month)[2].percent_change) return "#ccc";
    let percent_change_in_housing = value.get(month)[2].percent_change
    let confirmed_covid_cases = value.get(month)[2].total_confirmed
    return colors[y(median_listing_price) + x(percent_change_in_housing) * 3];
  };

  update = month => {
    countyShapes.style("fill", d => {
      return color(d.properties.vals, ('0' + month).slice(-2))
    })
  };

  svg.call(tip);

  const countyShapes = svg.selectAll(".county")
    .data(counties.features)
    .enter()
    .append("path")
    .attr("class", "county")
    .attr("d", path)
    .on("mouseover", tip.show)
    .on("mouseout", tip.hide);

  svg.append("path")
    .datum(topojson.mesh(us, us.objects.states, (a, b) => a !== b))
    .attr("fill", "none")
    .attr("stroke", "white")
    .attr("stroke-linejoin", "round")
    .attr("d", path);

  update('01')
}
