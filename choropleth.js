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

var dataTime = d3.range(0, 10).map((d) => new Date(2000 + d, 10, 3));
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
  .step(1000 * 60 * 60 * 24 * 365)
  .width(300)
  .tickFormat(d3.timeFormat("%Y"))
  .tickValues(dataTime)
  .default(new Date(2005, 10, 3))
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

var sliderRange = d3
  .sliderBottom()
  .width(300)
  .ticks(10)
  .step(1)
  .default([0, 1])
  .fill("#2196f3")
  .on("onchange", (val) => ahh(val));

var gRange = d3
  .select("#slider-range")
  .append("svg")
  .attr("width", 500)
  .attr("height", 100)
  .append("g")
  .attr("transform", "translate(200,30)");

gRange.call(sliderRange);

const generateToolTip = (d, states) => {
  return `<p><strong> ${d.properties.name}, ${
    states.get(d.id.slice(0, 2)).name
  } </strong></p>
  <table><tbody>
  <tr><td class='wide'>Diabetes:</td><td> ${d.properties.vals[0]}% </td></tr>
  <tr><td class='wide'>Obesity:</td><td> ${d.properties.vals[1]}% </td></tr>
  </tbody></table>`;
};

const promises = [
  d3.json("counties-albers-10m.json"),
  d3.csv("cdc-diabetes-obesity.csv"),
];

Promise.all(promises).then(ready);

function ready([us, cdc_data]) {
  const health_by_county = new Map(
    cdc_data.map((d) => [d.county, [+d.diabetes, +d.obesity]])
  );
  const states = new Map(
    us.objects.states.geometries.map((d) => [d.id, d.properties])
  );

  const counties = topojson.feature(us, us.objects.counties);

  counties.features.forEach(function (county) {
    county.properties.vals = health_by_county.get(county.id);
  });
  const n = Math.floor(Math.sqrt(colors.length));

  const x = d3.scaleQuantile(
    Array.from(health_by_county.values(), (d) => d[0]),
    d3.range(n)
  );
  const y = d3.scaleQuantile(
    Array.from(health_by_county.values(), (d) => d[1]),
    d3.range(n)
  );

  const tip = d3
    .tip()
    .attr("class", "d3-tip")
    .html((EVENT, d) => generateToolTip(d, states));

  sliderRange.min(d3.min(Array.from(health_by_county.values(), (d) => d[1]))).max(d3.max(Array.from(health_by_county.values(), (d) => d[1])));
  const path = d3.geoPath();

  const color = (value) => {
    if (!value) return "#ccc";
    let [diabetes, obesity] = value;
    return colors[y(obesity) + x(diabetes) * 3];
  };

  update = (year) => {
    countyShapes.style("fill", color([year, year]));
  };

  ahh = range => {
  let [left, right] = range
  d3.selectAll('.county').attr('fill', filler)
}

filler = (data, value) => {
    console.log(data, value)
    return "red"
}

  svg.call(tip);

  const countyShapes = svg
    .selectAll(".county")
    .data(counties.features)
    .enter()
    .append("path")
    .attr("fill", (d) => color(health_by_county.get(d.id)))
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
}
