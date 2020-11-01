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

var colors_per_class = Math.floor(Math.sqrt(colors.length));

createLegend = () => {
  const legend = d3.select("#chart").append("svg");
  const side_length = 24;
  const group = legend
    .append("g")
    .attr(
      "transform",
      `translate(20, 20)rotate(-45 ${(side_length * colors_per_class) / 2},${
        (side_length * colors_per_class) / 2
      })`
    );
  const marker = group
    .append("marker")
    .attr("id", "arrow")
    .attr("markerHeight", "10")
    .attr("markerWidth", "10")
    .attr("refX", "6")
    .attr("refY", "3")
    .attr("orient", "auto");

  marker.append("path").attr("d", "M0,0L9,3L0,6Z");

  group
    .selectAll("rect")
    .data(d3.cross(d3.range(3), d3.range(3)))
    .enter()
    .append("rect")
    .attr("width", `${side_length}`)
    .attr("height", `${side_length}`)
    .attr("x", (d) => `${d[0] * side_length}`)
    .attr("y", (d) => `${(colors_per_class - 1 - d[1]) * side_length}`)
    .attr("fill", (d) => `${colors[d[1] * colors_per_class + d[0]]}`);

  group
    .append("line")
    .attr("x1", "0")
    .attr("x2", `${colors_per_class * side_length}`)
    .attr("y1", `${colors_per_class * side_length}`)
    .attr("y2", `${colors_per_class * side_length}`)
    .attr("marker-end", "url(#arrow)")
    .attr("stroke", "black")
    .attr("stroke-width", "1.5");

  group
    .append("line")
    .attr("y2", "0")
    .attr("y1", `${colors_per_class * side_length}`)
    .attr("marker-end", "url(#arrow)")
    .attr("stroke", "black")
    .attr("stroke-width", "1.5");

  // group
  //   .append("text")
  //   .attr("font-weight", "bold")
  //   .attr("dy", "0.71em")
  //   .attr("transform", `translate(${(n / 2) * k},6`)
  //   .attr("text-anchor", "middle")
  //   .text("Covid");

  // group
  //   .append("text")
  //   .attr("font-weight", "bold")
  //   .attr("dy", "0.71em")
  //   .attr("transform", `translate(${(n / 2) * k},${n * k + 6}`)
  //   .attr("text-anchor", "middle")
  //   .text("Housing");

  legend.attr("transform", "translate(860,120)");
};

const dateRange = d3.utcDays(new Date(2020, 0), new Date(2020, 9));

var sliderTime = d3
  .sliderBottom()
  .min(d3.min(dateRange))
  .max(d3.max(dateRange))
  .step(1000 * 60 * 60 * 24)
  .width(500)
  .tickFormat(d3.timeFormat("%m-%d"))
  .default(new Date(2020, 0).getTime())
  .on("onchange", (val) => {
    update(val.getTime());
  });

var gTime = d3
  .select("#slider-time")
  .append("svg")
  .attr("width", 600)
  .attr("height", 100)
  .append("g")
  .attr("transform", "translate(80,30)");

gTime.call(sliderTime);

const generateToolTip = (d, states) => {
  let day = d3.utcDay(sliderTime.value()).getTime();
  let county = d.properties.name;
  let state = states.get(d.id.slice(0, 2)).name;
  let covid_per_population = d.properties.vals.get(day)[0].normalized_covid;
  let covid_count = d.properties.vals.get(day)[0].total_confirmed;
  let housing = "$" + d.properties.vals.get(day)[0].Zhvi.toLocaleString();
  let percent_change = d.properties.vals.get(day)[0].percent_change;
  return `<p><strong>${county}, ${state}</strong></p>
  <table><tbody>
  <tr><td class='wide'>Covid:</td><td> ${(covid_per_population * 100).toFixed(3)}%</td></tr>
  <tr><td class='wide'># of Positive:</td><td> ${covid_count}</td></tr>
  <tr><td class='wide'>Median:</td><td> ${housing}</td></tr>
  <tr><td class='wide'>Percent Change:</td><td> ${(
    percent_change * 100
  ).toFixed(3)}%</td></tr>
  </tbody></table>`;
};

createLegend();

var parseDate = d3.timeParse("%Y-%m-%d");

const promises = [d3.json("counties-albers-10m.json"), d3.csv("joined.csv")];

Promise.all(promises).then(ready);

function ready([us, covid]) {
  covid.forEach((d) => {
    d.population = +d.population;
    d.total_confirmed = +d.total_confirmed;
    d.Zhvi = +d.Zhvi;
    d.county_fips = +d.county_fips;
  });

  const counties = topojson.feature(us, us.objects.counties);
  const covid_by_county = d3.group(
    covid,
    (d) => d.county_fips,
    (d) => d3.utcDay(parseDate(d.date_x)).getTime()
  );
  const states = new Map(
    us.objects.states.geometries.map((d) => [d.id, d.properties])
  );

  counties.features.forEach(function (county) {
    let county_of_interest = covid_by_county.get(+county.id);
    county.properties.vals = county_of_interest;
    let january_1st_epoch = d3.utcDay(new Date(2020, 0)).getTime();
    let price_at_year_start = county_of_interest.get(january_1st_epoch)[0].Zhvi;

    const full_timeline_data = [...county.properties.vals.values()];

    for (let [day, data] of county.properties.vals) {
      for (d of data) {
        d.normalized_covid = d.total_confirmed / d.population;
        if (price_at_year_start) {
          d.percent_change = (price_at_year_start - d.Zhvi) / d.Zhvi;
        } else {
          d.percent_change = 0;
        }
      }
    }
  });

  covid_county_vals = [...covid_by_county.values()];
  const flattened_covid = covid_county_vals
    .map((county) => [...county.values()])
    .map((data) =>
      data.map((month) => month.map((day) => day.normalized_covid))
    )
    .flat(4);
  const flattened_housing = covid_county_vals
    .map((county) => [...county.values()])
    .map((data) => data.map((month) => month.map((day) => day.percent_change)))
    .flat(4);

  const x = d3.scaleQuantile(flattened_covid, d3.range(colors_per_class));
  const y = d3.scaleQuantile(flattened_housing, d3.range(-1 * colors_per_class + 1, 1));

  const path = d3.geoPath();

  const tip = d3
    .tip()
    .attr("class", "d3-tip")
    .html((EVENT, d) => generateToolTip(d, states));

  const color = (value, date) => {
    if (!value || !value.get(date) || !value.get(date)[0].Zhvi) return "#ccc";
    let day_of_interest = value.get(date)[0];
    let percent_change_in_housing = day_of_interest.percent_change;
    let confirmed_covid_cases = day_of_interest.normalized_covid;
    return colors[Math.abs(y(percent_change_in_housing)) + x(confirmed_covid_cases) * 3];
  };

  update = (date) => {
    countyShapes.style("fill", (d) => {
      return color(d.properties.vals, date);
    });
  };

  svg.call(tip);

  const countyShapes = svg
    .selectAll(".county")
    .data(counties.features)
    .enter()
    .append("path")
    .attr("class", "county")
    .attr("d", path)
    .on("mouseover", tip.show)
    .on("mouseout", tip.hide);

  svg
    .append("path")
    .datum(topojson.mesh(us, us.objects.states, (a, b) => a !== b))
    .attr("fill", "none")
    .attr("stroke", "white")
    .attr("stroke-linejoin", "round")
    .attr("d", path);

  update(d3.utcDay(new Date(2020, 0)).getTime());
}
